import { ensurePlainObject, RequestValidationError, validateNoExtraFields } from './validation';

const allowedPostFields = ['title', 'description', 'link', 'mediaUrl', 'type'];
const allowedTypes = new Set(['art', 'code', 'game', 'design', 'music', 'other']);

const normalizePostType = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export function validateUpdatePostPayload(payload, { allowNullMedia = false } = {}) {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['postId', 'updates']);

  if (typeof payload.postId !== 'string' || payload.postId.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'postId', message: 'Post ID is required.' }]);
  }

  ensurePlainObject(payload.updates, 'updates must be a JSON object.');
  validateNoExtraFields(payload.updates, allowedPostFields);

  const updates = {};

  if (payload.updates.title !== undefined) {
    if (typeof payload.updates.title !== 'string' || payload.updates.title.trim().length === 0 || payload.updates.title.length > 150) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'updates.title', message: 'title must be a non-empty string up to 150 chars.' }]);
    }
    updates.title = payload.updates.title.trim();
  }

  if (payload.updates.description !== undefined) {
    if (typeof payload.updates.description !== 'string' || payload.updates.description.length > 2000) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'updates.description', message: 'description must be a string up to 2000 chars.' }]);
    }
    updates.description = payload.updates.description.trim();
  }

  if (payload.updates.link !== undefined) {
    if (typeof payload.updates.link !== 'string') {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'updates.link', message: 'link must be a string.' }]);
    }
    updates.link = payload.updates.link.trim();
  }

  if (payload.updates.mediaUrl !== undefined) {
    if (allowNullMedia) {
      if (payload.updates.mediaUrl !== null && typeof payload.updates.mediaUrl !== 'string') {
        throw new RequestValidationError('Invalid request payload.', [{ path: 'updates.mediaUrl', message: 'mediaUrl must be a string or null.' }]);
      }
      updates.mediaUrl = payload.updates.mediaUrl ? payload.updates.mediaUrl.trim() : null;
    } else {
      if (typeof payload.updates.mediaUrl !== 'string' || payload.updates.mediaUrl.trim().length === 0) {
        throw new RequestValidationError('Invalid request payload.', [{ path: 'updates.mediaUrl', message: 'mediaUrl must be a non-empty string.' }]);
      }
      updates.mediaUrl = payload.updates.mediaUrl.trim();
    }
  }

  if (payload.updates.type !== undefined) {
    const type = normalizePostType(payload.updates.type);
    if (typeof type !== 'string' || !allowedTypes.has(type)) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'updates.type', message: 'type must be one of art, code, game, design, music, other.' }]);
    }
    updates.type = type;
  }

  if (Object.keys(updates).length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'updates', message: 'At least one valid update field is required.' }]);
  }

  return { postId: payload.postId.trim(), updates };
}
