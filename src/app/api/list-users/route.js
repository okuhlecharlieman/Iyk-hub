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
    console.log('Build-time: Returning empty list for /api/list-users.');
    return NextResponse.json({ success: true, users: [] });
  }

  try {
    await authenticate(request);
    await initializeFirebaseAdmin();
    const admin = await import('firebase-admin');

    const firestore = admin.firestore();
    const auth = admin.auth();

    const usersSnapshot = await firestore.collection('users').orderBy('createdAt', 'desc').get();
    const firestoreUsers = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const listUsersResult = await auth.listUsers(1000);
    const authUserMap = new Map();
    const authUserByEmailMap = new Map();

    listUsersResult.users.forEach((userRecord) => {
      const normalized = toAuthUserRecord(userRecord);
      authUserMap.set(normalized.uid, normalized);

      const emailKey = normalizeEmail(normalized.email);
      if (emailKey) {
        authUserByEmailMap.set(emailKey, normalized);
      }
    });

    const combinedUsers = firestoreUsers.map((user) => {
      const emailKey = normalizeEmail(user.email);
      const authUser =
        authUserMap.get(user.authUid) ||
        authUserMap.get(user.uid) ||
        authUserMap.get(user.id) ||
        (emailKey ? authUserByEmailMap.get(emailKey) : null);

      const resolvedUid = authUser?.uid || user.authUid || user.uid || user.id;

      return {
        id: user.id,
        uid: resolvedUid,
        authUid: authUser?.uid || user.authUid || null,
        firestoreUid: user.uid || null,
        email: user.email || authUser?.email || 'N/A',
        displayName: user.displayName || authUser?.displayName || null,
        photoURL: user.photoURL || authUser?.photoURL || null,
        role: user.role || 'user',
        points: user.points || { weekly: 0, lifetime: 0 },
        createdAt: serializeTimestamp(user.createdAt),
        authExists: Boolean(authUser || user.authUid),
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
