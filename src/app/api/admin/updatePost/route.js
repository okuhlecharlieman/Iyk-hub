import { NextResponse } from 'next/server';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { authenticate } from '@/lib/firebase/admin/auth';

// This endpoint safely updates a post, converted to the App Router format.
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

    allowedUpdates.updatedAt = serverTimestamp();

    const postRef = doc(db, 'wallPosts', postId);
    await updateDoc(postRef, allowedUpdates);

    return NextResponse.json({ message: 'Post updated successfully' });

  } catch (error) {
    console.error('Error updating post:', error);
    // Return a generic error message to the client
    return NextResponse.json({ error: error.message || 'An unknown error occurred' }, { status: error.code || 500 });
  }
}
