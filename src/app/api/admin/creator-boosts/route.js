import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/audit-log';

const validateBoostUpdatePayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['orderId', 'paymentStatus', 'activationStatus', 'note']);

  if (typeof payload.orderId !== 'string' || payload.orderId.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'orderId', message: 'orderId is required.' }]);
  }

  const allowedPayment = ['pending_payment', 'paid', 'failed', 'refunded'];
  const allowedActivation = ['pending_activation', 'active', 'expired', 'cancelled'];

  if (payload.paymentStatus !== undefined && !allowedPayment.includes(payload.paymentStatus)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'paymentStatus', message: 'Invalid paymentStatus.' }]);
  }

  if (payload.activationStatus !== undefined && !allowedActivation.includes(payload.activationStatus)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'activationStatus', message: 'Invalid activationStatus.' }]);
  }

  return {
    orderId: payload.orderId.trim(),
    paymentStatus: payload.paymentStatus,
    activationStatus: payload.activationStatus,
    note: typeof payload.note === 'string' ? payload.note.trim() : null,
  };
};

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:creator-boosts:get', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await authenticate(request);
    await initializeFirebaseAdmin();

    const snap = await admin.firestore().collection('creatorBoostOrders').orderBy('createdAt', 'desc').limit(200).get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ items });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error('Error in /api/admin/creator-boosts GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:creator-boosts:put', limit: 40, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const actor = await authenticate(request);
    await initializeFirebaseAdmin();

    const payload = await parseJsonBody(request);
    const update = validateBoostUpdatePayload(payload);

    const db = admin.firestore();
    const ref = db.collection('creatorBoostOrders').doc(update.orderId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Boost order not found.' }, { status: 404 });
    }

    const order = snap.data();
    const patch = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: actor.uid,
    };

    if (update.paymentStatus) patch.paymentStatus = update.paymentStatus;
    if (update.activationStatus) patch.activationStatus = update.activationStatus;
    if (update.note !== null) patch.note = update.note;

    if ((update.paymentStatus === 'paid' || order.paymentStatus === 'paid') && update.activationStatus === 'active') {
      patch.activatedAt = admin.firestore.FieldValue.serverTimestamp();
      patch.expiresAt = new Date(Date.now() + (order.durationHours || 0) * 60 * 60 * 1000);
    }

    await ref.set(patch, { merge: true });

    await logAdminAction({
      request,
      actor,
      action: 'creator.boost.updated',
      targetType: 'creatorBoostOrder',
      targetId: update.orderId,
      metadata: {
        paymentStatus: update.paymentStatus,
        activationStatus: update.activationStatus,
      },
    });

    return NextResponse.json({ success: true, message: 'Creator boost order updated.' });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/admin/creator-boosts PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
