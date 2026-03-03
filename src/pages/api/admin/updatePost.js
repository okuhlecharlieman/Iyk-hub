
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../lib/firebase/firebase'; // Check path if issues arise
import { authenticate } from '../../../lib/firebase/admin/auth';

// This endpoint safely updates a post in the `wallPosts` collection.
// It is a protected route, can only be accessed by an authenticated admin,
// and will only update specific, allowed fields.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // Authenticate the user as an admin. This will throw if they are not.
    await authenticate(req);

    const { postId, updates } = req.body;

    if (!postId || !updates || typeof updates !== 'object') {
      return res.status(400).send('Post ID and a valid updates object are required');
    }

    // Sanitize the updates to only allow specific, editable fields.
    // This prevents accidentally overwriting immutable data like `uid` or `createdAt`.
    const allowedUpdates = {};
    const editableFields = ['title', 'description', 'link', 'mediaUrl', 'type'];

    editableFields.forEach(field => {
      // Check if the field exists in the incoming updates (even if it's null)
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        allowedUpdates[field] = updates[field];
      }
    });

    // If no valid fields were provided for updating, there's nothing to do.
    if (Object.keys(allowedUpdates).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided to update.' });
    }

    // Add the server-side timestamp for the update.
    allowedUpdates.updatedAt = serverTimestamp();

    // Reference to the post document.
    const postRef = doc(db, 'wallPosts', postId);

    // Update the document with the sanitized data.
    await updateDoc(postRef, allowedUpdates);

    res.status(200).json({ message: 'Post updated successfully' });

  } catch (error) {
    console.error('Error updating post:', error);
    res.status(error.code || 500).json({ error: error.message || 'An unknown error occurred' });
  }
}
