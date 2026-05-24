import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { recordChargeWithFees } from '../../../../lib/monetization/ledger';
import { DEFAULT_PLATFORM_FEE_RATE } from '../../../../lib/monetization/constants';

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

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'payments:verify-donation', limit: 10, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const body = await request.json();
    const { reference } = body;

    if (!reference || typeof reference !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid reference' }, { status: 400 });
    }

    const db = admin.firestore();

    const existingLog = await db.collection('paymentLogs')
      .where('paystackReference', '==', reference)
      .limit(1)
      .get();

    if (!existingLog.empty) {
      return NextResponse.json({ success: true, alreadyRecorded: true });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ error: 'Payment verification not configured' }, { status: 500 });
    }

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } }
    );

    const verifyJson = await verifyRes.json();
    if (!verifyJson.status || verifyJson.data?.status !== 'success') {
      return NextResponse.json({ error: 'Payment not verified or not successful' }, { status: 400 });
    }

    const data = verifyJson.data;
    const metadata = data.metadata || {};

    let orderType = metadata.orderType || metadata.order_type || 'donation';
    if (Array.isArray(metadata.custom_fields)) {
      const found = metadata.custom_fields.find(
        (item) => item.variable_name === 'orderType' || item.display_name === 'orderType'
      );
      if (found?.value) orderType = found.value;
    }
    if (typeof orderType === 'string') {
      orderType = orderType.trim();
      if (orderType.toLowerCase() === 'donation') orderType = 'donation';
    }

    let orderId = metadata.orderId || metadata.order_id || null;
    if (Array.isArray(metadata.custom_fields)) {
      const found = metadata.custom_fields.find(
        (item) => item.variable_name === 'orderId' || item.display_name === 'orderId'
      );
      if (found?.value) orderId = found.value;
    }
    if (typeof orderId === 'string') orderId = orderId.trim() || null;

    let donorUid = metadata.donorUid || null;
    if (Array.isArray(metadata.custom_fields)) {
      const found = metadata.custom_fields.find(
        (item) => item.variable_name === 'donorUid' || item.display_name === 'donorUid'
      );
      if (found?.value) donorUid = found.value;
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
      donorUid: donorUid || uid,
      paystackFeeCents,
      vatCents,
      netAmountCents: data.amount - paystackFeeCents,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      verifiedVia: 'client-verify',
    });

    try {
      await recordChargeWithFees(db, {
        orderType,
        orderId,
        grossAmountCents: data.amount,
        currency: data.currency?.toUpperCase() || 'ZAR',
        processor: 'paystack',
        processorEventId: reference,
        processorTransactionId: reference,
        processorFeeRate: PAYSTACK_FEE_RATE,
        processorFeeFixedCents: PAYSTACK_FEE_FIXED_CENTS,
        platformFeeRate: DEFAULT_PLATFORM_FEE_RATE,
      });
    } catch (ledgerError) {
      console.error('[verify-donation] Ledger write failed (payment already recorded):', ledgerError?.message);
    }

    if (orderType === 'donation' && orderId) {
      await db.collection('donations').doc(orderId).set({
        paymentStatus: 'paid',
        donorUid: donorUid || uid,
        amountCents: data.amount,
        currency: data.currency,
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }

    return NextResponse.json({ success: true, recorded: true });
  } catch (error) {
    if (error?.code === 401) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error verifying donation:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
