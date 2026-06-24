const CACHE_NAME = 'rutinko-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app-v3.js',
  './manifest.webmanifest',
  './icons/icon-192.svg',
  './icons/icon-512.svg'
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
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).catch(() => caches.match('./index.html')))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const payload = {
    type: 'notification-action',
    action: event.action || 'open',
    occurrenceId: data.occurrenceId || null
  };

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        client.postMessage(payload);
        return client.focus();
      }
      const actionParam = payload.action && payload.occurrenceId
        ? `?action=${encodeURIComponent(payload.action)}&occurrenceId=${encodeURIComponent(payload.occurrenceId)}`
        : '';
      return self.clients.openWindow(`./${actionParam}`);
    })
  );
});
