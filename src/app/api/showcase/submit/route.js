import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '../../../../lib/api/validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { enqueueModerationItem, screenTextContent } from '../../../../lib/api/moderation';

const allowedTypes = new Set(['art', 'code', 'game', 'design', 'music', 'other']);

const validateShowcasePayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['title', 'description', 'link', 'mediaUrl', 'type']);

  if (typeof payload.title !== 'string' || payload.title.trim().length === 0 || payload.title.length > 150) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'title', message: 'title is required (max 150 chars).' }]);
  }

  if (payload.description !== undefined && (typeof payload.description !== 'string' || payload.description.length > 2000)) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'description', message: 'description must be a string up to 2000 chars.' }]);
  }

  if (payload.link !== undefined && typeof payload.link !== 'string') {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'link', message: 'link must be a string.' }]);
  }

  if (payload.mediaUrl !== undefined && typeof payload.mediaUrl !== 'string') {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'mediaUrl', message: 'mediaUrl must be a string.' }]);
  }

  if (payload.type !== undefined && (typeof payload.type !== 'string' || !allowedTypes.has(payload.type))) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'type', message: 'invalid type.' }]);
  }

  return {
    title: payload.title.trim(),
    description: payload.description?.trim() || '',
    link: payload.link?.trim() || '',
    mediaUrl: payload.mediaUrl?.trim() || null,
    type: payload.type || 'other',
  };
};

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'showcase:submit', limit: 25, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    const payload = await parseJsonBody(request);
    const post = validateShowcasePayload(payload);

    const screening = screenTextContent([post.title, post.description, post.link]);
    const moderationStatus = screening.decision === 'flagged' ? 'pending_review' : 'approved';

    const postRef = await admin.firestore().collection('wallPosts').add({
      ...post,
      uid,
      votes: 0,
      voters: [],
      moderationStatus,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await enqueueModerationItem({
      contentType: 'showcase',
      contentId: postRef.id,
      submittedBy: uid,
      screening,
      preview: { title: post.title, description: post.description.slice(0, 240) },
    });

    return NextResponse.json({
      id: postRef.id,
      moderationStatus,
      message: moderationStatus === 'approved' ? 'Post published successfully.' : 'Post submitted and queued for moderation review.',
    });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/showcase/submit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
