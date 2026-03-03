import { NextResponse } from 'next/server';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { authenticate } from '@/lib/firebase/admin/auth';

// This endpoint deletes a post, converted to the App Router format.
export async function POST(req) {
  try {
    // Authenticate the user as an admin.
    // The `authenticate` function is assumed to work with the standard Request object.
    await authenticate(req);

    // Get the post ID from the request body.
    const { postId } = await req.json();

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Get a reference to and delete the post document.
    const postRef = doc(db, 'wallPosts', postId);
    await deleteDoc(postRef);

    // Send a success response.
    return NextResponse.json({ message: 'Post deleted successfully' });

  } catch (error) {
    console.error('Error deleting post:', error);
    // The custom error from authenticate might have a code.
    return NextResponse.json({ error: error.message || 'An unknown error occurred' }, { status: error.code || 500 });
  }
}
