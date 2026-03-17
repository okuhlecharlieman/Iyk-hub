import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { applyPaymentStatusToOrder } from '../../../../lib/monetization/payments';

const isWebhookAuthorized = (request) => {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) return false;

  const signature = request.headers.get('x-payment-webhook-secret') || '';
  return signature === secret;
};

export async function POST(request) {
  if (!isWebhookAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await initializeFirebaseAdmin();

    const payload = await request.json();
    const { eventId, paymentId, status } = payload || {};

    if (typeof eventId !== 'string' || eventId.trim().length === 0) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    if (typeof paymentId !== 'string' || paymentId.trim().length === 0) {
      return NextResponse.json({ error: 'paymentId is required' }, { status: 400 });
    }

    if (!['paid', 'failed'].includes(status)) {
      return NextResponse.json({ error: 'status must be paid or failed' }, { status: 400 });
    }

    const db = admin.firestore();
    const eventRef = db.collection('paymentWebhookEvents').doc(eventId.trim());
    const eventSnap = await eventRef.get();
    if (eventSnap.exists) {
      return NextResponse.json({ success: true, deduplicated: true, eventId: eventId.trim() });
    }

    const paymentRef = db.collection('payments').doc(paymentId.trim());
    const paymentSnap = await paymentRef.get();

    if (!paymentSnap.exists) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const payment = paymentSnap.data();
    await paymentRef.set({
      status,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await applyPaymentStatusToOrder({
      db,
      orderType: payment.orderType,
      orderId: payment.orderId,
      status,
    });

    await eventRef.set({
      paymentId: paymentId.trim(),
      status,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, paymentId: paymentId.trim(), status, eventId: eventId.trim() });
  } catch (error) {
    console.error('Error in /api/payments/webhook:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
