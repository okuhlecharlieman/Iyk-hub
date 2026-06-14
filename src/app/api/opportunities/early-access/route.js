import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { getCreatorBoostPlan } from '../../../../lib/monetization/creator-boosts';
import { handleApiError } from '../lib/api/validation';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'opportunities:early-access', limit: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const db = admin.firestore();

    // Check if user has an active Ultra boost
    let boostSnap;
    try {
      boostSnap = await db
        .collection('creatorBoostOrders')
        .where('ownerUid', '==', uid)
        .where('activationStatus', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .get();
    } catch (queryErr) {
      boostSnap = await db
        .collection('creatorBoostOrders')
        .where('ownerUid', '==', uid)
        .where('activationStatus', '==', 'active')
        .limit(5)
        .get();
    }

    if (boostSnap.empty) {
      return NextResponse.json({ opportunities: [], eligible: false });
    }

    const boostData = boostSnap.docs[0].data();
    const plan = getCreatorBoostPlan(boostData.plan);
    const tier = boostData.plan?.toUpperCase();

    if (tier !== 'ULTRA') {
      return NextResponse.json({ opportunities: [], eligible: false });
    }

    const expiresAt = boostData.expiresAt?.toDate ? boostData.expiresAt.toDate() : null;
    if (expiresAt && expiresAt <= new Date()) {
      return NextResponse.json({ opportunities: [], eligible: false });
    }

    // Fetch pending/upcoming sponsored challenges (not yet public)
    let pendingSnap;
    try {
      pendingSnap = await db
        .collection('sponsoredChallenges')
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
    } catch (queryErr) {
      pendingSnap = await db
        .collection('sponsoredChallenges')
        .where('status', '==', 'pending')
        .limit(10)
        .get();
    }

    const opportunities = pendingSnap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        challengeType: data.challengeType,
        deadline: data.deadline?.toDate?.()?.toISOString() || data.deadline,
        prizeDescription: data.prizeDescription,
        sponsorName: data.sponsorName,
        bannerUrl: data.bannerUrl || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt,
        earlyAccess: true,
      };
    });

    return NextResponse.json({ opportunities, eligible: true });
  } catch (error) {
    return handleApiError(error, 'Error in /api/opportunities/early-access:');
  }
}
