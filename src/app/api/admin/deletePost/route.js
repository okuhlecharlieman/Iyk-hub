import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '@/lib/firebase/admin';
import { authenticate } from '@/lib/firebase/admin';

// This endpoint deletes a post using the Admin SDK (bypassing Firestore security rules).
export async function POST(req) {
  try {
    await authenticate(req);

    const { postId } = await req.json();

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    await initializeFirebaseAdmin();
    const adminDb = admin.firestore();

    const postRef = adminDb.collection('wallPosts').doc(postId);
    await postRef.delete();

    return NextResponse.json({ message: 'Post deleted successfully' });

  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred' }, { status: error.code || 500 });
  }
}
