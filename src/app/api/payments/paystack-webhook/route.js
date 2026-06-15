/**
 * Paystack Webhook — handles charge.success events from Paystack.
 *
 * Supported order types (metadata.orderType):
 *   - creatorBoost: activates boost plan, updates user doc with badge/tier
 *   - sponsoredChallenge: marks challenge paymentStatus='paid' for admin review
 *   - sponsoredOpportunity: marks opportunity as sponsored+pinned
 *   - donation: logs donation payment
 *
 * Security: HMAC signature verification using PAYSTACK_SECRET_KEY.
 * All payments are logged to paymentLogs and financialLedger collections.
 *
 * Testers: Use Paystack test mode to simulate payments. The webhook URL
 * must be configured in the Paystack dashboard under Settings > API Keys & Webhooks.
 */
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import crypto from 'crypto';
import { recordChargeWithFees } from '../../../../lib/monetization/ledger';
import {
  DEFAULT_PLATFORM_FEE_RATE,
} from '../../../../lib/monetization/constants';
import { getCreatorBoostPlan } from '../../../../lib/monetization/creator-boosts';
export const dynamic = 'force-dynamic';

const PAYSTACK_FEE_RATE = 0.015;
const PAYSTACK_FEE_FIXED_CENTS = 100;
const PAYSTACK_FEE_CAP_CENTS = 200000;

/** calculate Paystack Fee. */
function calculatePaystackFee(amountCents) {
  const calculated = Math.round(amountCents * PAYSTACK_FEE_RATE) + PAYSTACK_FEE_FIXED_CENTS;
  return Math.min(calculated, PAYSTACK_FEE_CAP_CENTS);
}

const SA_VAT_RATE = 0.15;

/** calculate V A T. */
function calculateVAT(amountCents) {
  return Math.round(amountCents * SA_VAT_RATE / (1 + SA_VAT_RATE));
}

/** extract Metadata Field. */
const extractMetadataField = (metadata, field) => {
  if (!metadata) return undefined;
  if (metadata[field] !== undefined) return metadata[field];
  if (Array.isArray(metadata.custom_fields)) {
    const found = metadata.custom_fields.find(
      (item) => item.variable_name === field || item.display_name === field
    );
    return found?.value;
  }
  return undefined;
};

/** Handles POST requests to /api/payments/paystack-webhook. */
export async function POST(request) {
  try {
    await initializeFirebaseAdmin();

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: 'PayStack not configured' }, { status: 500 });
    }

    const body = await request.text();
    const signature = request.headers.get('x-paystack-signature');
    const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');

    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === 'charge.success') {
      const data = event.data;
      const { reference, metadata } = data;
      console.log('[PayStack Webhook] charge.success received', {
        eventId: event.id || null,
        reference,
        amount: data.amount,
        currency: data.currency,
      });
      const db = admin.firestore();

      const existingLog = await db.collection('paymentLogs')
        .where('paystackReference', '==', reference)
        .limit(1)
        .get();

      if (!existingLog.empty) {
        console.log(`[PayStack Webhook] Duplicate reference ${reference}, skipping`);
        return NextResponse.json({ received: true, duplicate: true });
      }

      let orderType = extractMetadataField(metadata, 'orderType') || extractMetadataField(metadata, 'order_type') || 'donation';
      let orderId = extractMetadataField(metadata, 'orderId') || extractMetadataField(metadata, 'order_id') || null;
      if (typeof orderType === 'string') {
        orderType = orderType.trim();
        if (orderType.toLowerCase() === 'donation') orderType = 'donation';
      }
      if (typeof orderId === 'string') {
        orderId = orderId.trim() || null;
      }

      const paystackFeeCents = calculatePaystackFee(data.amount);
      const vatCents = calculateVAT(data.amount);

      await db.collection('paymentLogs').add({
        paystackReference: reference,
        orderType,
        orderId,
        amountCents: data.amount,
        currency: data.currency,
        status: 'succeeded',
        customerEmail: data.customer?.email || null,
        customerId: data.customer?.id || null,
        paystackFeeCents,
        vatCents,
        netAmountCents: data.amount - paystackFeeCents,
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log('[PayStack Webhook] Writing financial ledger entries', { reference, orderType, orderId });
      await recordChargeWithFees(db, {
        orderType,
        orderId,
        grossAmountCents: data.amount,
        currency: data.currency?.toUpperCase() || 'ZAR',
        processor: 'paystack',
        processorEventId: event.id || reference,
        processorTransactionId: reference,
        processorFeeRate: PAYSTACK_FEE_RATE,
        processorFeeFixedCents: PAYSTACK_FEE_FIXED_CENTS,
        platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
      });

      console.log('[PayStack Webhook] Ledger write complete', { reference });
      const paymentsSnap = await db.collection('payments')
        .where('paystackReference', '==', reference)
        .limit(1)
        .get();

      if (!paymentsSnap.empty) {
        await paymentsSnap.docs[0].ref.update({
          status: 'paid',
          paystackFeeCents,
          vatCents,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      if (orderType && orderId) {
          // Map order types to Firestore collections for status updates
          const collectionMap = {
            creatorBoost: 'creatorBoostOrders',
            sponsoredChallenge: 'sponsoredChallenges',
            sponsoredOpportunity: 'opportunities',
            donation: 'donations',
          };
        const col = collectionMap[orderType];
        if (col) {
          const updateData = {
            paymentStatus: 'paid',
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          if (orderType === 'creatorBoost') {
            const orderDoc = await db.collection(col).doc(orderId).get();
            if (orderDoc.exists) {
              const orderData = orderDoc.data();
              const durationHours = orderData.durationHours || 24;
              const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);
              updateData.activationStatus = 'active';
              updateData.activatedAt = admin.firestore.FieldValue.serverTimestamp();
              updateData.expiresAt = expiresAt;

              const plan = getCreatorBoostPlan(orderData.plan);
              if (plan && orderData.ownerUid) {
                await db.collection('users').doc(orderData.ownerUid).set({
                  activeBoost: {
                    orderId,
                    plan: orderData.plan,
                    tier: orderData.plan?.toUpperCase() || null,
                    badge: plan.badge,
                    badgeLabel: plan.badgeLabel,
                    badgeColor: plan.badgeColor,
                    visibilityMultiplier: plan.visibilityMultiplier,
                    videoChatSeconds: plan.videoChatSeconds,
                    expiresAt,
                  },
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                }, { merge: true });
              }
            }
          }

          // Sponsored opportunity: mark as sponsored and pinned after payment
          if (orderType === 'sponsoredOpportunity') {
            updateData.type = 'sponsoredOpportunity';
            updateData.sponsored = true;
            updateData.sponsoredAt = admin.firestore.FieldValue.serverTimestamp();
          }

          await db.collection(col).doc(orderId).set(updateData, { merge: true });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('PayStack webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
