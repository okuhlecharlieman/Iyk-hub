import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin, authenticate } from '../../../../lib/firebase/admin';
import { parseJsonBody, RequestValidationError } from '../../../../lib/api/validation';
import { validateUpdatePostPayload } from '../../../../lib/api/post-validation';
export const dynamic = 'force-dynamic';

export async function POST(req) {
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
