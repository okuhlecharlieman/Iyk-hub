import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '../../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../../lib/api/rate-limit';
import { queryActiveBoost } from '../../../../../lib/api/boost-query';
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

    const boost = await queryActiveBoost(uid.trim());
    if (!boost) {
      return NextResponse.json({ active: false, boost: null });
    }

    return NextResponse.json({
      active: true,
      boost: {
        plan: boost.plan,
        badge: boost.badge,
        badgeLabel: boost.badgeLabel,
      },
    });
  } catch (error) {
    console.error('Error in /api/creator-boosts/active/public:', error);
    return NextResponse.json({ active: false, boost: null });
  }
}
