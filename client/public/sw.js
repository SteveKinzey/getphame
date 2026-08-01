// Versioned path prevents edge caches from pinning an older service worker.
// v28 intentionally does not skip waiting during install: page reloads remain
// user-controlled and a waiting worker must never take over active peer tabs.
// Release manifest: locale dictionaries phame60; service worker getphame-v28.
const CACHE_NAME = 'getphame-v28';
const LANGUAGE_CACHE_KEY = '/__getphame_offline_language__';
const VERSION_ENDPOINT = '/__manus__/version.json';
const VERSION_CHECK_INTERVAL_MS = 60_000;
const LOCALE_CACHE_VERSION = 'phame60';
const OFFLINE_PAGES = {
  en: '/offline.en.html',
  es: '/offline.es.html',
  fr: '/offline.fr.html',
  it: '/offline.it.html',
  th: '/offline.th.html',
  'zh-CN': '/offline.zh-CN.html',
  'zh-TW': '/offline.zh-TW.html',
};

const TRANSLATION_ASSETS = [
  '/locales/en/translation.json',
  '/locales/es/translation.json',
  '/locales/fr/translation.json',
  '/locales/it/translation.json',
  '/locales/th/translation.json',
  '/locales/zh-CN/translation.json',
  '/locales/zh-TW/translation.json',
];

const LANDING_ASSETS = [
  '/locales/en/landing.json',
  '/locales/es/landing.json',
  '/locales/fr/landing.json',
  '/locales/it/landing.json',
  '/locales/th/landing.json',
  '/locales/zh-CN/landing.json',
  '/locales/zh-TW/landing.json',
];

// Authenticated cancellation controls must be usable on the first offline
// launch rather than degrading to the locale fallback JSON response.
const CANCELLATION_ASSETS = [
  '/locales/en/cancellation.json',
  '/locales/es/cancellation.json',
  '/locales/fr/cancellation.json',
  '/locales/it/cancellation.json',
  '/locales/th/cancellation.json',
  '/locales/zh-CN/cancellation.json',
  '/locales/zh-TW/cancellation.json',
];

// Pre-cache both historical unversioned locale URLs and the exact query-versioned
// URLs issued by i18next so installation keeps language switching available offline.
const LOCALIZED_ASSETS = [
  ...TRANSLATION_ASSETS,
  ...LANDING_ASSETS,
  ...CANCELLATION_ASSETS,
  ...TRANSLATION_ASSETS.map(path => `${path}?v=${LOCALE_CACHE_VERSION}`),
  ...LANDING_ASSETS.map(path => `${path}?v=${LOCALE_CACHE_VERSION}`),
  ...CANCELLATION_ASSETS.map(path => `${path}?v=${LOCALE_CACHE_VERSION}`),
];

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
  ...LOCALIZED_ASSETS,
  // Caption tracks remain same-origin and are available after PWA installation.
  '/getphame-walkthrough.en.vtt',
  '/getphame-walkthrough.es.vtt',
  '/getphame-walkthrough.fr.vtt',
  '/getphame-walkthrough.it.vtt',
  '/getphame-walkthrough.de.vtt',
  '/getphame-walkthrough.pt.vtt',
];

let lastKnownVersion = null;
let versionCheckInterval = null;

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

function isValidVersion(version) {
  return typeof version === 'string' && version.trim().length > 0 && version.trim().length <= 160;
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

async function broadcastVersionAvailable(version) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach(client => {
    client.postMessage({ type: 'VERSION_AVAILABLE', version });
  });
}

async function checkDeploymentVersion() {
  try {
    const response = await fetch(`${VERSION_ENDPOINT}?_t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return null;

    const payload = await response.json();
    const version = payload && payload.version;
    if (!isValidVersion(version)) return null;

    const normalizedVersion = version.trim();
    if (lastKnownVersion === null) {
      lastKnownVersion = normalizedVersion;
      return normalizedVersion;
    }

    if (normalizedVersion !== lastKnownVersion) {
      lastKnownVersion = normalizedVersion;
      await broadcastVersionAvailable(normalizedVersion);
    }

    return normalizedVersion;
  } catch {
    // Network and platform-version failures are intentionally silent. The page
    // coordinator will retry only while a visible customer tab is active.
    return null;
  }
}

function startVersionPolling() {
  if (versionCheckInterval !== null) return;
  versionCheckInterval = setInterval(() => {
    void checkDeploymentVersion();
  }, VERSION_CHECK_INTERVAL_MS);
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name.startsWith('getphame-') && name !== CACHE_NAME)
          .map(name => {
            console.log('[SW] Deleting obsolete Get Phame cache:', name);
            return caches.delete(name);
          })
      );
    }).then(async () => {
      await self.clients.claim();
      await checkDeploymentVersion();
      startVersionPolling();
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip Vite dev server assets — let browser handle them normally.
  if (
    url.pathname.startsWith('/src/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/node_modules/')
  ) {
    return;
  }

  // Deployment metadata must always reach the network. Caching this endpoint
  // would make update detection compare stale deployment versions.
  if (url.pathname.startsWith('/__manus__/')) return;

  // Skip API calls — never intercept backend requests.
  if (url.pathname.startsWith('/api/')) return;

  // Managed storage endpoints issue signed cross-origin redirects. Let the
  // browser own these requests so media byte ranges and redirects are handled natively.
  if (url.pathname.startsWith('/manus-storage/')) return;

  // Cross-origin requests (CDN images, YouTube thumbnails, external fonts,
  // etc.) MUST pass through directly; opaque responses are not cached.
  if (url.origin !== self.location.origin) return;

  // Locale files are cache-first for instant language switching, including
  // i18next's versioned query URLs pre-cached during installation.
  if (url.pathname.startsWith('/locales/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
          }
          return response;
        }).catch(() => {
          return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
        });
      })
    );
    return;
  }

  // Same-origin assets: network-first, then cache, preserving the branded
  // offline document fallback used by installed and ordinary browser clients.
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseClone));
        }
        return response;
      })
      .catch(async () => {
        if (event.request.destination === 'document') return getOfflinePage();

        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (
            url.pathname.includes('favicon') ||
            url.pathname.includes('.ico') ||
            url.pathname.includes('apple-touch-icon')
          ) {
            return new Response(null, { status: 204 });
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

self.addEventListener('message', event => {
  if (!event.data) return;

  if (event.data.type === 'SET_LANGUAGE') {
    event.waitUntil(rememberOfflineLanguage(event.data.language));
    return;
  }

  // The page must address registration.waiting explicitly after a customer
  // action. Refuse activation when another in-scope window could be working.
  if (event.data.type === 'SKIP_WAITING') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
        if (clients.length <= 1) await self.skipWaiting();
      })
    );
  }
});
