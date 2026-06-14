import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { getCreatorBoostPlan } from '../../../../lib/monetization/creator-boosts';
import { handleApiError } from '../lib/api/validation';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'creator-boosts:history', limit: 30, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    let snap;
    try {
      snap = await admin
        .firestore()
        .collection('creatorBoostOrders')
        .where('ownerUid', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
    } catch (queryErr) {
      snap = await admin
        .firestore()
        .collection('creatorBoostOrders')
        .where('ownerUid', '==', uid)
        .limit(20)
        .get();
    }

    const orders = snap.docs.map(doc => {
      const data = doc.data();
      const plan = getCreatorBoostPlan(data.plan);
      return {
        id: doc.id,
        plan: data.plan,
        label: plan?.label || data.plan,
        status: data.activationStatus,
        paymentStatus: data.paymentStatus,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        activatedAt: data.activatedAt?.toDate?.()?.toISOString() || null,
        expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate().toISOString() : data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
      };
    });

    return NextResponse.json({ orders });
  } catch (error) {
    return handleApiError(error, 'Error in /api/creator-boosts/history:');
  }
}
