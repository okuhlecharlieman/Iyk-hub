import { NextResponse } from 'next/server';
import { authenticate, initializeFirebaseAdmin } from '../../../lib/firebase/admin';

export const runtime = 'nodejs';

let serviceAccount = null;
const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
if (rawServiceAccount) {
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch (e) {
    console.warn('Invalid FIREBASE_SERVICE_ACCOUNT_KEY/ACCOUNT JSON:', e?.message || e);
  }
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : null;
}

function serializeTimestamp(value) {
  if (value && typeof value.toDate === 'function') {
    return value.toDate().toISOString();
  }
  return value || null;
}

function toAuthUserRecord(userRecord) {
  return {
    uid: userRecord.uid,
    email: userRecord.email || null,
    displayName: userRecord.displayName || null,
    photoURL: userRecord.photoURL || null,
  };
}


export async function GET(request) {
    if (process.env.NODE_ENV === 'production' && !serviceAccount) {
        console.log("Build-time: Returning empty list for /api/list-users.");
        return NextResponse.json({ success: true, users: [] });
    }
  try {
    // Explicit server-side authorization to prevent data exposure.
    await authenticate(request);
    await initializeFirebaseAdmin();
    const admin = await import('firebase-admin');

    const firestore = admin.firestore();
    const auth = admin.auth();

    const usersSnapshot = await firestore.collection('users').orderBy('createdAt', 'desc').get();
    const firestoreUsers = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const allAuthUsers = await listAllAuthUsers(auth);
    const authUserMap = new Map();
    const authUserByEmailMap = new Map();
    listUsersResult.users.forEach(userRecord => {
      authUserMap.set(userRecord.uid, {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
      });

      if (userRecord.email) {
        authUserByEmailMap.set(userRecord.email.toLowerCase(), {
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          photoURL: userRecord.photoURL,
        });
      }
    });

    const combinedUsers = firestoreUsers.map(user => {
      const authUser =
        authUserMap.get(user.id) ||
        (user.email ? authUserByEmailMap.get(user.email.toLowerCase()) : null);
      return {
        id: user.id,
        email: user.email || authUser?.email || 'N/A',
        displayName: user.displayName || authUser?.displayName || null,
        photoURL: user.photoURL || authUser?.photoURL || null,
        role: user.role || 'user',
        points: user.points || { weekly: 0, lifetime: 0 },
        createdAt: user.createdAt ? serializeTimestamp(user.createdAt) : null,
        authExists: !!authUser,
      };
    });

    return NextResponse.json({ success: true, users: combinedUsers });
  } catch (error) {
    console.error('Error in /api/list-users:', error);
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.code });
    }
    return NextResponse.json({ success: false, error: 'An internal server error occurred.' }, { status: 500 });
  }
}
