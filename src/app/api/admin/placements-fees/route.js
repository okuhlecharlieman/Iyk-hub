import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/audit-log';

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
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error('Error in /api/admin/placements-fees GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:placements-fees:put', limit: 40, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const actor = await authenticate(request);
    await initializeFirebaseAdmin();

    const payload = await parseJsonBody(request);
    const update = validatePlacementFeeUpdate(payload);

    const db = admin.firestore();
    const reportRef = db.collection('placementReports').doc(update.placementReportId);
    const reportSnap = await reportRef.get();

    if (!reportSnap.exists) {
      return NextResponse.json({ error: 'Placement report not found.' }, { status: 404 });
    }

    await reportRef.set({
      feeStatus: update.feeStatus,
      reviewedBy: actor.uid,
      reviewNote: update.note,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await logAdminAction({
      request,
      actor,
      action: 'placement.fee.updated',
      targetType: 'placementReport',
      targetId: update.placementReportId,
      metadata: { feeStatus: update.feeStatus },
    });

    return NextResponse.json({ success: true, message: 'Placement fee status updated.' });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/admin/placements-fees PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
