import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { createPaymentIntentRecord, getOrderConfig, getSupportedPaymentOptions } from '../../../../lib/monetization/payments';

const validatePayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['orderType', 'orderId']);

  if (typeof payload.orderType !== 'string' || payload.orderType.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'orderType', message: 'orderType is required.' }]);
  }

  if (typeof payload.orderId !== 'string' || payload.orderId.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'orderId', message: 'orderId is required.' }]);
  }

  return {
    orderType: payload.orderType.trim(),
    orderId: payload.orderId.trim(),
  };
};

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'payments:create-intent', limit: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const payload = await parseJsonBody(request);
    const { orderType, orderId } = validatePayload(payload);

    const config = getOrderConfig(orderType);
    if (!config) {
      return NextResponse.json({ error: 'Unsupported orderType' }, { status: 400 });
    }

    const db = admin.firestore();
    const orderSnap = await db.collection(config.collection).doc(orderId).get();

    if (!orderSnap.exists) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    const order = orderSnap.data();
    const ownerUid = order.ownerUid || order.reporterUid;
    if (ownerUid !== uid) {
      return NextResponse.json({ error: 'Forbidden for this order.' }, { status: 403 });
    }

    const amountCents = Number(order.feeCents || order.feeCentsMonthly || 0);
    if (!amountCents || amountCents <= 0) {
      return NextResponse.json({ error: 'Order has no payable amount.' }, { status: 400 });
    }

    const paymentOptions = getSupportedPaymentOptions('ZA');

    const paymentRef = await createPaymentIntentRecord({
      db,
      uid,
      orderType,
      orderId,
      amountCents,
      provider: 'manual_south_africa',
      metadata: { source: 'create-intent-api', paymentOptionIds: paymentOptions.map((option) => option.id) },
    });

    await db.collection(config.collection).doc(orderId).set({
      [config.statusField]: 'pending_payment',
      latestPaymentId: paymentRef.id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      paymentId: paymentRef.id,
      amountCents,
      status: 'pending',
      paymentOptions,
      message: 'Payment intent created. Choose a South Africa-friendly payment option to complete checkout once the provider integration is connected.',
    });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/payments/create-intent:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
