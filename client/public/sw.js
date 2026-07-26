// Get Phame Service Worker v4 — All locale files pre-cached at install
// + Version polling: checks /__manus__/version.json every 60s and posts
//   RELOAD_REQUIRED to all clients when the deployed version changes.
const CACHE_NAME = 'getphame-v4';

// ── Version polling ──────────────────────────────────────────────────────────
let installedVersion = null;

async function fetchVersion() {
  try {
    const res = await fetch('/__manus__/version.json?_t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.version ?? null;
  } catch { return null; }
}

async function checkForUpdate() {
  const latest = await fetchVersion();
  if (!latest) return;
  if (installedVersion === null) { installedVersion = latest; return; }
  if (latest !== installedVersion) {
    console.log('[SW] New version detected:', latest, '(was', installedVersion + ')');
    installedVersion = latest;
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    clients.forEach((c) => c.postMessage({ type: 'RELOAD_REQUIRED', version: latest }));
  }
}

setInterval(checkForUpdate, 60_000);

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
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(STATIC_ASSETS);
      installedVersion = await fetchVersion();
    })()
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

  // Never cache the version file — always fetch fresh
  if (url.pathname.startsWith('/__manus__/')) {
    return;
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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_REMINDER') {
    const { customerId, businessName, reviewLink, sendAt } = event.data;
    console.log('[SW] Reminder scheduled for:', customerId, 'at', sendAt);
  }
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
