import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

// This endpoint safely updates a user's profile.
export async function POST(req) {
  let uid;
  try {
    uid = await authenticateAndGetUid(req);
    if (!uid) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Authentication failed' }, { status: 401 });
  }

  try {
    await initializeFirebaseAdmin();
    const { updates } = await req.json();

    const sanitized = sanitizeProfileUpdates(updates);
    if (!sanitized.ok) {
      return NextResponse.json({ error: sanitized.error }, { status: sanitized.status || 400 });
    }

    // Sanitize updates to only allow specific user-editable fields.
    const allowedUpdates = {};
    const editableFields = ['displayName', 'bio', 'skills'];

    editableFields.forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(updates, field)) return;

      if (field === 'skills') {
        const skills = updates[field];
        if (Array.isArray(skills) && skills.every((s) => typeof s === 'string')) {
          allowedUpdates[field] = skills.slice(0, 50);
        }
        return;
      }

      if (typeof updates[field] === 'string') {
        allowedUpdates[field] = updates[field].trim();
      }
    });

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields provided to update.' }, { status: 400 });
    }

    const userRef = admin.firestore().collection('users').doc(uid);
    await userRef.set(allowedUpdates, { merge: true });

    return NextResponse.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'An internal error occurred while updating the profile.' }, { status: 500 });
  }
}
