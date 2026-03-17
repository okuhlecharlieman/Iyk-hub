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

function isAuthStatusCode(code) {
  return code === 401 || code === 403;
}

async function listAllAuthUsers(auth) {
  const users = [];
  let pageToken;

  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);

  return users;
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

    const allAuthUsers = await listAllAuthUsers(auth);
    const authUserMap = new Map();
    const authUserByEmailMap = new Map();

    allAuthUsers.forEach((userRecord) => {
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

    const statusCode = error && typeof error.code === 'number' ? error.code : null;
    if (isAuthStatusCode(statusCode)) {
      const message = error && error.message ? error.message : 'Not authorized';
      return NextResponse.json({ success: false, error: message }, { status: statusCode });
    }

    return NextResponse.json({ success: false, error: 'An internal server error occurred.' }, { status: 500 });
  }
}
