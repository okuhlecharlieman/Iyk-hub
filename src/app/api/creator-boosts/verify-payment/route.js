import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { getCreatorBoostPlan } from '../../../../lib/monetization/creator-boosts';
import { handleApiError } from '../lib/api/validation';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'creator-boosts:verify', limit: 20, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const { orderId } = await request.json();
    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const db = admin.firestore();
    const orderRef = db.collection('creatorBoostOrders').doc(orderId.trim());
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderDoc.data();

    if (order.ownerUid !== uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Already active — just confirm
    if (order.activationStatus === 'active') {
      return NextResponse.json({
        success: true,
        status: 'active',
        expiresAt: order.expiresAt?.toDate ? order.expiresAt.toDate().toISOString() : null,
      });
    }

    // If payment is confirmed (paid) but activation is still pending,
    // activate immediately instead of waiting for the cron
    if (order.paymentStatus === 'paid' && order.activationStatus === 'pending_activation') {
      const durationHours = Number(order.durationHours || 24);
      const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000);

      await orderRef.set({
        activationStatus: 'active',
        activatedAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      const plan = getCreatorBoostPlan(order.plan);
      if (plan) {
        await db.collection('users').doc(uid).set({
          activeBoost: {
            orderId: orderId.trim(),
            plan: order.plan,
            tier: order.plan?.toUpperCase() || null,
            badge: plan.badge,
            badgeLabel: plan.badgeLabel,
            badgeColor: plan.badgeColor,
            visibilityMultiplier: plan.visibilityMultiplier,
            videoChatSeconds: plan.videoChatSeconds,
            expiresAt,
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }

      return NextResponse.json({
        success: true,
        status: 'active',
        expiresAt: expiresAt.toISOString(),
      });
    }

    // Payment not yet confirmed — webhook may not have fired yet
    return NextResponse.json({
      success: true,
      status: order.activationStatus,
      paymentStatus: order.paymentStatus,
    });
  } catch (error) {
    return handleApiError(error, 'Error in /api/creator-boosts/verify-payment:');
  }
}
