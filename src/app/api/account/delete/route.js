import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';

export async function DELETE(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'account:delete', limit: 5, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const db = admin.firestore();

    // Mark user doc as deleted (soft delete)
    await db.collection('users').doc(uid).set({
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      displayName: 'Deleted User',
      bio: '',
      skills: [],
      photoURL: null,
      email: null,
    }, { merge: true });

    // Delete Firebase Auth user
    try {
      await admin.auth().deleteUser(uid);
    } catch (authErr) {
      console.error('Error deleting auth user:', authErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
