const CACHE_VERSION = 'v1';
const STATIC_CACHE = `iyk-hub-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `iyk-hub-dynamic-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

const CACHEABLE_EXTENSIONS = [
  '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

function isStaticAsset(url) {
  return CACHEABLE_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  if (isApiRequest(url)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (isNavigationRequest(event.request)) {
    event.respondWith(navigationHandler(event.request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      try {
        const cache = await caches.open(STATIC_CACHE);
        await cache.put(request, response.clone());
      } catch { /* cache write failed — non-critical */ }
    }
    return response;
  } catch {
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      try {
        const cache = await caches.open(DYNAMIC_CACHE);
        await cache.put(request, response.clone());
      } catch { /* cache write failed — non-critical */ }
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function navigationHandler(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type !== 'opaque') {
      try {
        const cache = await caches.open(DYNAMIC_CACHE);
        await cache.put(request, response.clone());
      } catch { /* cache write failed — non-critical */ }
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match(OFFLINE_URL);
  }
}

// Background Sync
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-actions') {
    event.waitUntil(syncPendingActions());
  }
});

async function syncPendingActions() {
  // Replay any queued requests when connectivity returns
  const cache = await caches.open('iyk-hub-sync-queue');
  const requests = await cache.keys();
  for (const request of requests) {
    try {
      await fetch(request);
      await cache.delete(request);
    } catch {
      // Still offline, will retry on next sync
    }
  }
}

// Push Notifications
self.addEventListener('push', (event) => {
  let data = { title: 'IYK Hub', body: 'You have a new notification!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

// Periodic Background Sync
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-content') {
    event.waitUntil(updateCachedContent());
  }
});

async function updateCachedContent() {
  const cache = await caches.open(DYNAMIC_CACHE);
  for (const url of ['/', '/games', '/showcase', '/leaderboard', '/opportunities']) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await cache.put(url, response);
      }
    } catch {
      // Silently skip if offline
    }
  }
}
