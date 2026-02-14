
import { NextResponse } from "next/server";
import { initializeFirebaseAdmin } from "../../../lib/firebase/admin";

export const runtime = 'nodejs';

export async function POST(req) {
  // Fail-fast with an explicit error when server-side credential is missing.
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!rawServiceAccount) {
    console.error('Attempt to change roles but FIREBASE_SERVICE_ACCOUNT_KEY is not set.');
    return NextResponse.json({ error: 'Server not configured for role changes (missing service account).' }, { status: 500 });
  }

  try {
    await initializeFirebaseAdmin();
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK:', err);
    return NextResponse.json({ error: 'Server failed to initialize Firebase Admin SDK.' }, { status: 500 });
  }

  const admin = await import('firebase-admin');
  const { uid, role } = await req.json();
  const idToken = req.headers.get('authorization')?.split('Bearer ')[1];

  if (!idToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!uid || !role || !['admin', 'user'].includes(role)) {
    return NextResponse.json({ error: 'Invalid request payload' }, { status: 400 });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const callerUid = decodedToken.uid;

    const adminDb = admin.firestore();
    const callerDocSnap = await adminDb.collection('users').doc(callerUid).get();

    if (!callerDocSnap.exists || callerDocSnap.data().role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Ensure target user exists in Auth (gives clearer error if missing)
    try {
      await admin.auth().getUser(uid);
    } catch (e) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
    }

    // Set custom claim and mirror the role to Firestore
    await admin.auth().setCustomUserClaims(uid, { role });
    await adminDb.collection('users').doc(uid).set({ role }, { merge: true });

    return NextResponse.json({ message: `Successfully set role to ${role} for user ${uid}` });
  } catch (error) {
    console.error('Error setting user role:', error?.message || error);
    // If the error looks like a service-account / init error, return it so deploy/env can be fixed quickly.
    const msg = (error && String(error.message || error)).slice(0, 1000);
    if (msg.includes('FIREBASE_SERVICE_ACCOUNT_KEY') || msg.toLowerCase().includes('failed to initialize')) {
      return NextResponse.json({ error: msg }, { status: 500 });
    }
    return NextResponse.json({ error: 'Unable to change role. Check server logs or ensure FIREBASE_SERVICE_ACCOUNT_KEY is configured.' }, { status: 500 });
  }
}
