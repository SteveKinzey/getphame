// Get Phame Service Worker v5 — Fixed cross-origin fetch handling
// Cache version bump forces old caches to be cleared on update
const CACHE_NAME = 'getphame-v18';
const LANGUAGE_CACHE_KEY = '/__getphame_offline_language__';
const OFFLINE_PAGES = {
  en: '/offline.en.html',
  es: '/offline.es.html',
  fr: '/offline.fr.html',
  it: '/offline.it.html',
  th: '/offline.th.html',
  'zh-CN': '/offline.zh-CN.html',
  'zh-TW': '/offline.zh-TW.html',
};

// Pre-cache all locale files at install so language switching is instant
// and works completely offline after the app is installed on the device.
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/offline.css',
  ...Object.values(OFFLINE_PAGES),
  '/manifest.json',
  '/apple-touch-icon.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // All 7 supported language locale files — cached at install time
  '/locales/en/translation.json',
  '/locales/es/translation.json',
  '/locales/fr/translation.json',
  '/locales/it/translation.json',
  '/locales/th/translation.json',
  '/locales/zh-CN/translation.json',
  '/locales/zh-TW/translation.json',
  // Landing-page namespaces contain the localized custom video controls.
  '/locales/en/landing.json',
  '/locales/es/landing.json',
  '/locales/fr/landing.json',
  '/locales/it/landing.json',
  '/locales/th/landing.json',
  '/locales/zh-CN/landing.json',
  '/locales/zh-TW/landing.json',
  // Caption tracks remain same-origin and are available after PWA installation.
  '/getphame-walkthrough.en.vtt',
  '/getphame-walkthrough.es.vtt',
  '/getphame-walkthrough.fr.vtt',
  '/getphame-walkthrough.it.vtt',
  '/getphame-walkthrough.de.vtt',
  '/getphame-walkthrough.pt.vtt',
];

function normalizeOfflineLanguage(language) {
  const normalized = String(language || '').toLowerCase();
  if (normalized.startsWith('zh-tw') || normalized.startsWith('zh-hk') || normalized.includes('hant')) return 'zh-TW';
  if (normalized.startsWith('zh')) return 'zh-CN';
  if (normalized.startsWith('es')) return 'es';
  if (normalized.startsWith('fr')) return 'fr';
  if (normalized.startsWith('it')) return 'it';
  if (normalized.startsWith('th')) return 'th';
  return 'en';
}

async function rememberOfflineLanguage(language) {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(LANGUAGE_CACHE_KEY, new Response(normalizeOfflineLanguage(language)));
}

async function getOfflinePage() {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(LANGUAGE_CACHE_KEY);
  const language = normalizeOfflineLanguage(response ? await response.text() : 'en');
  return cache.match(OFFLINE_PAGES[language]) || cache.match('/offline.html');
}

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

  // Managed storage endpoints issue signed cross-origin redirects. Let the browser
  // own these requests so media byte ranges and redirects are handled natively;
  // routing them through respondWith() can turn a valid MP4 into an opaque response.
  if (url.pathname.startsWith('/manus-storage/')) {
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
      .catch(async () => {
        // Document navigations use the branded offline page instead of a broken app shell.
        if (event.request.destination === 'document') {
          return getOfflinePage();
        }
        // Other same-origin requests fall back to their cached response.
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
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
  if (event.data && event.data.type === 'SET_LANGUAGE') {
    event.waitUntil(rememberOfflineLanguage(event.data.language));
    return;
  }
  if (event.data && event.data.type === 'SCHEDULE_REMINDER') {
    const { customerId, businessName, reviewLink, sendAt } = event.data;
    console.log('[SW] Reminder scheduled for:', customerId, 'at', sendAt);
  }
});
