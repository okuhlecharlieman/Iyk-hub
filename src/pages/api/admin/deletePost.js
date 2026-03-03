import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/firebase';
import { authenticate } from '../../../lib/firebase/admin/auth';

// This endpoint deletes a post from the `wallPosts` collection.
// It is protected and can only be accessed by an authenticated admin.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Authenticate the user as an admin.
    // The `authenticate` function will throw an error if the user is not an admin.
    await authenticate(req);

    const { postId } = req.body;

    if (!postId) {
      return res.status(400).send('Post ID is required');
    }

    // Get a reference to the post document.
    const postRef = doc(db, 'wallPosts', postId);

    // Delete the document.
    await deleteDoc(postRef);

    // Send a success response.
    res.status(200).json({ message: 'Post deleted successfully' });

  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(error.code || 500).json({ error: error.message || 'An unknown error occurred' });
  }
}
