const CACHE_NAME = 'rutinko-deploy-2026-06-26-v5';
const ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/rutinko-final-polish.css',
  '/rutinko-due-polish.css',
  '/brand/rutinko-logo.webp',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const payload = { action: event.action || 'open', occurrenceId: data.occurrenceId || null };
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        client.postMessage(payload);
        return client.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
