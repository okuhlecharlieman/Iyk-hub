import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import crypto from 'crypto';
import { recordChargeWithFees } from '../../../../lib/monetization/ledger';
import {
  DEFAULT_PLATFORM_FEE_RATE,
} from '../../../../lib/monetization/constants';

const PAYSTACK_FEE_RATE = 0.015;
const PAYSTACK_FEE_FIXED_CENTS = 100;
const PAYSTACK_FEE_CAP_CENTS = 200000;

function calculatePaystackFee(amountCents) {
  const calculated = Math.round(amountCents * PAYSTACK_FEE_RATE) + PAYSTACK_FEE_FIXED_CENTS;
  return Math.min(calculated, PAYSTACK_FEE_CAP_CENTS);
}

const SA_VAT_RATE = 0.15;

function calculateVAT(amountCents) {
  return Math.round(amountCents * SA_VAT_RATE / (1 + SA_VAT_RATE));
}

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

      await recordChargeWithFees(db, {
        orderType,
        orderId,
        grossAmountCents: data.amount,
        currency: data.currency?.toUpperCase() || 'ZAR',
        processor: 'paystack',
        processorEventId: event.id,
        processorTransactionId: reference,
        processorFeeRate: PAYSTACK_FEE_RATE,
        processorFeeFixedCents: PAYSTACK_FEE_FIXED_CENTS,
        platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
      });

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
          const collectionMap = {
            creatorBoost: 'creatorBoostOrders',
            sponsoredChallenge: 'sponsoredChallenges',
            donation: 'donations',
          };
        const col = collectionMap[orderType];
        if (col) {
          await db.collection(col).doc(orderId).set({
            paymentStatus: 'paid',
            paidAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt:admin.firestore.FieldValue.serverTimestamp(),
          }, { merge: true });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('PayStack webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
