import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { handleApiError } from '../lib/api/validation';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'creator-boosts:me:get', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const snap = await admin.firestore().collection('creatorBoostOrders').where('ownerUid', '==', uid).orderBy('createdAt', 'desc').limit(20).get();
    const items = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json({ items });
  } catch (error) {
    return handleApiError(error, 'Error in /api/creator-boosts/me:');
  }
}
