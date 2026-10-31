// Bumped from v1 to purge the stale cache-first index.html held by earlier installs.
const CACHE_NAME = 'agentuto-v2';

// Everything below is scope-relative so the same worker works at "/" (dev, custom domain)
// and at a project sub-path such as "/agentuto/" on GitHub Pages.
const SCOPE = self.registration.scope;
const within = (p) => new URL(p, SCOPE).href;

const ASSETS_TO_CACHE = [
  within('./'),
  within('index.html'),
  within('manifest.json'),
  within('icon.svg'),
  within('icon-192.png'),
  within('icon-512.png'),
];

const ASSETS_PATH = new URL('assets/', SCOPE).pathname;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and skip external APIs (like Gemini API)
  if (event.request.method !== 'GET' || event.request.url.includes('googleapis.com')) {
    return;
  }

  // Page navigations and unhashed shell files: network-first so new deploys reach users,
  // falling back to the cached copy when offline.
  const url = new URL(event.request.url);
  const isShell =
    event.request.mode === 'navigate' ||
    (url.origin === self.location.origin && !url.pathname.startsWith(ASSETS_PATH));

  if (isShell) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match(within('index.html'));
        });
      })
    );
    return;
  }

  // Hashed /assets/* files are immutable: cache-first.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Offline fallback
        return caches.match(within('index.html'));
      });
    })
  );
});
