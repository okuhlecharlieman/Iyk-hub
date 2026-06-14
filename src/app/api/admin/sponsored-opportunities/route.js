import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields , handleApiError } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/audit-log';
export const dynamic = 'force-dynamic';

const validateUpdatePayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['orderId', 'paymentStatus', 'reviewStatus', 'note']);

  if (typeof payload.orderId !== 'string' || payload.orderId.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'orderId', message: 'orderId is required.' }]);
  }

  const allowedPayment = ['pending_payment', 'paid', 'failed', 'refunded'];
  const allowedReview = ['pending_review', 'approved', 'rejected'];

  if (payload.paymentStatus !== undefined && !allowedPayment.includes(payload.paymentStatus)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'paymentStatus', message: 'Invalid paymentStatus.' }]);
  }

  if (payload.reviewStatus !== undefined && !allowedReview.includes(payload.reviewStatus)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'reviewStatus', message: 'Invalid reviewStatus.' }]);
  }

  return {
    orderId: payload.orderId.trim(),
    paymentStatus: payload.paymentStatus,
    reviewStatus: payload.reviewStatus,
    note: typeof payload.note === 'string' ? payload.note.trim() : null,
  };
};

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:sponsored:get', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await authenticate(request);
    await initializeFirebaseAdmin();

    const snap = await admin.firestore().collection('sponsoredOpportunityOrders').orderBy('createdAt', 'desc').limit(200).get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error, 'Error in /api/admin/sponsored-opportunities PUT');
  }
}
