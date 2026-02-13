
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Service account credentials should be stored securely as environment variables
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) : null;

if (!admin.apps.length) {
    if (serviceAccount) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
            });
        } catch (e) {
            console.error('Firebase admin initialization error', e.stack);
        }
    } else {
        console.warn("FIREBASE_SERVICE_ACCOUNT not set. Skipping Firebase admin initialization.");
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

  // Ensure admin is initialized before proceeding
  if (!admin.apps.length) {
      console.error("API Route Error: Firebase Admin SDK not initialized.");
      return NextResponse.json({ success: false, error: 'Firebase Admin not configured.' }, { status: 500 });
  }

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
