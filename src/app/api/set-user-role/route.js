
import { NextResponse } from "next/server";
import { initializeFirebaseAdmin } from "../../../lib/firebase/admin";

export const runtime = 'nodejs';

export async function POST(req) {
  await initializeFirebaseAdmin();
  const admin = await import('firebase-admin');

  const { uid, role } = await req.json();

  const idToken = req.headers.get("authorization")?.split("Bearer ")[1];

  if (!idToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const callerUid = decodedToken.uid;

    // Verify caller is an admin by checking the Firestore `users` doc
    const adminDb = admin.firestore();
    const callerDoc = await adminDb.collection('users').doc(callerUid).get();
    if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Set custom claim for the target user
    await admin.auth().setCustomUserClaims(uid, { role });

    // Also update the Firestore user document so UI / rules remain consistent
    await adminDb.collection('users').doc(uid).set({ role }, { merge: true });

    return NextResponse.json({ message: `Successfully set role to ${role} for user ${uid}` });
  } catch (error) {
    console.error('Error setting user role:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
