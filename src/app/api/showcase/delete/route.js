import { NextResponse } from 'next/server';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields , handleApiError } from '../../../../lib/api/validation';
import admin from 'firebase-admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const validateDeleteShowcasePostPayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['postId']);

  if (typeof payload.postId !== 'string' || payload.postId.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'postId', message: 'Post ID is required.' }]);
  }

  return { postId: payload.postId.trim() };
};

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'showcase:delete', limit: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;
  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const payload = await parseJsonBody(request);
    const { postId } = validateDeleteShowcasePostPayload(payload);

    const db = admin.firestore();
    const postRef = db.collection('wallPosts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postData = postDoc.data();

    // Allow post owner or admin to delete
    const userDoc = await db.collection('users').doc(uid).get();
    const isAdmin = userDoc.exists && userDoc.data()?.role === 'admin';

    if (postData.uid !== uid && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized to delete this post' }, { status: 403 });
    }

    await postRef.delete();

    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    return handleApiError(error, 'Error deleting post');
  }
}
