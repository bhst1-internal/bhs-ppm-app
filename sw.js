// Bump CACHE_NAME every time you deploy an updated index.html
const CACHE_NAME = 'bhs-ppm-v1.0.3';
const CORE_ASSETS = [
  './',
  './index.html'
];
const OPTIONAL_ASSETS = [
  './manifest.json',
  './icon-192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Force fresh network fetches during install so HTTP cache cannot serve a stale index.html
      await Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' }))
        )
      );
      await Promise.all(
        OPTIONAL_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: 'reload' })).catch(() => {})
        )
      );
    })
  );
  // Intentionally do NOT call self.skipWaiting() automatically so index.html can prompt the user first
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('bhs-ppm-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = req.url;

  // Never intercept non-GET requests, Google Apps Script, Drive images, or version.json
  if (
    req.method !== 'GET' ||
    url.includes('script.google.com') ||
    url.includes('googleusercontent.com') ||
    url.includes('version.json')
  ) {
    return;
  }

  // Only handle same-origin app shell assets in the cache
  if (!url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((networkRes) => {
        if (networkRes && networkRes.ok && networkRes.type === 'basic') {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return networkRes;
      });
    })
  );
});
