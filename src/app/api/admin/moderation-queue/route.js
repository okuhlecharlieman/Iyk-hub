import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/audit-log';

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
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/admin/moderation-queue GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:moderation-queue:put', limit: 40, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const actor = await authenticate(request);
    await initializeFirebaseAdmin();

    const payload = await parseJsonBody(request);
    const { queueId, decision, note } = validateModerationDecisionPayload(payload);

    const queueRef = admin.firestore().collection('moderationQueue').doc(queueId);
    const queueSnap = await queueRef.get();

    if (!queueSnap.exists) {
      return NextResponse.json({ error: 'Queue item not found.' }, { status: 404 });
    }

    const item = queueSnap.data();
    const contentCollection = item.contentType === 'showcase' ? 'wallPosts' : 'opportunities';
    const contentRef = admin.firestore().collection(contentCollection).doc(item.contentId);

    if (decision === 'approve') {
      await contentRef.set({ moderationStatus: 'approved', updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    } else {
      const rejectionUpdate = {
        moderationStatus: 'rejected',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (item.contentType === 'opportunity') {
        rejectionUpdate.status = 'rejected';
      }

      await contentRef.set(rejectionUpdate, { merge: true });
    }

    await queueRef.set({
      status: decision === 'approve' ? 'approved' : 'rejected',
      reviewedBy: actor.uid,
      reviewNote: note,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await logAdminAction({
      request,
      actor,
      action: 'moderation.reviewed',
      targetType: item.contentType,
      targetId: item.contentId,
      metadata: { queueId, decision, note },
    });

    return NextResponse.json({ message: 'Moderation decision applied successfully.' });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/admin/moderation-queue PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
