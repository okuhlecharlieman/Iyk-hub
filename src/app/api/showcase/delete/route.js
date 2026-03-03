import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import admin from 'firebase-admin';

export const runtime = 'nodejs';

// This endpoint allows an authenticated user to delete their OWN post.
export async function POST(request) {
  try {
    await initializeFirebaseAdmin();
    const { postId, uid } = await request.json(); // uid is the currently logged-in user

    if (!uid) {
        return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    const db = admin.firestore();
    const postRef = db.collection('wallPosts').doc(postId);
    const postDoc = await postRef.get();

    if (!postDoc.exists) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const postData = postDoc.data();

    // Security Check: Ensure the user owns the post
    if (postData.uid !== uid) {
      return NextResponse.json({ error: 'Unauthorized to delete this post' }, { status: 403 });
    }

    // Delete the post
    await postRef.delete();

    return NextResponse.json({ message: 'Post deleted successfully' });

  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
