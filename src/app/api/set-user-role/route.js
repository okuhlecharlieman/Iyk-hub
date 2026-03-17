import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../lib/firebase/admin';

export async function POST(req) {
  try {
    await initializeFirebaseAdmin();
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK:', err);
    return NextResponse.json({ error: 'Server failed to initialize Firebase Admin SDK.' }, { status: 500 });
  }

  try {
    await authenticate(req);

    const { uid, role } = await req.json();

    if (!uid || !role || !['admin', 'user'].includes(role)) {
      return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
    }

    const adminDb = admin.firestore();

    // Ensure target user exists in Auth (gives clearer error if missing)
    try {
      await admin.auth().getUser(uid);
    } catch {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    await admin.auth().setCustomUserClaims(uid, { role });
    await admin.firestore().collection('users').doc(uid).set({ role }, { merge: true });

    let targetDisplayName = null;
    try {
      const authUser = await admin.auth().getUser(uid);
      targetDisplayName = authUser.displayName || null;
    } catch {
      // ignore - we already validated existence earlier
    }

    return NextResponse.json({
      message: `Successfully set role to ${role} for user ${targetDisplayName || uid}`,
      targetDisplayName,
    });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error setting user role:', error?.message || error);
    const msg = (error && String(error.message || error)).slice(0, 1000);
    if (msg.includes('FIREBASE_SERVICE_ACCOUNT_KEY') || msg.toLowerCase().includes('failed to initialize')) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    return NextResponse.json({ error: 'Unable to change role. Check server logs or ensure FIREBASE_SERVICE_ACCOUNT_KEY is configured.' }, { status: 500 });
  }
}
