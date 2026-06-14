import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../../lib/firebase/admin';
import { AuthMiddleware } from '../../../../../lib/api/auth-middleware';
import { enforceRateLimit } from '../../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../../lib/api/logging';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields , handleApiError } from '../../../../../lib/api/validation';
export const dynamic = 'force-dynamic';

const allowedStatuses = new Set(['pending', 'approved', 'rejected']);

const validateStatusPayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['status']);

  if (typeof payload.status !== 'string' || !allowedStatuses.has(payload.status)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'status', message: 'Status must be pending, approved, or rejected.' }]);
  }

  return { status: payload.status };
};

export async function PUT(request, { params }) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:sponsored-challenges:update', limit: 40, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    const user = await AuthMiddleware.requireAdmin(request);

    const { id } = params;
    if (!id) {
      return NextResponse.json({ error: 'Challenge ID is required.' }, { status: 400 });
    }

    const payload = await parseJsonBody(request);
    const { status } = validateStatusPayload(payload);

    const db = admin.firestore();
    const challengeRef = db.collection('sponsoredChallenges').doc(id);
    const challengeSnap = await challengeRef.get();

    if (!challengeSnap.exists) {
      return NextResponse.json({ error: 'Challenge not found.' }, { status: 404 });
    }

    const updatePayload = {
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (status === 'approved') {
      const challenge = challengeSnap.data();
      const platformFeeCents = challenge.platformFeeWaived ? 0 : Math.round((challenge.budgetCents || 0) * 0.2);
      const sponsorAmountCents = (challenge.budgetCents || 0) - platformFeeCents;
      updatePayload.approvedBy = uid;
      updatePayload.approvedAt = admin.firestore.FieldValue.serverTimestamp();
      updatePayload.platformFeeCents = platformFeeCents;
      updatePayload.sponsorAmountCents = sponsorAmountCents;
    }

    if (status === 'pending') {
      updatePayload.approvedBy = admin.firestore.FieldValue.delete();
      updatePayload.approvedAt = admin.firestore.FieldValue.delete();
      updatePayload.platformFeeCents = admin.firestore.FieldValue.delete();
      updatePayload.sponsorAmountCents = admin.firestore.FieldValue.delete();
    }

    await challengeRef.update(updatePayload);

    await logAdminAction({
      request,
      actor: user,
      action: 'challenge.status.updated',
      targetType: 'sponsoredChallenge',
      targetId: id,
      metadata: { status },
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    return handleApiError(error, 'Error updating sponsored challenge status:');
  }
}
