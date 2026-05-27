import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { initializeFirebaseAdmin } from '../../../../lib/firebase/admin';
import { enforceRateLimit } from '../../../../lib/api/rate-limit';

export const runtime = 'nodejs';

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'users:public', limit: 60, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  try {
    await initializeFirebaseAdmin();
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid || typeof uid !== 'string' || uid.trim().length === 0) {
      return NextResponse.json({ error: 'uid is required' }, { status: 400 });
    }

    const db = admin.firestore();
    const userDoc = await db.collection('users').doc(uid.trim()).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = userDoc.data();

    // Check if user has active ULTRA boost for accent color
    let hasUltraBoost = data.activeBoost?.tier === 'ULTRA';
    if (!hasUltraBoost) {
      try {
        const boostSnap = await db.collection('creatorBoostOrders')
          .where('ownerUid', '==', uid.trim())
          .where('activationStatus', '==', 'active')
          .limit(1)
          .get();
        if (!boostSnap.empty) {
          const bData = boostSnap.docs[0].data();
          const expiresAt = bData.expiresAt?.toDate ? bData.expiresAt.toDate() : null;
          if ((!expiresAt || expiresAt > new Date()) && bData.plan?.toUpperCase() === 'ULTRA') {
            hasUltraBoost = true;
          }
        }
      } catch {}
    }

    // Only return safe public fields
    const publicProfile = {
      id: userDoc.id,
      displayName: data.displayName || 'Anonymous',
      photoURL: data.photoURL || null,
      bio: data.bio || '',
      skills: Array.isArray(data.skills) ? data.skills : [],
      points: data.points || { weekly: 0, lifetime: 0 },
      profileViewCount: data.profileViewCount || 0,
      accentColor: hasUltraBoost ? (data.accentColor || null) : null,
      role: data.role || 'user',
    };

    // Fetch user's showcase posts
    let posts = [];
    try {
      const postsSnap = await db.collection('wallPosts')
        .where('uid', '==', uid.trim())
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();
      posts = postsSnap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.title || '',
          description: d.description || '',
          type: d.type || 'other',
          mediaUrl: d.mediaUrl || d.imageUrl || null,
          link: d.link || '',
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : null,
        };
      });
    } catch {
      // Fallback without orderBy if index missing
      try {
        const postsSnap = await db.collection('wallPosts')
          .where('uid', '==', uid.trim())
          .limit(20)
          .get();
        posts = postsSnap.docs.map((doc) => {
          const d = doc.data();
          return {
            id: doc.id,
            title: d.title || '',
            description: d.description || '',
            type: d.type || 'other',
            mediaUrl: d.mediaUrl || d.imageUrl || null,
            link: d.link || '',
          };
        });
      } catch {}
    }

    return NextResponse.json({ user: publicProfile, posts });
  } catch (error) {
    console.error('Error in /api/users/public:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
