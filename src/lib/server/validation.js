const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : value;
}

function validateUid(value) {
  if (typeof value !== 'string') {
    return { ok: false, error: 'UID must be a string', status: 400 };
  }

  const uid = value.trim();
  if (!uid) {
    return { ok: false, error: 'UID is required', status: 400 };
  }

  if (uid.length > 128) {
    return { ok: false, error: 'UID is too long', status: 400 };
  }

  return { ok: true, uid };
}

export function validateAdminDeletePayload(body) {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Invalid request body', status: 400 };
  }

  const uidResult = validateUid(body.uid);
  if (!uidResult.ok) return uidResult;

  return { ok: true, data: { uid: uidResult.uid } };
}

export function validateAdminUpdatePayload(body) {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Invalid request body', status: 400 };
  }

  const uidResult = validateUid(body.uid);
  if (!uidResult.ok) return uidResult;

  const updateData = { ...body };
  delete updateData.uid;

  if (!isPlainObject(updateData)) {
    return { ok: false, error: 'Update payload must be an object', status: 400 };
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'role')) {
    const role = normalizeString(updateData.role);
    if (!['user', 'admin'].includes(role)) {
      return { ok: false, error: 'Role must be either user or admin', status: 400 };
    }
    updateData.role = role;
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'email')) {
    const email = normalizeString(updateData.email);
    if (typeof email !== 'string' || !EMAIL_REGEX.test(email)) {
      return { ok: false, error: 'Invalid email format', status: 400 };
    }
    updateData.email = email.toLowerCase();
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'displayName')) {
    const displayName = normalizeString(updateData.displayName);
    if (typeof displayName !== 'string' || displayName.length < 2 || displayName.length > 80) {
      return { ok: false, error: 'Display name must be between 2 and 80 characters', status: 400 };
    }
    updateData.displayName = displayName;
  }

  if (Object.prototype.hasOwnProperty.call(updateData, 'bio')) {
    const bio = normalizeString(updateData.bio);
    if (typeof bio !== 'string' || bio.length > 500) {
      return { ok: false, error: 'Bio must be 500 characters or less', status: 400 };
    }
    updateData.bio = bio;
  }

  return { ok: true, data: { uid: uidResult.uid, updateData } };
}

export function sanitizeProfileUpdates(updates) {
  if (!isPlainObject(updates)) {
    return { ok: false, error: 'A valid updates object is required', status: 400 };
  }

  const allowedUpdates = {};

  if (Object.prototype.hasOwnProperty.call(updates, 'displayName')) {
    const displayName = normalizeString(updates.displayName);
    if (typeof displayName === 'string' && displayName.length >= 2 && displayName.length <= 80) {
      allowedUpdates.displayName = displayName;
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'bio')) {
    const bio = normalizeString(updates.bio);
    if (typeof bio === 'string' && bio.length <= 500) {
      allowedUpdates.bio = bio;
    }
  }

  if (Object.prototype.hasOwnProperty.call(updates, 'skills')) {
    const skills = updates.skills;
    if (Array.isArray(skills)) {
      allowedUpdates.skills = skills
        .map((skill) => normalizeString(skill))
        .filter((skill) => typeof skill === 'string' && skill.length > 0 && skill.length <= 40)
        .slice(0, 50);
    }
  }

  if (Object.keys(allowedUpdates).length === 0) {
    return { ok: false, error: 'No valid fields provided to update.', status: 400 };
  }

  return { ok: true, data: allowedUpdates };
}
