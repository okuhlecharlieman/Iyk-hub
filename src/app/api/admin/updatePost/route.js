import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '@/lib/firebase/admin';
import { authenticate } from '@/lib/firebase/admin';

// This endpoint safely updates a post using the Admin SDK (so it bypasses Firestore security rules).
export async function POST(req) {
  try {
    // Authenticate the user as an admin.
    await authenticate(req);

    const { postId, updates } = await req.json();

    if (!postId || !updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'Post ID and a valid updates object are required' }, { status: 400 });
    }

    // Sanitize the updates to only allow specific, editable fields.
    const allowedUpdates = {};
    const editableFields = ['title', 'description', 'link', 'mediaUrl', 'type'];

    editableFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        allowedUpdates[field] = updates[field];
      }
    });

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided to update.' }, { status: 400 });
    }

    await initializeFirebaseAdmin();
    const adminDb = admin.firestore();

    const postRef = adminDb.collection('wallPosts').doc(postId);
    await postRef.update({ ...allowedUpdates, updatedAt: admin.firestore.FieldValue.serverTimestamp() });

    return NextResponse.json({ message: 'Post updated successfully' });

  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred' }, { status: error.code || 500 });
  }
}
