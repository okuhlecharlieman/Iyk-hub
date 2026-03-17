import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin, authenticate } from '@/lib/firebase/admin';
import { ensurePlainObject, parseJsonBody, RequestValidationError, validateNoExtraFields } from '@/lib/api/validation';
<<<<<<< codex/secure-admin-apis-with-role-based-access-control-1tvsx8
import { enforceRateLimit } from '@/lib/api/rate-limit';
import { logAdminAction } from '@/lib/api/audit-log';
=======
>>>>>>> main

const validateDeletePostPayload = (payload) => {
  ensurePlainObject(payload);
  validateNoExtraFields(payload, ['postId']);

  if (typeof payload.postId !== 'string' || payload.postId.trim().length === 0) {
    throw new RequestValidationError('Invalid request payload.', [{ path: 'postId', message: 'Post ID is required.' }]);
  }

  return { postId: payload.postId.trim() };
};

export async function POST(req) {
  const rateLimitResponse = enforceRateLimit(req, { keyPrefix: 'admin:posts:delete', limit: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;
  try {
<<<<<<< codex/secure-admin-apis-with-role-based-access-control-1tvsx8
    const actor = await authenticate(req);
=======
    await authenticate(req);
>>>>>>> main

    const payload = await parseJsonBody(req);
    const { postId } = validateDeletePostPayload(payload);

    await initializeFirebaseAdmin();
    const adminDb = admin.firestore();

    const postRef = adminDb.collection('wallPosts').doc(postId);
    await postRef.delete();

<<<<<<< codex/secure-admin-apis-with-role-based-access-control-1tvsx8
    await logAdminAction({
      request: req,
      actor,
      action: 'showcase.post.deleted',
      targetType: 'wallPost',
      targetId: postId,
    });

=======
>>>>>>> main
    return NextResponse.json({ message: 'Post deleted successfully' });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }

    console.error('Error deleting post:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred' }, { status: error.code || 500 });
  }
}
