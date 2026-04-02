import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin, authenticate, listAllUsers } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/audit-log';

const validateUidPayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['uid']);

  if (typeof payload.uid !== 'string' || payload.uid.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'uid', message: 'UID is required.' }]);
  }

  return { uid: payload.uid.trim() };
};

const normalizeEmail = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : null);

const validateUpdatePayload = (payload) => {
  ensurePlainObject(payload);

  const allowedFields = ['uid', 'displayName', 'email', 'photoURL', 'password', 'phoneNumber', 'disabled', 'emailVerified', 'role', 'bio', 'skills'];
  validateNoExtraFields(payload, allowedFields);

  const { uid } = validateUidPayload({ uid: payload.uid });
  const updateData = {};

  if (payload.displayName !== undefined) {
    if (typeof payload.displayName !== 'string' || payload.displayName.trim().length === 0 || payload.displayName.length > 120) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'displayName', message: 'displayName must be a non-empty string up to 120 chars.' }]);
    }
    updateData.displayName = payload.displayName.trim();
  }

  if (payload.email !== undefined) {
    if (typeof payload.email !== 'string' || !payload.email.includes('@')) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'email', message: 'email must be valid.' }]);
    }
    updateData.email = normalizeEmail(payload.email);
  }

  if (payload.photoURL !== undefined) {
    if (typeof payload.photoURL !== 'string' || payload.photoURL.trim().length === 0) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'photoURL', message: 'photoURL must be a non-empty string.' }]);
    }
    updateData.photoURL = payload.photoURL.trim();
  }

  if (payload.password !== undefined) {
    if (typeof payload.password !== 'string' || payload.password.length < 6 || payload.password.length > 128) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'password', message: 'password must be 6-128 chars.' }]);
    }
    updateData.password = payload.password;
  }

  if (payload.phoneNumber !== undefined) {
    if (typeof payload.phoneNumber !== 'string' || payload.phoneNumber.trim().length < 6 || payload.phoneNumber.trim().length > 20) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'phoneNumber', message: 'phoneNumber must be 6-20 chars.' }]);
    }
    updateData.phoneNumber = payload.phoneNumber.trim();
  }

  if (payload.disabled !== undefined) {
    if (typeof payload.disabled !== 'boolean') {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'disabled', message: 'disabled must be boolean.' }]);
    }
    updateData.disabled = payload.disabled;
  }

  if (payload.emailVerified !== undefined) {
    if (typeof payload.emailVerified !== 'boolean') {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'emailVerified', message: 'emailVerified must be boolean.' }]);
    }
    updateData.emailVerified = payload.emailVerified;
  }

  if (payload.role !== undefined) {
    if (!['admin', 'user'].includes(payload.role)) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'role', message: 'role must be admin or user.' }]);
    }
    updateData.role = payload.role;
  }

  if (payload.bio !== undefined) {
    if (typeof payload.bio !== 'string' || payload.bio.length > 500) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'bio', message: 'bio must be a string up to 500 chars.' }]);
    }
    updateData.bio = payload.bio.trim();
  }

  if (payload.skills !== undefined) {
    if (!Array.isArray(payload.skills) || payload.skills.length > 50 || !payload.skills.every((skill) => typeof skill === 'string' && skill.trim().length > 0 && skill.length <= 50)) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'skills', message: 'skills must be an array of up to 50 non-empty strings (max 50 chars each).' }]);
    }
    updateData.skills = payload.skills.map((skill) => skill.trim());
  }

  return { uid, updateData };
};

export async function GET(req) {
  const rateLimitResponse = enforceRateLimit(req, { keyPrefix: 'admin:users:get', limit: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await authenticate(req);
    const users = await listAllUsers();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error('Error fetching users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function PUT(req) {
  const rateLimitResponse = enforceRateLimit(req, { keyPrefix: 'admin:users:update', limit: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const actor = await authenticate(req);

    const payload = await parseJsonBody(req);
    const { uid, updateData } = validateUpdatePayload(payload);

    const authUpdateData = {};
    const allowedAuthFields = ['displayName', 'email', 'photoURL', 'password', 'phoneNumber', 'disabled', 'emailVerified'];
    allowedAuthFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(updateData, field)) {
        authUpdateData[field] = updateData[field];
      }
    });

    const adminDb = admin.firestore();
    const userDocRef = adminDb.collection('users').doc(uid);
    const existingUserDoc = await userDocRef.get();
    const existingUserData = existingUserDoc.exists ? existingUserDoc.data() : {};
    let authExists = true;
    let authWasCreated = false;

    try {
      await admin.auth().getUser(uid);
    } catch (error) {
      if (error?.code === 'auth/user-not-found') {
        authExists = false;
        if (updateData.role) {
          const createPayload = { uid };
          const emailForAuth = updateData.email || normalizeEmail(existingUserData?.email);
          const displayNameForAuth = updateData.displayName || existingUserData?.displayName || undefined;
          const photoUrlForAuth = updateData.photoURL || existingUserData?.photoURL || undefined;

          if (!emailForAuth) {
            throw new RequestValidationError('Cannot assign admin claims because this user does not have a Firebase Auth account or a saved email address.', [{ path: 'email', message: 'Add an email address before assigning admin claims.' }]);
          }

          createPayload.email = emailForAuth;
          if (displayNameForAuth) createPayload.displayName = displayNameForAuth;
          if (photoUrlForAuth) createPayload.photoURL = photoUrlForAuth;

          await admin.auth().createUser(createPayload);
          authExists = true;
          authWasCreated = true;
          console.log(`Created Firebase Auth user for ${uid}`);
        }
      } else {
        throw error;
      }
    }

    if (authExists && Object.keys(authUpdateData).length > 0) {
      await admin.auth().updateUser(uid, authUpdateData);
    }

    await userDocRef.set(updateData, { merge: true });

    if (Object.prototype.hasOwnProperty.call(updateData, 'role')) {
      if (authExists) {
        await admin.auth().setCustomUserClaims(uid, { role: updateData.role });
      } else {
        // User does not exist in Auth (e.g. legacy Firestore-only record).
        console.warn(`User ${uid} has no Firebase Auth account and could not be created; role stored in Firestore only.`);
      }
    }

    await logAdminAction({
      request: req,
      actor,
      action: 'user.updated',
      targetType: 'user',
      targetId: uid,
      metadata: { updatedFields: Object.keys(updateData), authExists, authWasCreated },
    });

    return NextResponse.json({ message: `User ${uid} updated successfully`, authExists, authWasCreated });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }

    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req) {
  const rateLimitResponse = enforceRateLimit(req, { keyPrefix: 'admin:users:delete', limit: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const actor = await authenticate(req);

    const payload = await parseJsonBody(req);
    const { uid } = validateUidPayload(payload);

    try {
      await admin.auth().deleteUser(uid);
    } catch (error) {
      if (error?.code !== 'auth/user-not-found') {
        throw error;
      }
    }

    const adminDb = admin.firestore();
    await adminDb.collection('users').doc(uid).delete();
    await adminDb.collection('leaderboard').doc(uid).delete();

    await logAdminAction({
      request: req,
      actor,
      action: 'user.deleted',
      targetType: 'user',
      targetId: uid,
    });

    return NextResponse.json({ message: `User ${uid} deleted successfully` });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }

    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
