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

    // Only load approved opportunities in the main paged query.
    // For non-admins, also include the user's own pending opportunities (first page only).
    const approvedQuery = db
      .collection('opportunities')
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(limitN);

    let queryRef = approvedQuery;
    if (cursor) {
      const cursorSnap = await db.collection('opportunities').doc(cursor).get();
      if (cursorSnap.exists) {
        queryRef = approvedQuery.startAfter(cursorSnap);
      }
    }

    const approvedSnap = await queryRef.get();
    const approvedOpportunities = approvedSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    let opportunities = approvedOpportunities;

    // Include the user's own pending opportunities on the first page only.
    if (!cursor) {
      const pendingSnap = await db
        .collection('opportunities')
        .where('ownerId', '==', uid)
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .get();

      const pendingOpportunities = pendingSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      // Merge and de-dupe, keeping newest by createdAt.
      const combined = [...pendingOpportunities, ...approvedOpportunities];
      const seen = new Set();
      opportunities = combined
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return bTime - aTime;
        })
        .filter((item) => {
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        })
        .slice(0, limitN);
    }

    const lastDoc = approvedSnap.docs[approvedSnap.docs.length - 1];
    const nextCursor = approvedSnap.docs.length === limitN ? lastDoc.id : null;

    return NextResponse.json({ opportunities, nextCursor });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/opportunities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
