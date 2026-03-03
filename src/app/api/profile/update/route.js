import { NextResponse } from 'next/server';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/firebase';
import { authenticateAndGetUid } from '@/lib/firebase/admin/auth';

// This endpoint safely updates a user's profile, converted to the App Router format.
export async function POST(req) {
  let uid;
  try {
    // Authenticate the user and get their UID.
    uid = await authenticateAndGetUid(req);
    if (!uid) {
        // This case should ideally not be hit if authenticateAndGetUid throws on failure.
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 401 });
  }

  try {
    const { updates } = await req.json();

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'A valid updates object is required' }, { status: 400 });
    }

    // Sanitize the updates to only allow specific, user-editable fields.
    const allowedUpdates = {};
    const editableFields = ['displayName', 'bio', 'skills'];

    editableFields.forEach(field => {
      if (Object.prototype.hasOwnProperty.call(updates, field)) {
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
        return NextResponse.json({ error: 'No valid fields provided to update.' }, { status: 400 });
    }

    // Use the authenticated UID for the document reference.
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, allowedUpdates);

    return NextResponse.json({ message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'An internal error occurred while updating the profile.' }, { status: 500 });
  }
}
