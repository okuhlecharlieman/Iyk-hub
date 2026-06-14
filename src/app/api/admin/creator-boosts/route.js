import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields , handleApiError } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/audit-log';
export const dynamic = 'force-dynamic';

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
    const items = snap.docs.map((doc) => {
      const data = doc.data();
      const toISO = (val) => {
        if (!val) return null;
        if (val.toDate && typeof val.toDate === 'function') return val.toDate().toISOString();
        if (val instanceof Date) return val.toISOString();
        if (typeof val === 'string') return val;
        if (val._seconds != null || val.seconds != null) {
          const seconds = Number(val._seconds ?? val.seconds);
          return new Date(seconds * 1000).toISOString();
        }
        return null;
      };
      return {
        id: doc.id,
        ...data,
        createdAt: toISO(data.createdAt),
        updatedAt: toISO(data.updatedAt),
        expiresAt: toISO(data.expiresAt),
        activatedAt: toISO(data.activatedAt),
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error, 'Error in /api/admin/creator-boosts PUT');
  }
}
