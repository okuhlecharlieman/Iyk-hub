/**
 * API route handler for /api/opportunities/public.
 *
 * Returns approved, non-expired opportunities for unauthenticated views
 * (e.g. the landing page preview).  Expired posts are filtered out
 * server-side so they never appear in the public feed.
 */
import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Converts a Firestore Timestamp (or ISO string) to an ISO string.
 * Returns null for missing/invalid values.
 */
const serializeTs = (val) => {
  if (!val) return null;
  if (typeof val === 'string') return val;
  if (typeof val.toDate === 'function') return val.toDate().toISOString();
  if (typeof val.toMillis === 'function') return new Date(val.toMillis()).toISOString();
  return null;
};

/**
 * Returns true if the opportunity has no expiry date or hasn't expired yet.
 */
const isNotExpired = (data) => {
  if (!data.expiresAt) return true;
  const expiry = data.expiresAt.toDate ? data.expiresAt.toDate() : new Date(data.expiresAt);
  return expiry > new Date();
};

/** Handles GET requests to /api/opportunities/public. */
export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'opportunities:public', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const db = admin.firestore();

    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get('limit') || '6', 10);
    const limitN = Math.min(Math.max(Number.isNaN(rawLimit) ? 6 : rawLimit, 1), 20);

    // Over-fetch to account for expired posts that will be filtered out.
    const fetchLimit = limitN * 2;

    let queryRef;
    try {
      queryRef = db.collection('opportunities')
        .where('status', '==', 'approved')
        .orderBy('createdAt', 'desc')
        .limit(fetchLimit);
      const snap = await queryRef.get();

      const opportunities = snap.docs
        .filter((doc) => isNotExpired(doc.data()))
        .slice(0, limitN)
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title || '',
            org: data.org || '',
            description: data.description || '',
            link: data.link || '',
            tags: data.tags || [],
            createdAt: serializeTs(data.createdAt),
            expiresAt: serializeTs(data.expiresAt),
          };
        });

      return NextResponse.json({ opportunities });
    } catch {
      queryRef = db.collection('opportunities')
        .where('status', '==', 'approved')
        .limit(fetchLimit);
      const snap = await queryRef.get();

      const now = new Date();
      const opportunities = snap.docs
        .filter((doc) => isNotExpired(doc.data()))
        .slice(0, limitN)
        .map((doc) => {
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
