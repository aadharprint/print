// Ojas Service Worker for Offline Caching and PWA Standalone Mode
const CACHE_NAME = 'ojas-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/portal.html',
  '/admin.html',
  '/tools.html',
  '/manifest.json',
  '/logo.png',
  '/js/config-templates.js',
  '/js/portal-forms.js',
  '/js/portal-wallet-chat.js',
  '/js/admin-logic.js',
  '/js/tools-logic.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
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
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
