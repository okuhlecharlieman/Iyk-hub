
import { NextResponse } from 'next/server';
import { authenticate, initializeFirebaseAdmin } from '../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../lib/api/rate-limit';

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
    const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'list-users:get', limit: 30, windowMs: 60 * 1000 });
    if (rateLimitResponse) return rateLimitResponse;

    if (process.env.NODE_ENV === 'production' && !serviceAccount) {
        console.log("Build-time: Returning empty list for /api/list-users.");
        return NextResponse.json({ success: true, users: [], nextCursor: null });
    }

  try {
    // Explicit server-side authorization to prevent data exposure.
    await authenticate(request);
    await initializeFirebaseAdmin();
    const admin = await import('firebase-admin');

    const firestore = admin.firestore();
    const auth = admin.auth();

    const { searchParams } = new URL(request.url);
    const rawLimit = Number.parseInt(searchParams.get('limit') || '50', 10);
    const limitN = Math.min(Math.max(Number.isNaN(rawLimit) ? 50 : rawLimit, 1), 200);
    const cursor = searchParams.get('cursor');

    let queryRef = firestore.collection('users').orderBy('createdAt', 'desc').limit(limitN);
    if (cursor) {
      const cursorSnap = await firestore.collection('users').doc(cursor).get();
      if (cursorSnap.exists) {
        queryRef = queryRef.startAfter(cursorSnap);
      }
    }

    const usersSnapshot = await queryRef.get();
    const firestoreUsers = usersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const uids = firestoreUsers.map((u) => u.id).filter(Boolean);
    const authUsersById = new Map();
    const authUsersByEmail = new Map();

    if (uids.length > 0) {
      const batches = [];
      for (let i = 0; i < uids.length; i += 100) {
        batches.push(uids.slice(i, i + 100));
      }
      for (const batch of batches) {
        const result = await auth.getUsers(batch.map((uid) => ({ uid })));
        result.users.forEach((userRecord) => {
          const authRecord = toAuthUserRecord(userRecord);
          authUsersById.set(userRecord.uid, authRecord);
          if (authRecord.email) {
            authUsersByEmail.set(authRecord.email.toLowerCase(), authRecord);
          }
        });
      }
    }

    const combinedUsers = firestoreUsers.map((user) => {
      const authUser =
        authUsersById.get(user.id) ||
        (user.email ? authUsersByEmail.get(user.email.toLowerCase()) : null);
      const uid = authUser?.uid || user.id;

      return {
        id: user.id,
        uid,
        authUid: authUser?.uid || null,
        email: normalizeEmail(user.email) || normalizeEmail(authUser?.email),
        displayName: user.displayName || authUser?.displayName || null,
        photoURL: user.photoURL || authUser?.photoURL || null,
        role: user.role || 'user',
        points: user.points || { weekly: 0, lifetime: 0 },
        createdAt: user.createdAt ? serializeTimestamp(user.createdAt) : null,
      };
    });

    const lastDoc = usersSnapshot.docs[usersSnapshot.docs.length - 1];
    const nextCursor = usersSnapshot.docs.length === limitN ? lastDoc.id : null;

    return NextResponse.json({ success: true, users: combinedUsers, nextCursor });
  } catch (error) {
    console.error('Error in /api/list-users:', error);
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.code });
    }
    return NextResponse.json({ success: false, error: 'An internal server error occurred.' }, { status: 500 });
  }
}
