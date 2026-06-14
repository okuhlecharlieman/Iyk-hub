import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { getCreatorBoostPlan } from '../../../../lib/monetization/creator-boosts';
import { handleApiError } from '../lib/api/validation';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'creator-boosts:redeem', limit: 10, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const { plan: planKey } = await request.json();
    if (!planKey || typeof planKey !== 'string') {
      return NextResponse.json({ error: 'plan is required' }, { status: 400 });
    }

    const plan = getCreatorBoostPlan(planKey.trim().toLowerCase());
    if (!plan) {
      return NextResponse.json({ error: 'Unknown boost plan' }, { status: 400 });
    }

    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);

    const result = await db.runTransaction(async (tx) => {
      const userDoc = await tx.get(userRef);
      if (!userDoc.exists) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      const lifetimePoints = userData.points?.lifetime || 0;

      if (lifetimePoints < plan.pointsCost) {
        throw new Error(`Not enough points. You have ${lifetimePoints} but need ${plan.pointsCost}.`);
      }

      const durationHours = Number(plan.durationHours || 24);
      const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

      const boostRef = db.collection('creatorBoostOrders').doc();
      tx.set(boostRef, {
        ownerUid: uid,
        ownerEmail: userData.email || null,
        ownerName: userData.displayName || 'Unknown User',
        plan: planKey.trim().toLowerCase(),
        feeCents: 0,
        pointsSpent: plan.pointsCost,
        paymentMethod: 'points',
        durationHours,
        visibilityMultiplier: plan.visibilityMultiplier,
        targetType: 'profile',
        targetId: uid,
        paymentStatus: 'paid',
        activationStatus: 'active',
        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.update(userRef, {
        'points.lifetime': admin.firestore.FieldValue.increment(-plan.pointsCost),
        activeBoost: {
          orderId: boostRef.id,
          plan: planKey.trim().toLowerCase(),
          tier: planKey.trim().toUpperCase(),
          badge: plan.badge,
          badgeLabel: plan.badgeLabel,
          badgeColor: plan.badgeColor,
          visibilityMultiplier: plan.visibilityMultiplier,
          videoChatSeconds: plan.videoChatSeconds,
          expiresAt,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { orderId: boostRef.id, expiresAt: expiresAt.toISOString() };
    });

    return NextResponse.json({
      success: true,
      orderId: result.orderId,
      status: 'active',
      expiresAt: result.expiresAt,
      pointsSpent: plan.pointsCost,
      message: `${plan.label} activated using ${plan.pointsCost} points!`,
    });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    if (error.message?.includes('Not enough points')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error in /api/creator-boosts/redeem-points:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
