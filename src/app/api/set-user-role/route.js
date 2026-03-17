import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../lib/api/validation';
import { enforceRateLimit } from '../../../lib/api/rate-limit';

const validateSetRolePayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['uid', 'role']);

  if (typeof payload.uid !== 'string' || payload.uid.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'uid', message: 'UID is required.' }]);
  }

  if (typeof payload.role !== 'string' || !['admin', 'user'].includes(payload.role)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'role', message: 'role must be admin or user.' }]);
  }

  return { uid: payload.uid.trim(), role: payload.role };
};

export async function POST(req) {
  const rateLimitResponse = enforceRateLimit(req, { keyPrefix: 'admin:users:set-role', limit: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;
  try {
    await initializeFirebaseAdmin();
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK:', err);
    return NextResponse.json({ error: 'Server failed to initialize Firebase Admin SDK.' }, { status: 500 });
  }

  try {
    await authenticate(req);

    const payload = await parseJsonBody(req);
    const { uid, role } = validateSetRolePayload(payload);

    try {
      await admin.auth().getUser(uid);
    } catch {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    await admin.auth().setCustomUserClaims(uid, { role });
    await admin.firestore().collection('users').doc(uid).set({ role }, { merge: true });

    let targetDisplayName = null;
    try {
      const authUser = await admin.auth().getUser(uid);
      targetDisplayName = authUser.displayName || null;
    } catch {
      // no-op
    }

    return NextResponse.json({
      message: `Successfully set role to ${role} for user ${targetDisplayName || uid}`,
      targetDisplayName,
    });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }

    console.error('Error setting user role:', error?.message || error);
    const msg = (error && String(error.message || error)).slice(0, 1000);
    if (msg.includes('FIREBASE_SERVICE_ACCOUNT_KEY') || msg.toLowerCase().includes('failed to initialize')) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ error: 'Unable to change role. Check server logs or ensure FIREBASE_SERVICE_ACCOUNT_KEY is configured.' }, { status: 500 });
  }
}
