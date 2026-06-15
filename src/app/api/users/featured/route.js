/**
 * API route handler for /api/users/featured.
 */

import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
export const dynamic = 'force-dynamic';

/** Handles GET requests to /api/users/featured. */
export async function GET() {
  try {
    await initializeFirebaseAdmin();
    const db = admin.firestore();

    const usersRef = db.collection('users');
    let snapshot;
    try {
      snapshot = await usersRef.where('activeBoost.tier', '==', 'ULTRA').limit(20).get();
    } catch (queryErr) {
      // If query fails (e.g. index issue), try querying active boosts from orders
      const boostSnap = await db.collection('creatorBoostOrders')
        .where('activationStatus', '==', 'active')
        .limit(20)
        .get();

      const now = new Date();
      const userIds = [];
      boostSnap.forEach(d => {
        const data = d.data();
        const plan = data.plan?.toLowerCase();
        const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : data.expiresAt ? new Date(data.expiresAt) : null;
        if (plan === 'ultra' && (!expiresAt || expiresAt > now)) {
          userIds.push(data.ownerUid);
        }
      });

      const featuredUsers = [];
      for (const uid of [...new Set(userIds)].slice(0, 20)) {
        try {
          const userDoc = await db.collection('users').doc(uid).get();
          if (userDoc.exists) {
            const data = userDoc.data();
            featuredUsers.push({ uid, displayName: data.displayName, photoURL: data.photoURL, bio: data.bio, boostBadge: data.activeBoost ? { badge: data.activeBoost.badge, badgeLabel: data.activeBoost.badgeLabel } : null });
          }
        } catch {}
      }
      return NextResponse.json({ featuredUsers });
    }

    if (snapshot.empty) {
      return NextResponse.json({ featuredUsers: [] });
    }

    const now = new Date();
    const featuredUsers = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        const expiresAt = data.activeBoost?.expiresAt?.toDate ? data.activeBoost.expiresAt.toDate() : data.activeBoost?.expiresAt ? new Date(data.activeBoost.expiresAt) : null;
        if (!expiresAt || expiresAt > now) {
          featuredUsers.push({ 
              uid: doc.id,
              displayName: data.displayName,
              photoURL: data.photoURL,
              bio: data.bio,
              boostBadge: data.activeBoost ? { badge: data.activeBoost.badge, badgeLabel: data.activeBoost.badgeLabel } : null
          });
        }
    });

    return NextResponse.json({ featuredUsers });

  } catch (error) {
    console.error('Error fetching featured users:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
