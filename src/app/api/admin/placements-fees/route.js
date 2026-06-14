import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields , handleApiError } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/audit-log';
export const dynamic = 'force-dynamic';

const validatePlacementFeeUpdate = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['placementReportId', 'feeStatus', 'note']);

  if (typeof payload.placementReportId !== 'string' || payload.placementReportId.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'placementReportId', message: 'placementReportId is required.' }]);
  }

  const allowedStatuses = ['pending_review', 'approved', 'invoiced', 'paid', 'waived', 'rejected'];
  if (typeof payload.feeStatus !== 'string' || !allowedStatuses.includes(payload.feeStatus)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'feeStatus', message: 'Invalid feeStatus.' }]);
  }

  return {
    placementReportId: payload.placementReportId.trim(),
    feeStatus: payload.feeStatus,
    note: typeof payload.note === 'string' ? payload.note.trim() : null,
  };
};

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:placements-fees:get', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await authenticate(request);
    await initializeFirebaseAdmin();

    const snap = await admin.firestore().collection('placementReports').orderBy('createdAt', 'desc').limit(200).get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error, 'Error in /api/admin/placements-fees PUT');
  }
}
