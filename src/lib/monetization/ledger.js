import admin from 'firebase-admin';
import {
  LEDGER_ENTRY_TYPES,
  DEFAULT_PROCESSOR_FEE_RATE,
  DEFAULT_PROCESSOR_FEE_FIXED_CENTS,
  DEFAULT_PLATFORM_FEE_RATE,
} from './constants';

const LEDGER_COLLECTION = 'financialLedger';

/**
 * Append an immutable ledger entry. Every write is append-only;
 * corrections use MANUAL_ADJUSTMENT entries, never edits.
 */
export async function appendLedgerEntry(db, {
  entryType,
  orderType,
  orderId,
  amountCents,
  currency = 'ZAR',
  processor = null,
  processorEventId = null,
  processorTransactionId = null,
  description = '',
  metadata = {},
}) {
  if (!Object.values(LEDGER_ENTRY_TYPES).includes(entryType)) {
    throw new Error(`Invalid ledger entry type: ${entryType}`);
  }

  const entry = {
    entryType,
    orderType: orderType || null,
    orderId: orderId || null,
    amountCents: Number(amountCents) || 0,
    currency,
    processor,
    processorEventId,
    processorTransactionId,
    description,
    metadata,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await db.collection(LEDGER_COLLECTION).add(entry);
  return { id: ref.id, ...entry };
}

/**
 * Record a successful charge along with its processor and platform fees.
 * Creates three ledger entries atomically via a batch write.
 */
export async function recordChargeWithFees(db, {
  orderType,
  orderId,
  grossAmountCents,
  currency = 'ZAR',
  processor = null,
  processorEventId = null,
  processorTransactionId = null,
  processorFeeRate = DEFAULT_PROCESSOR_FEE_RATE,
  processorFeeFixedCents = DEFAULT_PROCESSOR_FEE_FIXED_CENTS,
  platformFeeRate = DEFAULT_PLATFORM_FEE_RATE,
}) {
  const processorFeeCents = Math.round(grossAmountCents * processorFeeRate) + processorFeeFixedCents;
  const platformFeeCents = Math.round(grossAmountCents * platformFeeRate);

  const batch = db.batch();
  const col = db.collection(LEDGER_COLLECTION);

  const chargeRef = col.doc();
  batch.set(chargeRef, {
    entryType: LEDGER_ENTRY_TYPES.CHARGE_SUCCEEDED,
    orderType,
    orderId,
    amountCents: grossAmountCents,
    currency,
    processor,
    processorEventId,
    processorTransactionId,
    description: `Charge succeeded for ${orderType} order ${orderId}`.trim(),
    metadata: {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const feeRef = col.doc();
  batch.set(feeRef, {
    entryType: LEDGER_ENTRY_TYPES.PROCESSOR_FEE,
    orderType,
    orderId,
    amountCents: processorFeeCents,
    currency,
    processor,
    processorEventId,
    processorTransactionId,
    description: `Processor fee (${(processorFeeRate * 100).toFixed(1)}% + ${processorFeeFixedCents}c)`,
    metadata: { processorFeeRate, processorFeeFixedCents },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const platformRef = col.doc();
  batch.set(platformRef, {
    entryType: LEDGER_ENTRY_TYPES.PLATFORM_FEE,
    orderType,
    orderId,
    amountCents: platformFeeCents,
    currency,
    processor,
    processorEventId,
    processorTransactionId,
    description: `Platform fee (${(platformFeeRate * 100).toFixed(0)}%)`,
    metadata: { platformFeeRate },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    grossAmountCents,
    processorFeeCents,
    platformFeeCents,
    netRevenueCents: grossAmountCents - processorFeeCents,
    payoutLiabilityCents: grossAmountCents - processorFeeCents - platformFeeCents,
  };
}

/**
 * Query ledger for financial reporting.
 */
export async function queryLedger(db, {
  entryTypes = null,
  orderType = null,
  startDate = null,
  endDate = null,
  limitCount = 500,
} = {}) {
  let q = db.collection(LEDGER_COLLECTION).orderBy('createdAt', 'desc');

  if (entryTypes && entryTypes.length === 1) {
    q = q.where('entryType', '==', entryTypes[0]);
  }

  if (orderType) {
    q = q.where('orderType', '==', orderType);
  }

  if (startDate) {
    q = q.where('createdAt', '>=', startDate);
  }

  if (endDate) {
    q = q.where('createdAt', '<=', endDate);
  }

  q = q.limit(limitCount);

  const snap = await q.get();
  const entries = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Client-side filter if multiple entry types
  if (entryTypes && entryTypes.length > 1) {
    return entries.filter(e => entryTypes.includes(e.entryType));
  }

  return entries;
}

/**
 * Build a financial summary from ledger entries.
 */
export async function buildFinancialSummary(db, { startDate = null, endDate = null } = {}) {
  const entries = await queryLedger(db, { startDate, endDate, limitCount: 5000 });

  const summary = {
    grossRevenueCents: 0,
    refundsCents: 0,
    disputesCents: .0,
    processorFeesCents: 0,
    platformFeesCents: 0,
    netRevenueCents: 0,
    payoutsPaidCents: 0,
    payoutsScheduledCents: 0,
    unpaidPayoutLiabilityCents: 0,
    operatingSpendCents: 0,
    byOrderType: {},
    entryCount: entries.length,
  };

  for (const entry of entries) {
    const amt = entry.amountCents || 0;
    const type = entry.orderType || 'unknown';

    if (!summary.byOrderType[type]) {
      summary.byOrderType[type] = { grossCents: 0, refundsCents: 0, processorFeesCents: 0, platformFeesCents: 0, count: 0 };
    }

    switch (entry.entryType) {
      case LEDGER_ENTRY_TYPES.CHARGE_SUCCEEDED:
        summary.grossRevenueCents += amt;
        summary.byOrderType[type].grossCents += amt;
        summary.byOrderType[type].count += 1;
        break;
      case LEDGER_ENTRY_TYPES.REFUND_CREATED:
        summary.refundsCents += amt;
        summary.byOrderType[type].refundsCents += amt;
        break;
      case LEDGER_ENTRY_TYPES.DISPUTE_OPENED:
      case LEDGER_ENTRY_TYPES.DISPUTE_LOST:
        summary.disputesCents += amt;
        break;
      case LEDGER_ENTRY_TYPES.PROCESSOR_FEE:
        summary.processorFeesCents += amt;
        summary.byOrderType[type].processorFeesCents += amt;
        break;
      case LEDGER_ENTRY_TYPES.PLATFORM_FEE:
        summary.platformFeesCents += amt;
        summary.byOrderType[type].platformFeesCents += amt;
        break;
      case LEDGER_ENTRY_TYPES.PAYOUT_PAID:
        summary.payoutsPaidCents += amt;
        break;
      case LEDGER_ENTRY_TYPES.PAYOUT_SCHEDULED:
      case LEDGER_ENTRY_TYPES.PAYOUT_APPROVED:
        summary.payoutsScheduledCents += amt;
        break;
      case LEDGER_ENTRY_TYPES.OPERATING_SPEND:
        summary.operatingSpendCents += amt;
        break;
      default:
        break;
    }
  }

  summary.netRevenueCents = summary.grossRevenueCents - summary.refundsCents - summary.disputesCents - summary.processorFeesCents;
  summary.unpaidPayoutLiabilityCents = summary.payoutsScheduledCents - summary.payoutsPaidCents;
  summary.contributionMarginCents = summary.netRevenueCents - summary.operatingSpendCents;
  summary.contributionMarginPct = summary.grossRevenueCents > 0
    ? Number(((summary.contributionMarginCents / summary.grossRevenueCents) * 100).toFixed(2))
    : 0;

  return summary;
}
