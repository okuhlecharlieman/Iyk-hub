
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase/firebase'; 
import { authenticate } from '../../../lib/firebase/admin/auth';

// This endpoint safely updates a user's profile.
// It is a protected route and will only update specific, allowed fields.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  let authUser;
  try {
    // Authenticate the user via their token. This returns the decoded token.
    authUser = await authenticate(req);
  } catch (error) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const { updates } = req.body;
    const uid = authUser.uid; // Get the UID from the authenticated user, not the request body

    if (!updates || typeof updates !== 'object') {
      return res.status(400).send('A valid updates object is required');
    }

    // Sanitize the updates to only allow specific, user-editable fields.
    const allowedUpdates = {};
    const editableFields = ['displayName', 'bio', 'skills'];

    editableFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
        // For skills, ensure it is an array of strings
        if (field === 'skills') {
          const skills = updates[field];
          if (Array.isArray(skills) && skills.every(s => typeof s === 'string')) {
            allowedUpdates[field] = skills;
          }
        } else {
          allowedUpdates[field] = updates[field];
        }
      }
    });

    if (Object.keys(allowedUpdates).length === 0) {
        return res.status(400).json({ error: 'No valid fields provided to update.' });
    }

    // Reference to the user's document.
    const userRef = doc(db, 'users', uid);

    // Update the document with the sanitized data.
    await updateDoc(userRef, allowedUpdates);

    res.status(200).json({ message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'An internal error occurred while updating the profile.' });
  }
}
