import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '../../../lib/firebase/admin';

export const runtime = 'nodejs';

// Graceful handling when there's no service account present at build-time
let serviceAccount = null;
const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
if (rawServiceAccount) {
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch (e) {
    console.warn('Invalid FIREBASE_SERVICE_ACCOUNT env JSON:', e?.message || e);
  }
}

export async function GET(request) {
  // During build-time or environments without a service account, return empty list
  if (process.env.NODE_ENV === 'production' && !serviceAccount) {
    return NextResponse.json({ success: true, users: [] });
  }

  const url = new URL(request.url);
  const rawLimit = parseInt(url.searchParams.get('limit') || '10', 10);
  const filter = url.searchParams.get('filter') === 'weekly' ? 'weekly' : 'lifetime';
  const limitN = Math.min(Math.max(isNaN(rawLimit) ? 10 : rawLimit, 1), 100);

  try {
    await initializeFirebaseAdmin();
    const admin = await import('firebase-admin');
    const firestore = admin.firestore();

    const orderByField = `points.${filter}`;
    const snap = await firestore.collection('users')
      .orderBy(orderByField, 'desc')
      .limit(limitN)
      .get();

    // Return only sanitized/public fields so the client doesn't need full DB access
    const users = snap.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        displayName: d.displayName || null,
        photoURL: d.photoURL || null,
        points: d.points || { weekly: 0, lifetime: 0 },
      };
    });

    return NextResponse.json({ success: true, users });
  } catch (err) {
    console.error('Error in /api/leaderboard:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
