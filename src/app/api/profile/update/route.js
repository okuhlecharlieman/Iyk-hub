import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '@/lib/firebase/admin';
import { sanitizeProfileUpdates } from '@/lib/server/validation';

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

    const allowedUpdates = sanitized.data;

    const userRef = admin.firestore().collection('users').doc(uid);
    await userRef.set(allowedUpdates, { merge: true });

    return NextResponse.json({ message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'An internal error occurred while updating the profile.' }, { status: 500 });
  }
}
