import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { getPlacementFeeRule } from '../../../../lib/monetization/placement-fees';

const validatePlacementPayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['opportunityId', 'candidateUid', 'companyName', 'placementType', 'hiredAt']);

  const required = ['opportunityId', 'candidateUid', 'companyName', 'placementType'];
  for (const field of required) {
    if (typeof payload[field] !== 'string' || payload[field].trim().length === 0) {
      throw new RequestValidationError('Invalid request payload.', [{ path: field, message: `${field} is required.` }]);
    }
  }

  const placementType = payload.placementType.trim().toLowerCase();
  const feeRule = getPlacementFeeRule(placementType);
  if (!feeRule) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'placementType', message: 'Unsupported placementType.' }]);
  }

  return {
    opportunityId: payload.opportunityId.trim(),
    candidateUid: payload.candidateUid.trim(),
    companyName: payload.companyName.trim(),
    placementType,
    feeRule,
    hiredAt: typeof payload.hiredAt === 'string' && payload.hiredAt.trim().length > 0 ? payload.hiredAt.trim() : null,
  };
};

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'placements:report', limit: 15, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const reporterUid = await authenticateAndGetUid(request);

    const payload = await parseJsonBody(request);
    const report = validatePlacementPayload(payload);

    const db = admin.firestore();
    const placementRef = await db.collection('placementReports').add({
      reporterUid,
      opportunityId: report.opportunityId,
      candidateUid: report.candidateUid,
      companyName: report.companyName,
      placementType: report.placementType,
      feeCents: report.feeRule.feeCents,
      feeStatus: 'pending_review',
      hiredAt: report.hiredAt,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      placementReportId: placementRef.id,
      feeCents: report.feeRule.feeCents,
      feeStatus: 'pending_review',
      message: 'Placement reported successfully. Fee review pending.',
    });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/placements/report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
