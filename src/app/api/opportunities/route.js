import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../lib/api/rate-limit';

export const runtime = 'nodejs';

const MAX_LIMIT = 30;

const getRoleForUid = async (uid) => {
  const userDoc = await admin.firestore().collection('users').doc(uid).get();
  if (!userDoc.exists) return 'user';
  return userDoc.data()?.role || 'user';
};

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'opportunities:get', limit: 90, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    const role = await getRoleForUid(uid);

    const { searchParams } = new URL(request.url);
    const rawLimit = Number.parseInt(searchParams.get('limit') || '12', 10);
    const limitN = Math.min(Math.max(Number.isNaN(rawLimit) ? 12 : rawLimit, 1), MAX_LIMIT);
    let cursor = searchParams.get('cursor');

    const db = admin.firestore();

    if (role === 'admin') {
      let queryRef = db.collection('opportunities').orderBy('createdAt', 'desc').limit(limitN);

      if (cursor) {
        const cursorSnap = await db.collection('opportunities').doc(cursor).get();
        if (cursorSnap.exists) {
          queryRef = db.collection('opportunities').orderBy('createdAt', 'desc').startAfter(cursorSnap).limit(limitN);
        }
      }

      const snap = await queryRef.get();
      const opportunities = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const lastDoc = snap.docs[snap.docs.length - 1];
      const nextCursor = snap.docs.length === limitN ? lastDoc.id : null;

      return NextResponse.json({ opportunities, nextCursor });
    }

    const collected = [];
    const pageBatch = Math.min(limitN * 3, 100);
    let exhausted = false;

    while (collected.length < limitN && !exhausted) {
      let queryRef = db
        .collection('opportunities')
        .where('status', 'in', ['approved', 'pending'])
        .orderBy('createdAt', 'desc')
        .limit(pageBatch);

      if (cursor) {
        const cursorSnap = await db.collection('opportunities').doc(cursor).get();
        if (cursorSnap.exists) {
          queryRef = db
            .collection('opportunities')
            .where('status', 'in', ['approved', 'pending'])
            .orderBy('createdAt', 'desc')
            .startAfter(cursorSnap)
            .limit(pageBatch);
        }
      }

      const snap = await queryRef.get();
      if (snap.empty) {
        exhausted = true;
        break;
      }

      const visible = snap.docs.filter((doc) => {
        const data = doc.data();
        return (data.status === 'approved' && (!data.moderationStatus || data.moderationStatus === 'approved')) || data.ownerId === uid;
      });

      collected.push(...visible.map((doc) => ({ id: doc.id, ...doc.data() })));

      const lastDoc = snap.docs[snap.docs.length - 1];
      cursor = lastDoc?.id || null;
      if (snap.docs.length < pageBatch) {
        exhausted = true;
      }
    }

    const opportunities = collected.slice(0, limitN);
    const nextCursor = exhausted ? null : cursor;

    return NextResponse.json({ opportunities, nextCursor });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/opportunities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
