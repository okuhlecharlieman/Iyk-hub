import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticate, initializeFirebaseAdmin } from '../../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../../lib/api/rate-limit';
import { buildCacheKey, getOrSetCache } from '../../../../../lib/api/cache';
import { buildMonetizationSummary } from '../../../../../lib/monetization/summary';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'admin:monetization:summary:get', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await authenticate(request);
    await initializeFirebaseAdmin();

    const cacheKey = buildCacheKey('admin:monetization:summary', request.url);
    const { value: summary, cacheHit } = await getOrSetCache({
      key: cacheKey,
      ttlMs: 15 * 1000,
      loader: async () => buildMonetizationSummary(admin.firestore()),
    });

    return NextResponse.json(summary, {
      headers: {
        'Cache-Control': 'private, max-age=15',
        'X-Cache': cacheHit ? 'HIT' : 'MISS',
      },
    });
  } catch (error) {
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }

    console.error('Error in /api/admin/monetization/summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
