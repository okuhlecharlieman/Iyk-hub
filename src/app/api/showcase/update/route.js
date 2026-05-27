import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const allowedPostFields = ['title', 'description', 'link', 'mediaUrl', 'type'];
const allowedTypes = new Set(['art', 'code', 'game', 'design', 'music', 'other']);

const normalizePostType = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

const validateUpdatePayload = (payload) => {
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
    if (payload.updates.mediaUrl !== null && typeof payload.updates.mediaUrl !== 'string') {
      throw new RequestValidationError('Invalid request payload.', [{ path: 'updates.mediaUrl', message: 'mediaUrl must be a string or null.' }]);
    }
    updates.mediaUrl = payload.updates.mediaUrl ? payload.updates.mediaUrl.trim() : null;
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
};

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'showcase:update', limit: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const payload = await parseJsonBody(request);
    const { postId, updates } = validateUpdatePayload(payload);

    const db = admin.firestore();
    const postRef = db.collection('wallPosts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postData = postDoc.data();

    // Allow post owner or admin to edit
    const userDoc = await db.collection('users').doc(uid).get();
    const isAdmin = userDoc.exists && userDoc.data()?.role === 'admin';

    if (postData.uid !== uid && !isAdmin) {
      return NextResponse.json({ error: 'You can only edit your own posts.' }, { status: 403 });
    }

    await postRef.update({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    return NextResponse.json({ message: 'Post updated successfully' });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/showcase/update:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
