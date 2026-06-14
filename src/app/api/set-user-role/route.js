import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateWithRoles, initializeFirebaseAdmin } from '../../../lib/firebase/admin';
import { TEAM_MANAGEMENT_ROLES, VALID_ROLE_KEYS } from '../../../lib/roles';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields , handleApiError } from '../../../lib/api/validation';
import { enforceRateLimit } from '../../../lib/api/rate-limit';
import { logAdminAction } from '../../../lib/api/audit-log';
export const dynamic = 'force-dynamic';

const validateSetRolePayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['uid', 'role']);

  if (typeof payload.uid !== 'string' || payload.uid.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'uid', message: 'UID is required.' }]);
  }

  const normalizedRole = typeof payload.role === 'string' ? payload.role.trim().toLowerCase() : '';
  if (!VALID_ROLE_KEYS.includes(normalizedRole)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'role', message: `role must be one of: ${VALID_ROLE_KEYS.join(', ')}.` }]);
  }

  return { uid: payload.uid.trim(), role: normalizedRole };
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
    const actor = await authenticateWithRoles(req, TEAM_MANAGEMENT_ROLES);

    const payload = await parseJsonBody(req);
    const { uid, role } = validateSetRolePayload(payload);

    try {
      await admin.auth().getUser(uid);
    } catch {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    await admin.auth().setCustomUserClaims(uid, { role });
    await admin.firestore().collection('users').doc(uid).set({ role }, { merge: true });

    await logAdminAction({
      request: req,
      actor,
      action: 'user.role.updated',
      targetType: 'user',
      targetId: uid,
      metadata: { role },
    });

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
