import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

const getClientIp = (request) => {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  return request.headers.get('x-real-ip') || 'unknown';
};

const getBucketKey = (request, keyPrefix = 'default') => {
  const ip = getClientIp(request);
  return `${keyPrefix}:${ip}`;
};

/**
 * In-memory rate limiter used as fast path. Falls through to
 * Firestore-backed limiter when the in-memory window has expired
 * (cold start resilience).
 */
const windows = new Map();

/**
 * Try Firestore-backed rate limiting for cross-instance consistency.
 * Falls back gracefully to in-memory if Firestore is unavailable.
 */
async function checkFirestoreRateLimit(bucketKey, limit, windowMs) {
  try {
    if (!admin.apps.length) return null;

    const db = admin.firestore();
    const docRef = db.collection('rateLimits').doc(bucketKey.replace(/[/\\]/g, '_'));
    const now = Date.now();

    const result = await db.runTransaction(async (txn) => {
      const doc = await txn.get(docRef);
      const data = doc.data();

      if (!data || data.resetAt <= now) {
        txn.set(docRef, { count: 1, resetAt: now + windowMs });
        return { allowed: true };
      }

      if (data.count >= limit) {
        return { allowed: false, retryAfter: Math.ceil((data.resetAt - now) / 1000) };
      }

      txn.update(docRef, { count: data.count + 1 });
      return { allowed: true };
    });

    return result;
  } catch {
    // Firestore unavailable, fall through to in-memory
    return null;
  }
}

export function enforceRateLimit(request, {
  keyPrefix,
  limit,
  windowMs,
}) {
  const now = Date.now();
  const bucketKey = getBucketKey(request, keyPrefix);
  const existing = windows.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    windows.set(bucketKey, { count: 1, resetAt: now + windowMs });
    // Fire-and-forget Firestore check for cross-instance tracking
    checkFirestoreRateLimit(bucketKey, limit, windowMs).catch(() => {});
    return null;
  }

  existing.count += 1;

  if (existing.count > limit) {
    const retryAfterSeconds = Math.ceil((existing.resetAt - now) / 1000);
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
        },
      }
    );
  }

  return null;
}

/**
 * Async rate limit check with Firestore backing.
 * Use this for critical endpoints (payments, auth) where
 * cross-instance consistency matters.
 */
export async function enforceDistributedRateLimit(request, {
  keyPrefix,
  limit,
  windowMs,
}) {
  const bucketKey = getBucketKey(request, keyPrefix);

  const firestoreResult = await checkFirestoreRateLimit(bucketKey, limit, windowMs);

  if (firestoreResult) {
    if (!firestoreResult.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(firestoreResult.retryAfter || 60) },
        }
      );
    }
    return null;
  }

  // Fallback to in-memory if Firestore is unavailable
  return enforceRateLimit(request, { keyPrefix, limit, windowMs });
}
