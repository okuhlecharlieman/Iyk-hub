/**
 * API route handler for /api/leaderboard.
 */
import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../lib/api/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let serviceAccount = null;
const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
if (rawServiceAccount) {
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch (e) {
    console.warn('Invalid FIREBASE_SERVICE_ACCOUNT env JSON:', e?.message || e);
  }
}

/** Handles GET requests to /api/leaderboard. */
export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'leaderboard:get', limit: 120, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;
  // During build-time or environments without a service account, return empty list
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
    const { getCreatorBoostPlan } = await import('../../../lib/monetization/creator-boosts');

    const EXCLUDED_STATUSES = new Set(['suspended', 'pending_deletion', 'purged']);

    const users = snap.docs
      .filter((doc) => {
        const status = doc.data().accountStatus;
        return !status || !EXCLUDED_STATUSES.has(status);
      })
      .map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          displayName: d.displayName || null,
          photoURL: d.photoURL || null,
          points: d.points || { weekly: 0, lifetime: 0 },
          accentColor: (d.activeBoost?.tier === 'ULTRA') ? (d.accentColor || null) : null,
          activeBoost: d.activeBoost ? {
            badge: d.activeBoost.badge || null,
            badgeLabel: d.activeBoost.badgeLabel || null,
            tier: d.activeBoost.tier || null,
          } : null,
        };
      });

    // Fetch active boosts for users that don't have activeBoost cached on doc
    const uidsWithoutBoost = users.filter(u => !u.activeBoost).map(u => u.id);
    if (uidsWithoutBoost.length > 0) {
      const now = new Date();
      const boostMap = {};
      // Query in chunks of 10 for Firestore 'in' limit
      for (let i = 0; i < uidsWithoutBoost.length; i += 10) {
        const chunk = uidsWithoutBoost.slice(i, i + 10);
        try {
          const boostSnap = await firestore
            .collection('creatorBoostOrders')
            .where('ownerUid', 'in', chunk)
            .where('activationStatus', '==', 'active')
            .get();
          boostSnap.forEach((bDoc) => {
            const bData = bDoc.data();
            const expiresAt = bData.expiresAt?.toDate ? bData.expiresAt.toDate() : null;
            if (!expiresAt || expiresAt > now) {
              const plan = getCreatorBoostPlan(bData.plan);
              if (plan && !boostMap[bData.ownerUid]) {
                boostMap[bData.ownerUid] = {
                  badge: plan.badge || null,
                  badgeLabel: plan.badgeLabel || null,
                  tier: bData.plan?.toUpperCase() || null,
                };
              }
            }
          });
        } catch {}
      }
      users.forEach(u => {
        if (!u.activeBoost && boostMap[u.id]) {
          u.activeBoost = boostMap[u.id];
        }
      });
    }

    const lastDoc = snap.docs[snap.docs.length - 1];
    const nextCursor = snap.docs.length === limitN ? lastDoc.id : null;

    return NextResponse.json({ success: true, users, nextCursor });
  } catch (err) {
    console.error('Error in /api/leaderboard:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
