import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { authenticateAndGetUid, initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'account:export', limit: 3, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const uid = await authenticateAndGetUid(request);

    const db = admin.firestore();

    const userDoc = await db.collection('users').doc(uid).get();
    const profile = userDoc.exists ? userDoc.data() : {};

    const showcaseSnap = await db.collection('wallPosts')
      .where('uid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(500)
      .get();
    const showcasePosts = showcaseSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || null,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || null,
      };
    });

    const boostSnap = await db.collection('creatorBoostOrders')
      .where('ownerUid', '==', uid)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    const boostOrders = boostSnap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || null,
        expiresAt: data.expiresAt?.toDate ? data.expiresAt.toDate().toISOString() : (data.expiresAt instanceof Date ? data.expiresAt.toISOString() : data.expiresAt || null),
      };
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      uid,
      profile: {
        displayName: profile.displayName,
        email: profile.email,
        bio: profile.bio,
        skills: profile.skills,
        points: profile.points,
        createdAt: profile.createdAt?.toDate ? profile.createdAt.toDate().toISOString() : profile.createdAt || null,
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
    if (error?.code === 401 || error?.code === 403) {
      return NextResponse.json({ error: error.message }, { status: error.code });
    }
    console.error('Error exporting account data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
