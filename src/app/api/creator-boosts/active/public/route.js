import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../../lib/api/rate-limit';
import { getCreatorBoostPlan } from '../../../../../lib/monetization/creator-boosts';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'creator-boosts:active:public', limit: 120, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    if (!uid || typeof uid !== 'string' || uid.trim().length === 0) {
      return NextResponse.json({ active: false, boost: null });
    }

    await initializeFirebaseAdmin();

    const now = new Date();
    let snap;
    try {
      snap = await admin
        .firestore()
        .collection('creatorBoostOrders')
        .where('ownerUid', '==', uid.trim())
        .where('activationStatus', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    } catch (queryErr) {
      snap = await admin
        .firestore()
        .collection('creatorBoostOrders')
        .where('ownerUid', '==', uid.trim())
        .where('activationStatus', '==', 'active')
        .limit(5)
        .get();
    }

    if (snap.empty) {
      return NextResponse.json({ active: false, boost: null });
    }

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
        plan: data.plan,
        badge: plan?.badge || null,
        badgeLabel: plan?.badgeLabel || null,
      },
    });
  } catch (error) {
    console.error('Error in /api/creator-boosts/active/public:', error);
    return NextResponse.json({ active: false, boost: null });
  }
}
