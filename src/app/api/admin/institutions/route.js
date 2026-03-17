import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/audit-log';

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
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/admin/institutions GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:institutions:put', limit: 40, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const actor = await authenticate(request);
    await initializeFirebaseAdmin();

    const payload = await parseJsonBody(request);
    const update = validateInstitutionUpdatePayload(payload);

    const db = admin.firestore();
    const ref = db.collection('institutionAccounts').doc(update.institutionAccountId);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: 'Institution account not found.' }, { status: 404 });
    }

    const account = snap.data();

    const patch = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: actor.uid,
    };

    if (update.paymentStatus) patch.paymentStatus = update.paymentStatus;
    if (update.accountStatus) patch.accountStatus = update.accountStatus;
    if (update.note !== null) patch.note = update.note;

    await ref.set(patch, { merge: true });

    const effectiveStatus = update.accountStatus || account.accountStatus;
    await db.collection('users').doc(account.ownerUid).set({
      monetization: {
        institutionalAccountId: update.institutionAccountId,
        institutionalPlan: account.plan,
        institutionalStatus: effectiveStatus,
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    await logAdminAction({
      request,
      actor,
      action: 'institution.account.updated',
      targetType: 'institutionAccount',
      targetId: update.institutionAccountId,
      metadata: {
        paymentStatus: update.paymentStatus,
        accountStatus: update.accountStatus,
      },
    });

    return NextResponse.json({ success: true, message: 'Institution account updated.' });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/admin/institutions PUT:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
