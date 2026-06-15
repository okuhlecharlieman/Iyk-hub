/**
 * cache utilities (api).
 */
const memoryCache = new Map();

/** now. */
const now = () => Date.now();

/** read Cache. */
function readCache(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= now()) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value;
}

/** write Cache. */
function writeCache(key, value, ttlMs) {
  memoryCache.set(key, {
    value,
    expiresAt: now() + ttlMs,
  });
}

/** Fetches/retrieves data — getOrSetCache. */
export async function getOrSetCache({ key, ttlMs, loader }) {
  const cached = readCache(key);
  if (cached !== null) {
    return { value: cached, cacheHit: true };
  }

  const value = await loader();
  writeCache(key, value, ttlMs);
  return { value, cacheHit: false };
}

/** Creates/generates — buildCacheKey. */
export function buildCacheKey(prefix, requestUrl, params = {}) {
  const serialized = JSON.stringify({ requestUrl, ...params });
  return `${prefix}:${serialized}`;
}
