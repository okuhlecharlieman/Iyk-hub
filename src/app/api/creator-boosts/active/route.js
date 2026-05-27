import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { getCreatorBoostPlan } from '../../../../lib/monetization/creator-boosts';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'creator-boosts:active:get', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const now = new Date();
    let snap;
    try {
      snap = await admin
        .firestore()
        .collection('creatorBoostOrders')
        .where('ownerUid', '==', uid)
        .where('activationStatus', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    } catch (queryErr) {
      // Fallback: if composite index is missing, query without orderBy
      snap = await admin
        .firestore()
        .collection('creatorBoostOrders')
        .where('ownerUid', '==', uid)
        .where('activationStatus', '==', 'active')
        .limit(5)
        .get();
    }

    if (snap.empty) {
      return NextResponse.json({ active: false, boost: null });
    }

    // Sort in memory (newest first) in case orderBy wasn't available
    const sortedDocs = [...snap.docs].sort((a, b) => {
      const aTime = a.data().createdAt?.toDate?.() || new Date(0);
      const bTime = b.data().createdAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });
    const doc = sortedDocs[0];
    const data = doc.data();

    const expiresAt = data.expiresAt?.toDate ? data.expiresAt.toDate() : data.expiresAt ? new Date(data.expiresAt) : null;
    if (expiresAt && expiresAt <= now) {
      return NextResponse.json({ active: false, boost: null });
    }

    const plan = getCreatorBoostPlan(data.plan);

    return NextResponse.json({
      active: true,
      boost: {
        id: doc.id,
        plan: data.plan,
        tier: data.plan?.toUpperCase() || null,
        label: plan?.label || data.plan,
        visibilityMultiplier: plan?.visibilityMultiplier || data.visibilityMultiplier || 1,
        videoChatSeconds: plan?.videoChatSeconds || 60,
        badge: plan?.badge || null,
        badgeColor: plan?.badgeColor || null,
        badgeLabel: plan?.badgeLabel || null,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      },
    });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/creator-boosts/active:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
