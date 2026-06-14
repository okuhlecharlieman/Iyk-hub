import { NextResponse } from 'next/server';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { queryActiveBoost } from '../../../../lib/api/boost-query';
import { handleApiError } from '../lib/api/validation';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'creator-boosts:active:get', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const boost = await queryActiveBoost(uid);
    if (!boost) {
      return NextResponse.json({ active: false, boost: null });
    }

    return NextResponse.json({ active: true, boost });
  } catch (error) {
    return handleApiError(error, 'Error in /api/creator-boosts/active:');
  }
}
