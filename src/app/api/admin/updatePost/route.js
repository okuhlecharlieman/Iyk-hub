import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin, authenticate } from '@/lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '@/lib/api/validation';
import { enforceRateLimit } from '@/lib/api/rate-limit';

const allowedPostFields = ['title', 'description', 'link', 'mediaUrl', 'type'];
const allowedTypes = new Set(['art', 'code', 'game', 'design', 'music', 'other']);

const validateUpdatePostPayload = (payload) => {
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
    if (typeof payload.updates.link !== 'string' || payload.updates.link.trim().length === 0) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'updates.link', message: 'link must be a non-empty string.' }]);
    }
    updates.link = payload.updates.link.trim();
  }

  if (payload.updates.mediaUrl !== undefined) {
    if (typeof payload.updates.mediaUrl !== 'string' || payload.updates.mediaUrl.trim().length === 0) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'updates.mediaUrl', message: 'mediaUrl must be a non-empty string.' }]);
    }
    updates.mediaUrl = payload.updates.mediaUrl.trim();
  }

  if (payload.updates.type !== undefined) {
    if (typeof payload.updates.type !== 'string' || !allowedTypes.has(payload.updates.type)) {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'updates.type', message: 'type must be one of art, code, game, design, music, other.' }]);
    }
    updates.type = payload.updates.type;
  }

  if (Object.keys(updates).length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'updates', message: 'At least one valid update field is required.' }]);
  }

  return { postId: payload.postId.trim(), updates };
};

export async function POST(req) {
  const rateLimitResponse = enforceRateLimit(req, { keyPrefix: 'admin:posts:update', limit: 40, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;
  try {
    await authenticate(req);

    const payload = await parseJsonBody(req);
    const { postId, updates } = validateUpdatePostPayload(payload);

    await initializeFirebaseAdmin();
    const adminDb = admin.firestore();

    const postRef = adminDb.collection('wallPosts').doc(postId);
    await postRef.update({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    return NextResponse.json({ message: 'Post updated successfully' });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }

    console.error('Error updating post:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred' }, { status: error.code || 500 });
  }
}
