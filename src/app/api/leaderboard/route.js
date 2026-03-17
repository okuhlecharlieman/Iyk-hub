import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../lib/api/rate-limit';

export const runtime = 'nodejs';

let serviceAccount = null;
const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
if (rawServiceAccount) {
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch (e) {
    console.warn('Invalid FIREBASE_SERVICE_ACCOUNT env JSON:', e?.message || e);
  }
}

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'leaderboard:get', limit: 120, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  if (process.env.NODE_ENV === 'production' && !serviceAccount) {
    return NextResponse.json({ success: true, users: [], nextCursor: null });
  }

  const url = new URL(request.url);
  const rawLimit = Number.parseInt(url.searchParams.get('limit') || '10', 10);
  const filter = url.searchParams.get('filter') === 'weekly' ? 'weekly' : 'lifetime';
  const cursor = url.searchParams.get('cursor');
  const limitN = Math.min(Math.max(Number.isNaN(rawLimit) ? 10 : rawLimit, 1), 100);

  try {
    await initializeFirebaseAdmin();
    const admin = await import('firebase-admin');
    const firestore = admin.firestore();

    const orderByField = `points.${filter}`;
    let queryRef = firestore.collection('users').orderBy(orderByField, 'desc').limit(limitN);

    if (cursor) {
      const cursorSnap = await firestore.collection('users').doc(cursor).get();
      if (cursorSnap.exists) {
        queryRef = firestore.collection('users').orderBy(orderByField, 'desc').startAfter(cursorSnap).limit(limitN);
      }
    }

    const snap = await queryRef.get();

    const users = snap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        displayName: d.displayName || null,
        photoURL: d.photoURL || null,
        points: d.points || { weekly: 0, lifetime: 0 },
      };
    });

    const lastDoc = snap.docs[snap.docs.length - 1];
    const nextCursor = snap.docs.length === limitN ? lastDoc.id : null;

    return NextResponse.json({ success: true, users, nextCursor });
  } catch (err) {
    console.error('Error in /api/leaderboard:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
