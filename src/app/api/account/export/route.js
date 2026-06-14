import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';
import { handleApiError } from '../lib/api/validation';
export const dynamic = 'force-dynamic';

function serializeValue(val) {
  if (!val) return val;
  if (val.toDate && typeof val.toDate === 'function') return val.toDate().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (val._seconds != null || val.seconds != null) {
    const seconds = Number(val._seconds ?? val.seconds);
    return new Date(seconds * 1000).toISOString();
  }
  return val;
}

function serializeDoc(doc) {
  const data = doc.data();
  const result = { id: doc.id };
  for (const [key, value] of Object.entries(data)) {
    result[key] = serializeValue(value);
  }
  return result;
}

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'account:export', limit: 3, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const db = admin.firestore();

    const userDoc = await db.collection('users').doc(uid).get();
    const profile = userDoc.exists ? serializeDoc(userDoc) : {};

    let showcasePosts = [];
    try {
      const showcaseSnap = await db.collection('wallPosts')
        .where('uid', '==', uid)
        .limit(500)
        .get();
      showcasePosts = showcaseSnap.docs.map(serializeDoc);
    } catch (err) {
      console.error('Export: error fetching wallPosts:', err?.message);
    }

    let boostOrders = [];
    try {
      const boostSnap = await db.collection('creatorBoostOrders')
        .where('ownerUid', '==', uid)
        .limit(100)
        .get();
      boostOrders = boostSnap.docs.map(serializeDoc);
    } catch (err) {
      console.error('Export: error fetching boostOrders:', err?.message);
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      uid,
      profile: {
        displayName: profile.displayName || null,
        email: profile.email || null,
        bio: profile.bio || null,
        skills: profile.skills || null,
        points: profile.points || null,
        createdAt: profile.createdAt || null,
      },
      showcasePosts,
      boostOrders,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="iyk-hub-data-export-${uid}.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error, 'Error exporting account data:');
  }
}
