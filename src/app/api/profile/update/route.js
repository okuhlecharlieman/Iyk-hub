import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '@/lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '@/lib/api/validation';

export const runtime = 'nodejs';

const validateProfileUpdatePayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['updates']);

  ensurePlainObject(payload.updates, 'updates must be a JSON object.');
  validateNoExtraFields(payload.updates, ['displayName', 'bio', 'skills']);

  const updates = {};

  if (payload.updates.displayName !== undefined) {
    if (typeof payload.updates.displayName !== 'string' || payload.updates.displayName.trim().length === 0 || payload.updates.displayName.length > 120) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'updates.displayName', message: 'displayName must be a non-empty string up to 120 chars.' }]);
    }
    updates.displayName = payload.updates.displayName.trim();
  }

  if (payload.updates.bio !== undefined) {
    if (typeof payload.updates.bio !== 'string' || payload.updates.bio.length > 500) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'updates.bio', message: 'bio must be a string up to 500 chars.' }]);
    }
    updates.bio = payload.updates.bio.trim();
  }

  if (payload.updates.skills !== undefined) {
    if (!Array.isArray(payload.updates.skills) || payload.updates.skills.length > 50 || !payload.updates.skills.every((skill) => typeof skill === 'string' && skill.trim().length > 0 && skill.length <= 50)) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'updates.skills', message: 'skills must be an array of up to 50 non-empty strings (max 50 chars each).' }]);
    }
    updates.skills = payload.updates.skills.map((skill) => skill.trim());
  }

  if (Object.keys(updates).length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'updates', message: 'At least one valid profile field is required.' }]);
  }

  return { updates };
};

export async function POST(req) {
  const rateLimitResponse = enforceRateLimit(req, { keyPrefix: 'profile:update', limit: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;
  let uid;
  try {
    uid = await authenticateAndGetUid(req);
    if (!uid) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 401 });
  }

  try {
    await initializeFirebaseAdmin();
    const payload = await parseJsonBody(req);
    const { updates } = validateProfileUpdatePayload(payload);

    const userRef = admin.firestore().collection('users').doc(uid);
    await userRef.set(updates, { merge: true });

    return NextResponse.json({ message: 'Profile updated successfully' });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }

    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'An internal error occurred while updating the profile.' }, { status: 500 });
  }
}
