import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';

export const runtime = 'nodejs';

export async function POST(request) {
  await initializeFirebaseAdmin();
  const admin = await import('firebase-admin');
  try {
    const { postId, uid } = await request.json();

    // 1. Verify the user is an admin
    const userRecord = await admin.auth().getUser(uid);
    if (userRecord.customClaims?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Delete the post from Firestore
    await admin.firestore().collection('wallPosts').doc(postId).delete();

    return NextResponse.json({ message: 'Post deleted successfully' });

  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
