import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { createPaymentIntentRecord, getOrderConfig } from '../../../../lib/monetization/payments';

const validatePayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['orderType', 'orderId', 'idempotencyKey']);

  if (typeof payload.orderType !== 'string' || payload.orderType.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'orderType', message: 'orderType is required.' }]);
  }

  if (typeof payload.orderId !== 'string' || payload.orderId.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'orderId', message: 'orderId is required.' }]);
  }

  return {
    orderType: payload.orderType.trim(),
    orderId: payload.orderId.trim(),
    idempotencyKey: typeof payload.idempotencyKey === 'string' && payload.idempotencyKey.trim().length > 0
      ? payload.idempotencyKey.trim()
      : null,
  };
};

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'payments:create-intent', limit: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const payload = await parseJsonBody(request);
    const { orderType, orderId, idempotencyKey } = validatePayload(payload);

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

    if (idempotencyKey) {
      const existingSnap = await db.collection('payments')
        .where('ownerUid', '==', uid)
        .where('orderType', '==', orderType)
        .where('orderId', '==', orderId)
        .where('idempotencyKey', '==', idempotencyKey)
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        const existing = existingSnap.docs[0];
        const existingData = existing.data();
        return NextResponse.json({
          success: true,
          paymentId: existing.id,
          amountCents: existingData.amountCents,
          status: existingData.status,
          reused: true,
          message: 'Existing payment intent reused for idempotent request.',
        });
      }
    }

    const paymentRef = await createPaymentIntentRecord({
      db,
      uid,
      orderType,
      orderId,
      amountCents,
      metadata: { source: 'create-intent-api' },
      idempotencyKey,
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
      message: 'Payment intent created. Complete payment through configured provider integration.',
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
