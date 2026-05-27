import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'opportunities:public', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const db = admin.firestore();

    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get('limit') || '6', 10);
    const limitN = Math.min(Math.max(Number.isNaN(rawLimit) ? 6 : rawLimit, 1), 20);

    let queryRef;
    try {
      queryRef = db.collection('opportunities')
        .where('status', '==', 'approved')
        .orderBy('createdAt', 'desc')
        .limit(limitN);
      const snap = await queryRef.get();
      const serializeTs = (val) => {
        if (!val) return null;
        if (typeof val === 'string') return val;
        if (typeof val.toDate === 'function') return val.toDate().toISOString();
        if (typeof val.toMillis === 'function') return new Date(val.toMillis()).toISOString();
        return null;
      };
      const opportunities = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          org: data.org || '',
          description: data.description || '',
          link: data.link || '',
          tags: data.tags || [],
          createdAt: serializeTs(data.createdAt),
        };
      });

      return NextResponse.json({ opportunities });
    } catch {
      queryRef = db.collection('opportunities')
        .where('status', '==', 'approved')
        .limit(limitN);
      const snap = await queryRef.get();
      const opportunities = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || '',
          org: data.org || '',
          description: data.description || '',
          link: data.link || '',
          tags: data.tags || [],
        };
      });
      return NextResponse.json({ opportunities });
    }
  } catch (error) {
    console.error('Error in /api/opportunities/public:', error);
    return NextResponse.json({ opportunities: [] });
  }
}
