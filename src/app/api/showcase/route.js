import { NextResponse } from 'next/server';
import { initializeFirebaseAdmin } from '../../../lib/firebase/admin';
import admin from 'firebase-admin';
import { enforceRateLimit } from '../../../lib/api/rate-limit';
import { buildCacheKey, getOrSetCache } from '../../../lib/api/cache';
import { getCreatorBoostPlan } from '../../../lib/monetization/creator-boosts';

export const runtime = 'nodejs';

const MAX_LIMIT = 50;

let serviceAccount = null;
const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
if (rawServiceAccount) {
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch (e) {
    console.warn('Invalid FIREBASE_SERVICE_ACCOUNT_KEY/ACCOUNT JSON:', e?.message || e);
  }
}

function chunkArray(values, size) {
  const chunks = [];
  for (let i = 0; i < values.length; i += size) {
    chunks.push(values.slice(i, i + size));
  }
  return chunks;
}

export async function GET(request) {
  const rateLimitResponse = enforceRateLimit(request, { keyPrefix: 'showcase:get', limit: 90, windowMs: 60 * 1000 });
  if (rateLimitResponse) return rateLimitResponse;

  if (process.env.NODE_ENV === 'production' && !serviceAccount) {
    return NextResponse.json({ posts: [], nextCursor: null });
  }

  try {
    await initializeFirebaseAdmin();

    const { searchParams } = new URL(request.url);
    const rawLimit = parseInt(searchParams.get('limit') || '20', 10);
    const limitN = Math.min(Math.max(Number.isNaN(rawLimit) ? 20 : rawLimit, 1), MAX_LIMIT);
    const cursor = searchParams.get('cursor');

    const cacheKey = buildCacheKey('showcase', request.url, { limitN, cursor });
    const { value: payload, cacheHit } = await getOrSetCache({
      key: cacheKey,
      ttlMs: 20 * 1000,
      loader: async () => {
        const db = admin.firestore();

        let queryRef = db.collection('wallPosts').orderBy('createdAt', 'desc').limit(limitN);

        if (cursor) {
          const cursorSnap = await db.collection('wallPosts').doc(cursor).get();
          if (cursorSnap.exists) {
            queryRef = db.collection('wallPosts').orderBy('createdAt', 'desc').startAfter(cursorSnap).limit(limitN);
          }
        }

        const postsSnapshot = await queryRef.get();
        if (postsSnapshot.empty) {
          return { posts: [], nextCursor: null };
        }

        const posts = postsSnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            mediaUrl: data.mediaUrl || data.imageUrl || null,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
          };
        });

        const authorUids = [...new Set(posts.map((p) => p.uid).filter(Boolean))];
        const authors = {};
        const excludedUids = new Set();
        const EXCLUDED_STATUSES = new Set(['suspended', 'pending_deletion', 'purged']);

        if (authorUids.length > 0) {
          const uidChunks = chunkArray(authorUids, 10);
          await Promise.all(
            uidChunks.map(async (chunk) => {
              const authorDocs = await db
                .collection('users')
                .where(admin.firestore.FieldPath.documentId(), 'in', chunk)
                .get();

              authorDocs.forEach((doc) => {
                const data = doc.data();
                if (data.accountStatus && EXCLUDED_STATUSES.has(data.accountStatus)) {
                  excludedUids.add(doc.id);
                  return;
                }
                authors[doc.id] = {
                  displayName: data.displayName || 'Anonymous User',
                  photoURL: data.photoURL || null,
                  accentColor: data.accentColor || null,
                };
              });
            })
          );
        }

        // Filter out posts from suspended/deleted users
        const visiblePosts = posts.filter((p) => !excludedUids.has(p.uid));

        const postsWithAuthors = visiblePosts.map((post) => ({
          ...post,
          author: authors[post.uid] || { displayName: 'Anonymous User', photoURL: null },
        }));

        // Check for active boosts and mark featured posts
        const boostedUids = new Set();
        const boostInfo = {};
        const uniqueUids = [...new Set(postsWithAuthors.map((p) => p.uid).filter(Boolean))];
        if (uniqueUids.length > 0) {
          const uidChunks = chunkArray(uniqueUids, 10);
          await Promise.all(
            uidChunks.map(async (chunk) => {
              for (const uid of chunk) {
                const boostSnap = await db
                  .collection('creatorBoostOrders')
                  .where('ownerUid', '==', uid)
                  .where('activationStatus', '==', 'active')
                  .limit(1)
                  .get();
                if (!boostSnap.empty) {
                  const boostData = boostSnap.docs[0].data();
                  const expiresAt = boostData.expiresAt?.toDate ? boostData.expiresAt.toDate() : null;
                  if (!expiresAt || expiresAt > new Date()) {
                    boostedUids.add(uid);
                    const plan = getCreatorBoostPlan(boostData.plan);
                    boostInfo[uid] = {
                      plan: boostData.plan,
                      badge: plan?.badge || null,
                      badgeLabel: plan?.badgeLabel || null,
                      visibilityMultiplier: plan?.visibilityMultiplier || 1,
                    };
                  }
                }
              }
            })
          );
        }

        const enrichedPosts = postsWithAuthors.map((post) => ({
          ...post,
          isBoosted: boostedUids.has(post.uid),
          boostBadge: boostInfo[post.uid] || null,
          accentColor: (boostInfo[post.uid]?.plan?.toUpperCase() === 'ULTRA') ? (post.author?.accentColor || null) : null,
        }));

        // Sort: boosted posts first (by multiplier desc), then by creation date
        enrichedPosts.sort((a, b) => {
          const aMultiplier = a.boostBadge?.visibilityMultiplier || 0;
          const bMultiplier = b.boostBadge?.visibilityMultiplier || 0;
          if (aMultiplier !== bMultiplier) return bMultiplier - aMultiplier;
          return 0; // preserve existing createdAt order
        });

        const lastDoc = postsSnapshot.docs[postsSnapshot.docs.length - 1];
        const nextCursor = postsSnapshot.docs.length === limitN ? lastDoc.id : null;

        return { posts: enrichedPosts, nextCursor };
      },
    });

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=20, stale-while-revalidate=60',
        'X-Cache': cacheHit ? 'HIT' : 'MISS',
      },
    });
  } catch (error) {
    console.error('Error in /api/showcase GET handler:', error);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Unable to fetch showcase posts.',
      },
      { status: 500 }
    );
  }
}
