import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields , handleApiError } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/audit-log';
export const dynamic = 'force-dynamic';

const validateModerationDecisionPayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['queueId', 'decision', 'note']);

  if (typeof payload.queueId !== 'string' || payload.queueId.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'queueId', message: 'queueId is required.' }]);
  }

  if (!['approve', 'reject'].includes(payload.decision)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'decision', message: 'decision must be approve or reject.' }]);
  }

  if (payload.note !== undefined && typeof payload.note !== 'string') {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'note', message: 'note must be a string.' }]);
  }

  return {
    queueId: payload.queueId.trim(),
    decision: payload.decision,
    note: payload.note?.trim() || null,
  };
};

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:moderation-queue:get', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await authenticate(request);
    await initializeFirebaseAdmin();

    const snap = await admin.firestore().collection('moderationQueue').where('status', '==', 'open').orderBy('createdAt', 'desc').limit(100).get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error, 'Error in /api/admin/moderation-queue PUT');
  }
}
