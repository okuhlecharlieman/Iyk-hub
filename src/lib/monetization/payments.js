import admin from 'firebase-admin';

const SUPPORTED_ORDER_COLLECTIONS = {
  sponsoredOpportunity: {
    collection: 'sponsoredOpportunityOrders',
    statusField: 'paymentStatus',
  },
  institution: {
    collection: 'institutionAccounts',
    statusField: 'paymentStatus',
  },
  creatorBoost: {
    collection: 'creatorBoostOrders',
    statusField: 'paymentStatus',
  },
  placementFee: {
    collection: 'placementReports',
    statusField: 'feeStatus',
  },
};

export const getOrderConfig = (orderType) => SUPPORTED_ORDER_COLLECTIONS[orderType] || null;

export const SOUTH_AFRICA_PAYMENT_OPTIONS = [
  {
    id: 'card',
    label: 'Cards',
    provider: 'yoco',
    description: 'Visa and Mastercard debit/credit cards are widely supported in South Africa.',
  },
  {
    id: 'instant_eft',
    label: 'Instant EFT',
    provider: 'ozow',
    description: 'Bank-backed instant EFT is a familiar checkout option for South African customers.',
  },
  {
    id: 'capitec_pay',
    label: 'Capitec Pay',
    provider: 'ozow',
    description: 'Capitec Pay offers streamlined approval for Capitec customers.',
  },
  {
    id: 'scan_to_pay',
    label: 'Scan to Pay',
    provider: 'peach_payments',
    description: 'QR and wallet-style flows can reduce friction on mobile checkout.',
  },
];

export function getSupportedPaymentOptions(countryCode = 'ZA') {
  if (countryCode === 'ZA') {
    return SOUTH_AFRICA_PAYMENT_OPTIONS;
  }

  return [SOUTH_AFRICA_PAYMENT_OPTIONS[0]];
}


export async function createPaymentIntentRecord({
  db,
  uid,
  orderType,
  orderId,
  amountCents,
  currency = 'ZAR',
  metadata = {},
  provider = 'manual_south_africa',
}) {
  const paymentRef = await db.collection('payments').add({
    ownerUid: uid,
    orderType,
    orderId,
    amountCents,
    currency,
    status: 'pending',
    provider,
    providerPaymentId: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    metadata,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return paymentRef;
}

export async function applyPaymentStatusToOrder({ db, orderType, orderId, status }) {
  const config = getOrderConfig(orderType);
  if (!config) {
    throw new Error(`Unsupported orderType: ${orderType}`);
  }

  const normalized = status === 'paid' ? 'paid' : status === 'failed' ? 'failed' : 'pending_payment';
  await db.collection(config.collection).doc(orderId).set({
    [config.statusField]: normalized,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return normalized;
}
