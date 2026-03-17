import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { getInstitutionPlanConfig } from '../../../../lib/monetization/institution-plans';

const validateSubscriptionPayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['institutionName', 'institutionType', 'billingEmail', 'plan']);

  const required = ['institutionName', 'institutionType', 'billingEmail', 'plan'];
  for (const field of required) {
    if (typeof payload[field] !== 'string' || payload[field].trim().length === 0) {
      throw new RequestValidationError('Invalid request payload.', [{ path: field, message: `${field} is required.` }]);
    }
  }

  const plan = payload.plan.trim().toLowerCase();
  const planConfig = getInstitutionPlanConfig(plan);
  if (!planConfig) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'plan', message: 'Invalid institution plan.' }]);
  }

  return {
    institutionName: payload.institutionName.trim(),
    institutionType: payload.institutionType.trim(),
    billingEmail: payload.billingEmail.trim().toLowerCase(),
    plan,
    planConfig,
  };
};

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'institutions:subscribe', limit: 10, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const payload = await parseJsonBody(request);
    const data = validateSubscriptionPayload(payload);

    const db = admin.firestore();

    const institutionRef = await db.collection('institutionAccounts').add({
      ownerUid: uid,
      institutionName: data.institutionName,
      institutionType: data.institutionType,
      billingEmail: data.billingEmail,
      plan: data.plan,
      feeCentsMonthly: data.planConfig.feeCentsMonthly,
      features: data.planConfig.features,
      paymentStatus: 'pending_payment',
      accountStatus: 'pending_activation',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await db.collection('users').doc(uid).set({
      monetization: {
        institutionalAccountId: institutionRef.id,
        institutionalPlan: data.plan,
        institutionalStatus: 'pending_activation',
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return NextResponse.json({
      success: true,
      institutionAccountId: institutionRef.id,
      plan: data.plan,
      feeCentsMonthly: data.planConfig.feeCentsMonthly,
      accountStatus: 'pending_activation',
      message: 'Institutional subscription request submitted.',
    });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/institutions/subscribe:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
