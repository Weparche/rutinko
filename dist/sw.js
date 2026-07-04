const CACHE_NAME = 'rutinko-deploy-2026-07-04-v6';
const ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/rutinko-final-polish.css',
  '/rutinko-due-polish.css',
  '/brand/rutinko-logo.webp',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg'
];

const LOGO = '/brand/rutinko-logo.webp';
const REMINDER_TAG = 'rutinko-reminders';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/'))));
});

// ---- IndexedDB key-value store (SW nema pristup localStorageu) ----

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('rutinko-sw', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('kv');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function kvGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction('kv', 'readonly').objectStore('kv').get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function kvSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---- Raspored (kopija logike iz src/utils.js — SW se ne bundla s appom) ----

function swDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function swStartOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function swOccurrenceId(task, key = swDateKey()) {
  return `${task.id}::${key}`;
}

function swDueTime(task, base = new Date()) {
  const parts = task.time.split(':').map(Number);
  const date = new Date(base);
  date.setHours(parts[0], parts[1], 0, 0);
  return date;
}

function swOccursOn(task, date = new Date()) {
  const created = new Date(task.createdAt || Date.now());
  if (swStartOfDay(date) < swStartOfDay(created)) return false;
  if (task.repeat === 'once') return swDateKey(date) === swDateKey(created);
  if (task.repeat === 'daily') return true;
  if (task.repeat === 'weekdays') return date.getDay() >= 1 && date.getDay() <= 5;
  if (task.repeat === 'weekly') return date.getDay() === created.getDay();
  if (task.repeat === 'monthly') return date.getDate() === created.getDate();
  if (task.repeat === 'yearly') return date.getDate() === created.getDate() && date.getMonth() === created.getMonth();
  return true;
}

function swToMinutes(time) {
  const parts = time.split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

function swIsQuietTime(settings, date = new Date()) {
  const current = date.getHours() * 60 + date.getMinutes();
  const start = swToMinutes(settings.quietStart);
  const end = swToMinutes(settings.quietEnd);
  if (start === end) return false;
  if (start < end) return current >= start && current < end;
  return current >= start || current < end;
}

// ---- Podsjetnici ----

function reminderTitle(count) {
  if (count === 1) return null;
  const mod10 = count % 10;
  const mod100 = count % 100;
  const verb = mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? 'rutine čekaju' : 'rutina čeka';
  return `⏰ ${count} ${verb}`;
}

function showReminderNotification(due, snoozeMinutes) {
  if (due.length === 1) {
    const item = due[0];
    return self.registration.showNotification(`${item.icon} ${item.title}`, {
      body: 'Označi kao završeno, odgodi ili preskoči u aplikaciji.',
      tag: REMINDER_TAG,
      renotify: true,
      icon: LOGO,
      badge: LOGO,
      data: { occurrenceId: item.occ },
      actions: [
        { action: 'done', title: 'Završeno' },
        { action: 'snooze30', title: `Odgodi ${snoozeMinutes || 30} min` }
      ]
    });
  }

  return self.registration.showNotification(reminderTitle(due.length), {
    body: due.map((item) => `${item.icon} ${item.title} · ${item.time}`).join('\n'),
    tag: REMINDER_TAG,
    renotify: true,
    icon: LOGO,
    badge: LOGO,
    data: { occurrenceIds: due.map((item) => item.occ) },
    actions: [{ action: 'open', title: 'Otvori Rutinko' }]
  });
}

async function checkDueReminders() {
  if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') return;
  const state = await kvGet('state').catch(() => null);
  if (!state || !state.settings || !state.settings.remindersEnabled) return;
  if (swIsQuietTime(state.settings)) return;

  const now = Date.now();
  const notified = (await kvGet('lastNotified').catch(() => null)) || {};
  const interval = (Number(state.settings.reminderIntervalMinutes) || 5) * 60000;
  const due = [];

  for (const task of state.tasks || []) {
    if (task.active === false || !swOccursOn(task)) continue;
    const occ = swOccurrenceId(task);
    if ((state.done || {})[occ] || (state.skipped || {})[occ]) continue;
    if (now < swDueTime(task).getTime()) continue;
    const snoozeUntil = Number((state.snoozedUntil || {})[occ] || 0);
    if (snoozeUntil && now < snoozeUntil) continue;
    const last = Math.max(Number(notified[occ] || 0), Number((state.lastNotified || {})[occ] || 0));
    if (last && now - last < interval) continue;
    due.push({ occ, icon: task.icon || '⏰', title: task.title || 'Rutina', time: task.time });
  }

  if (!due.length) return;
  due.forEach(({ occ }) => { notified[occ] = now; });
  await kvSet('lastNotified', notified);
  return showReminderNotification(due, state.settings.snoozeMinutes);
}

// Akcija iz notifikacije kad nijedan prozor nije otvoren: primijeni na SW kopiju
// stanja (da se podsjetnik ne ponavlja) i spremi u red za sljedeće otvaranje appa.
async function recordPendingAction(action, occurrenceId) {
  const pending = (await kvGet('pendingActions').catch(() => null)) || [];
  pending.push({ action, occurrenceId, at: Date.now() });
  await kvSet('pendingActions', pending);

  const state = await kvGet('state').catch(() => null);
  if (!state) return;
  if (action === 'done') {
    state.done = { ...(state.done || {}), [occurrenceId]: Date.now() };
    if (state.snoozedUntil) delete state.snoozedUntil[occurrenceId];
  }
  if (action === 'snooze30') {
    const minutes = Number(state.settings?.snoozeMinutes) || 30;
    state.snoozedUntil = { ...(state.snoozedUntil || {}), [occurrenceId]: Date.now() + minutes * 60000 };
  }
  await kvSet('state', state);
}

async function handleNotificationAction(action, occurrenceId) {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clients.length) {
    clients.forEach((client) => client.postMessage({ action, occurrenceId }));
    return;
  }
  await recordPendingAction(action, occurrenceId);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const action = event.action || 'open';

  if ((action === 'done' || action === 'snooze30') && data.occurrenceId) {
    event.waitUntil(handleNotificationAction(action, data.occurrenceId));
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) return client.focus();
      return self.clients.openWindow('/');
    })
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'sync-state') {
    event.waitUntil(kvSet('state', data.state).then(() => checkDueReminders()));
    return;
  }
  if (data.type === 'push-config') {
    event.waitUntil(kvSet('pushConfig', data.config));
    return;
  }
  if (data.type === 'check-reminders') {
    event.waitUntil(checkDueReminders());
    return;
  }
  if (data.type === 'drain-pending') {
    event.waitUntil(
      kvGet('pendingActions').catch(() => null).then((pending) => {
        if (!pending || !pending.length) return;
        return kvSet('pendingActions', []).then(() => {
          if (event.source) event.source.postMessage({ type: 'pending-actions', actions: pending });
        });
      })
    );
  }
});

// Budi SW i kad nijedan tab nije otvoren (instalirana PWA, Chromium).
self.addEventListener('periodicsync', (event) => {
  if (event.tag === REMINDER_TAG) event.waitUntil(checkDueReminders());
});

// Web Push sa servera — radi i kad je browser potpuno ugašen (Android/iOS).
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {}
  const due = Array.isArray(data.due) ? data.due : [];
  if (!due.length) return;
  event.waitUntil(showReminderNotification(due, Number(data.snoozeMinutes) || 30));
});

function base64UrlToUint8Array(value) {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

// Browser može rotirati pretplatu — obnovi je i javi serveru bez otvaranja appa.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil((async () => {
    const config = await kvGet('pushConfig').catch(() => null);
    if (!config || !config.server || !config.publicKey) return;
    const subscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64UrlToUint8Array(config.publicKey)
    });
    const state = await kvGet('state').catch(() => null);
    await fetch(`${config.server}/api/sync`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        tz: config.tz,
        state: state ? {
          tasks: state.tasks,
          done: state.done,
          skipped: state.skipped,
          snoozedUntil: state.snoozedUntil,
          settings: state.settings
        } : null
      })
    });
  })());
});
