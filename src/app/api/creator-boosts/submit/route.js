import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { getCreatorBoostPlan } from '../../../../lib/monetization/creator-boosts';

const validateBoostPayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['plan', 'targetType', 'targetId']);

  if (typeof payload.plan !== 'string' || payload.plan.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'plan', message: 'plan is required.' }]);
  }

  if (!['profile', 'project'].includes(payload.targetType)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'targetType', message: 'targetType must be profile or project.' }]);
  }

  if (typeof payload.targetId !== 'string' || payload.targetId.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'targetId', message: 'targetId is required.' }]);
  }

  const planKey = payload.plan.trim().toLowerCase();
  const plan = getCreatorBoostPlan(planKey);
  if (!plan) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'plan', message: 'Unknown boost plan.' }]);
  }

  return {
    planKey,
    plan,
    targetType: payload.targetType,
    targetId: payload.targetId.trim(),
  };
};

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'creator-boosts:submit', limit: 12, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const payload = await parseJsonBody(request);
    const data = validateBoostPayload(payload);

    const db = admin.firestore();

    const boostRef = await db.collection('creatorBoostOrders').add({
      ownerUid: uid,
      plan: data.planKey,
      feeCents: data.plan.feeCents,
      durationHours: data.plan.durationHours,
      visibilityMultiplier: data.plan.visibilityMultiplier,
      targetType: data.targetType,
      targetId: data.targetId,
      paymentStatus: 'pending_payment',
      activationStatus: 'pending_activation',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection('users').doc(uid).set({
      monetization: {
        latestCreatorBoostOrderId: boostRef.id,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      orderId: boostRef.id,
      plan: data.planKey,
      feeCents: data.plan.feeCents,
      durationHours: data.plan.durationHours,
      activationStatus: 'pending_activation',
      message: 'Creator boost order submitted.',
    });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/creator-boosts/submit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
