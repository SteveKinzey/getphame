// Get Phame Service Worker v5 — Fixed cross-origin fetch handling
// Cache version bump forces old caches to be cleared on update
const CACHE_NAME = 'getphame-v6';

// Pre-cache all locale files at install so language switching is instant
// and works completely offline after the app is installed on the device.
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // All 6 language locale files — cached at install time
  '/locales/en/translation.json',
  '/locales/th/translation.json',
  '/locales/zh-TW/translation.json',
  '/locales/fr/translation.json',
  '/locales/es/translation.json',
  '/locales/it/translation.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Immediately activate new SW without waiting for old one to finish
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all open clients immediately
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip Vite dev server assets — let browser handle them normally
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    return;
  }

  // Skip API calls — never intercept backend requests
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Cross-origin requests (CDN images, YouTube thumbnails, external fonts, etc.)
  // MUST be passed through directly — do NOT try to cache opaque responses
  // as they can cause null response errors and inflate cache storage.
  if (url.origin !== self.location.origin) {
    // Just pass through to network — no caching, no interference
    return;
  }

  // Locale files: cache-first strategy for instant language switching
  if (url.pathname.startsWith('/locales/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        }).catch(() => {
          // Locale fetch failed offline — return empty JSON to prevent crash
          return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
        });
      })
    );
    return;
  }

  // Same-origin assets: network-first, fall back to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache valid same-origin responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline fallback: serve from cache
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, serve the app shell
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
          // For favicon/icon requests that fail, return a 204 no-content
          if (
            url.pathname.includes('favicon') ||
            url.pathname.includes('.ico') ||
            url.pathname.includes('apple-touch-icon')
          ) {
            return new Response(null, { status: 204 });
          }
          // For all other same-origin assets that fail offline,
          // return a proper 503 response instead of null
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

// Handle follow-up reminder scheduling via background sync
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_REMINDER') {
    const { customerId, businessName, reviewLink, sendAt } = event.data;
    console.log('[SW] Reminder scheduled for:', customerId, 'at', sendAt);
  }
});
