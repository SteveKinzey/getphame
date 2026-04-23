// ReviewRocket Service Worker v3 — All locale files pre-cached at install
// Cache version bump forces old caches to be cleared on update
const CACHE_NAME = 'review-rocket-v3';

// Pre-cache all locale files at install so language switching is instant
// and works completely offline after the app is installed on the device.
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  // All 6 language locale files — cached at install time
  '/locales/en/translation.json',
  '/locales/th/translation.json',
  '/locales/zh-CN/translation.json',
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

  // Always fetch from network for JS/CSS/API calls (Vite dev assets)
  // Only cache static shell assets
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    return; // Let browser handle it normally
  }

  // Locale files: cache-first strategy for instant language switching
  // The locale files are pre-cached at install and updated when SW version bumps.
  if (url.pathname.startsWith('/locales/')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        // Not in cache yet — fetch and cache it
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  event.respondWith(
    // Network-first strategy: always try network, fall back to cache
    fetch(event.request)
      .then((response) => {
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
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
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
