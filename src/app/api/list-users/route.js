
import { NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// This should be configured with your service account credentials in your hosting environment
if (!admin.apps.length) {
  try {
    // Check if the service account JSON is provided as an environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        });
    } else {
        // Fallback for environments where application default credentials are set up
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
            databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
        });
    }
  } catch (e) {
    console.error('Firebase admin initialization error', e.stack);
  }
}

/**
 * Verifies the user's ID token and checks if they are an admin.
 * @param {Request} request The incoming request object.
 */
async function verifyAdmin(request) {
    const idToken = request.headers.get('authorization')?.split('Bearer ')[1];
    if (!idToken) {
        throw new Error('Unauthorized: No token provided.');
    }
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const userDoc = await admin.firestore().collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'admin') {
        throw new Error('Forbidden: User is not an admin.');
    }
}

export async function GET(request) {
  try {
    // Security Check: Ensure the request comes from an authenticated admin user.
    await verifyAdmin(request);

    const firestore = admin.firestore();
    const auth = admin.auth();

    // 1. Get all users from Firestore
    const usersCollection = firestore.collection('users');
    const usersSnapshot = await usersCollection.orderBy('createdAt', 'desc').get();
    const firestoreUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 2. Get all users from Firebase Auth to create an email/data map
    const listUsersResult = await auth.listUsers(1000); // Note: Paginate if you have more users
    const authUserMap = new Map();
    listUsersResult.users.forEach(userRecord => {
      authUserMap.set(userRecord.uid, {
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
      });
    });

    // 3. Merge Firestore data with Auth data, ensuring key fields are always present.
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
    if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }
    return NextResponse.json({ success: false, error: 'An internal server error occurred.' }, { status: 500 });
  }
}

