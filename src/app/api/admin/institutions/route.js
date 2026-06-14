import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields , handleApiError } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/audit-log';
export const dynamic = 'force-dynamic';

const validateInstitutionUpdatePayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['institutionAccountId', 'paymentStatus', 'accountStatus', 'note']);

  if (typeof payload.institutionAccountId !== 'string' || payload.institutionAccountId.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'institutionAccountId', message: 'institutionAccountId is required.' }]);
  }

  const allowedPaymentStatuses = ['pending_payment', 'paid', 'failed', 'refunded'];
  const allowedAccountStatuses = ['pending_activation', 'active', 'suspended', 'cancelled'];

  if (payload.paymentStatus !== undefined && !allowedPaymentStatuses.includes(payload.paymentStatus)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'paymentStatus', message: 'Invalid paymentStatus.' }]);
  }

  if (payload.accountStatus !== undefined && !allowedAccountStatuses.includes(payload.accountStatus)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'accountStatus', message: 'Invalid accountStatus.' }]);
  }

  return {
    institutionAccountId: payload.institutionAccountId.trim(),
    paymentStatus: payload.paymentStatus,
    accountStatus: payload.accountStatus,
    note: typeof payload.note === 'string' ? payload.note.trim() : null,
  };
};

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:institutions:get', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await authenticate(request);
    await initializeFirebaseAdmin();

    const snap = await admin.firestore().collection('institutionAccounts').orderBy('createdAt', 'desc').limit(200).get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error, 'Error in /api/admin/institutions PUT');
  }
}
