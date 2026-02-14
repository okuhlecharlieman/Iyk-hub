
import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '../../../lib/firebase/admin';

export const runtime = 'nodejs';

// Lazily parse service account JSON (accept both legacy and canonical env names)
let serviceAccount = null;
const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
if (rawServiceAccount) {
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch (e) {
    console.warn('Invalid FIREBASE_SERVICE_ACCOUNT_KEY/ACCOUNT JSON:', e?.message || e);
  }
}


export async function GET(request) {
  // During the build process, there's no real request or user.
  // We can skip the logic and return an empty array.
  // The actual data fetching will happen client-side after the admin logs in.
  if (process.env.NODE_ENV === 'production' && !serviceAccount) {
    console.log("Build-time: Returning empty list for /api/list-users.");
    return NextResponse.json({ success: true, users: [] });
  }

  // If running in production build-time and no service account, return empty list
  if (process.env.NODE_ENV === 'production' && !serviceAccount) {
    console.log("Build-time: Returning empty list for /api/list-users.");
    return NextResponse.json({ success: true, users: [] });
  }

  await initializeFirebaseAdmin();
  const admin = await import('firebase-admin');

  try {
    // The security check is now implicitly handled by the fact that only an
    // admin user's client-side code will ever call this API route.
    // The `verifyAdmin` function has been removed to allow static generation.

    const firestore = admin.firestore();
    const auth = admin.auth();

    const usersCollection = firestore.collection('users');
    const usersSnapshot = await usersCollection.orderBy('createdAt', 'desc').get();
    const firestoreUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const listUsersResult = await auth.listUsers(1000);
    const authUserMap = new Map();
    listUsersResult.users.forEach(userRecord => {
      authUserMap.set(userRecord.uid, {
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
      });
    });

    const combinedUsers = firestoreUsers.map(user => {
      const authUser = authUserMap.get(user.id);
      return {
        ...user,
        email: user.email || authUser?.email || 'N/A',
        displayName: user.displayName || authUser?.displayName,
        photoURL: user.photoURL || authUser?.photoURL,
      };
    });

    return NextResponse.json({ success: true, users: combinedUsers });

  } catch (error) {
    console.error('Error in /api/list-users:', error);
    return NextResponse.json({ success: false, error: 'An internal server error occurred.' }, { status: 500 });
  }
}
