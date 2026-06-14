import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin, authenticateWithRoles, listAllUsers } from '../../../../lib/firebase/admin';
import { TEAM_MANAGEMENT_ROLES, VALID_ROLE_KEYS } from '../../../../lib/roles';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields , handleApiError } from '../../../../lib/api/validation';
import { enforceRateLimit, enforceDistributedRateLimit } from '../../../../lib/api/rate-limit';
import { logAdminAction } from '../../../../lib/api/audit-log';
export const dynamic = 'force-dynamic';

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
    const normalizedRole = typeof payload.role === 'string' ? payload.role.trim().toLowerCase() : '';
    if (!VALID_ROLE_KEYS.includes(normalizedRole)) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'role', message: `role must be one of: ${VALID_ROLE_KEYS.join(', ')}.` }]);
    }
    updateData.role = normalizedRole;
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
    await authenticateWithRoles(req, TEAM_MANAGEMENT_ROLES);
    const users = await listAllUsers();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    return handleApiError(error, 'Error fetching users');
  }
}

export async function PUT(req) {
  const rateLimitResponse = await enforceDistributedRateLimit(req, { keyPrefix: 'admin:users:update', limit: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const actor = await authenticateWithRoles(req, TEAM_MANAGEMENT_ROLES);

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
    return handleApiError(error, 'Error updating user');
  }
}

export async function DELETE(req) {
  const rateLimitResponse = await enforceDistributedRateLimit(req, { keyPrefix: 'admin:users:delete', limit: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const actor = await authenticateWithRoles(req, TEAM_MANAGEMENT_ROLES);

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
    return handleApiError(error, 'Error deleting user');
  }
}

export async function PATCH(req) {
  const rateLimitResponse = await enforceDistributedRateLimit(req, { keyPrefix: 'admin:users:suspend', limit: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const actor = await authenticateWithRoles(req, TEAM_MANAGEMENT_ROLES);

    const payload = await parseJsonBody(req);
    ensurePlainObject(payload);
    validateNoExtraFields(payload, ['uid', 'action', 'reason']);

    const uid = typeof payload.uid === 'string' ? payload.uid.trim() : '';
    const action = typeof payload.action === 'string' ? payload.action.trim() : '';
    const reason = typeof payload.reason === 'string' ? payload.reason.trim() : '';

    if (!uid) {
      return NextResponse.json({ error: 'uid is required' }, { status: 400 });
    }
    if (!['suspend', 'unsuspend'].includes(action)) {
      return NextResponse.json({ error: 'action must be suspend or unsuspend' }, { status: 400 });
    }

    const adminDb = admin.firestore();
    const userRef = adminDb.collection('users').doc(uid);
    const isSuspend = action === 'suspend';

    const updatePayload = {
      accountStatus: isSuspend ? 'suspended' : 'active',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (isSuspend) {
      updatePayload.suspendedAt = admin.firestore.FieldValue.serverTimestamp();
      updatePayload.suspendedBy = actor.uid;
      updatePayload.suspendReason = reason || 'Admin action';
    } else {
      updatePayload.suspendedAt = admin.firestore.FieldValue.delete();
      updatePayload.suspendedBy = admin.firestore.FieldValue.delete();
      updatePayload.suspendReason = admin.firestore.FieldValue.delete();
    }

    await userRef.set(updatePayload, { merge: true });

    try {
      await admin.auth().updateUser(uid, { disabled: isSuspend });
    } catch (authErr) {
      if (authErr?.code !== 'auth/user-not-found') {
        console.error('Error updating auth disabled status:', authErr);
      }
    }

    await logAdminAction({
      request: req,
      actor,
      action: isSuspend ? 'user.suspended' : 'user.unsuspended',
      targetType: 'user',
      targetId: uid,
      metadata: { reason },
    });

    return NextResponse.json({
      success: true,
      message: `User ${uid} ${isSuspend ? 'suspended' : 'unsuspended'} successfully`,
    });
  } catch (error) {
    return handleApiError(error, 'Error suspending/unsuspending user');
  }
}
