/**
 * Opportunity Analytics API — tracks views and clicks per opportunity.
 *
 * POST /api/opportunities/analytics
 *   Body: { opportunityId, event: 'view' | 'click' }
 *   Increments the view or click count on the opportunity document.
 *   No auth required — lightweight tracking.
 *
 * GET /api/opportunities/analytics  (admin only)
 *   Returns analytics summary for all opportunities.
 */
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    await initializeFirebaseAdmin();
    const db = admin.firestore();
    const body = await request.json();
    const { opportunityId, event } = body;

    if (!opportunityId || !['view', 'click'].includes(event)) {
      return NextResponse.json({ error: 'opportunityId and event (view|click) required' }, { status: 400 });
    }

    const field = event === 'view' ? 'viewCount' : 'clickCount';
    await db.collection('opportunities').doc(opportunityId).update({
      [field]: admin.firestore.FieldValue.increment(1),
    });

    return NextResponse.json({ tracked: true });
  } catch (err) {
    // Silently fail — analytics should not block UX
    console.error('Opportunity analytics track error:', err);
    return NextResponse.json({ tracked: false }, { status: 200 });
  }
}

export async function GET(request) {
  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);
    const db = admin.firestore();

    // Verify admin
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all opportunities with their analytics
    const snap = await db.collection('opportunities')
      .where('status', '==', 'approved')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    const analytics = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title || 'Untitled',
        org: data.org || '',
        viewCount: data.viewCount || 0,
        clickCount: data.clickCount || 0,
        sponsored: data.sponsored || false,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      };
    });

    // Summary stats
    const totalViews = analytics.reduce((sum, a) => sum + a.viewCount, 0);
    const totalClicks = analytics.reduce((sum, a) => sum + a.clickCount, 0);
    const avgCTR = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : 0;

    return NextResponse.json({
      analytics,
      summary: { totalViews, totalClicks, avgCTR: Number(avgCTR), totalOpportunities: analytics.length },
    });
  } catch (err) {
    if (err?.code === 403) return NextResponse.json({ error: err.message }, { status: 403 });
    console.error('Opportunity analytics GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
