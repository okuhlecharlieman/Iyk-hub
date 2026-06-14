import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { parseJsonBody, RequestValidationError , handleApiError } from '../../../../lib/api/validation';
import { validateUpdatePostPayload } from '../../../../lib/api/post-validation';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'showcase:update', limit: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const payload = await parseJsonBody(request);
    const { postId, updates } = validateUpdatePostPayload(payload, { allowNullMedia: true });

    const db = admin.firestore();
    const postRef = db.collection('wallPosts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postData = postDoc.data();

    const userDoc = await db.collection('users').doc(uid).get();
    const isAdmin = userDoc.exists && userDoc.data()?.role === 'admin';

    if (postData.uid !== uid && !isAdmin) {
      return NextResponse.json({ error: 'You can only edit your own posts.' }, { status: 403 });
    }

    await postRef.update({ ...updates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    return NextResponse.json({ message: 'Post updated successfully' });
  } catch (error) {
    return handleApiError(error, 'Error in /api/showcase/update');
  }
}
