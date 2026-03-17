import { NextResponse } from 'next/server';

const windows = new Map();

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
