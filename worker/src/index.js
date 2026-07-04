import { buildPushPayload } from '@block65/webcrypto-web-push';

// Rutinko push server: prima push pretplatu + snapshot stanja po uređaju,
// a cron svakih 5 min računa dospjele rutine (u vremenskoj zoni uređaja)
// i šalje jedan grupirani push. Nema računa ni logina — ključ zapisa je
// hash push endpointa, pa uređaj može mijenjati samo vlastiti zapis.

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type'
};

const STATE_RETENTION_DAYS = 3;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...CORS_HEADERS }
  });
}

async function recordKey(endpoint) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

// ---- Raspored u vremenskoj zoni uređaja ----

const WEEKDAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function localInfo(tz, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' }).format(date);
  return {
    key: `${get('year')}-${get('month')}-${get('day')}`,
    minutes: Number(get('hour')) * 60 + Number(get('minute')),
    weekday: WEEKDAYS[weekday] ?? 0,
    day: Number(get('day')),
    month: Number(get('month'))
  };
}

function toMinutes(time) {
  const parts = String(time || '0:0').split(':').map(Number);
  return parts[0] * 60 + parts[1];
}

function occursToday(task, tz, now) {
  const created = new Date(task.createdAt || 0);
  const createdInfo = localInfo(tz, created);
  if (now.key < createdInfo.key) return false;
  if (task.repeat === 'once') return now.key === createdInfo.key;
  if (task.repeat === 'daily') return true;
  if (task.repeat === 'weekdays') return now.weekday >= 1 && now.weekday <= 5;
  if (task.repeat === 'weekly') return now.weekday === createdInfo.weekday;
  if (task.repeat === 'monthly') return now.day === createdInfo.day;
  if (task.repeat === 'yearly') return now.day === createdInfo.day && now.month === createdInfo.month;
  return true;
}

function isQuietTime(settings, nowMinutes) {
  const start = toMinutes(settings.quietStart || '22:30');
  const end = toMinutes(settings.quietEnd || '07:00');
  if (start === end) return false;
  if (start < end) return nowMinutes >= start && nowMinutes < end;
  return nowMinutes >= start || nowMinutes < end;
}

function computeDue(record) {
  const state = record.state || {};
  const settings = state.settings || {};
  if (!settings.remindersEnabled) return [];
  const now = localInfo(record.tz);
  if (isQuietTime(settings, now.minutes)) return [];

  const nowMs = Date.now();
  const interval = (Number(settings.reminderIntervalMinutes) || 5) * 60000;
  const due = [];

  for (const task of state.tasks || []) {
    if (!task || task.active === false || !task.time) continue;
    if (!occursToday(task, record.tz, now)) continue;
    if (now.minutes < toMinutes(task.time)) continue;
    const occ = `${task.id}::${now.key}`;
    if ((state.done || {})[occ] || (state.skipped || {})[occ]) continue;
    const snoozeUntil = Number((state.snoozedUntil || {})[occ] || 0);
    if (snoozeUntil && nowMs < snoozeUntil) continue;
    const last = Number((record.lastNotified || {})[occ] || 0);
    if (last && nowMs - last < interval) continue;
    due.push({ occ, icon: task.icon || '⏰', title: task.title || 'Rutina', time: task.time });
  }
  // Push payload je ograničen na ~4 KB, a OS ionako prikazuje tek nekoliko redaka.
  due.sort((a, b) => a.time.localeCompare(b.time));
  return due.slice(0, 12);
}

// ---- Higijena zapisa: zadrži samo nedavne occurrence unose ----

function pruneByDateKey(map, cutoffKey) {
  const pruned = {};
  for (const [occ, value] of Object.entries(map || {})) {
    const dateKey = occ.split('::')[1];
    if (dateKey && dateKey >= cutoffKey) pruned[occ] = value;
  }
  return pruned;
}

function cutoffDateKey(tz) {
  const cutoff = new Date(Date.now() - STATE_RETENTION_DAYS * 86400000);
  return localInfo(tz, cutoff).key;
}

function sanitizeState(state, tz) {
  const cutoff = cutoffDateKey(tz);
  const tasks = (Array.isArray(state?.tasks) ? state.tasks : []).slice(0, 200).map((task) => ({
    id: String(task.id || ''),
    title: String(task.title || '').slice(0, 120),
    icon: String(task.icon || '').slice(0, 8),
    time: String(task.time || '').slice(0, 5),
    repeat: String(task.repeat || 'daily'),
    createdAt: task.createdAt,
    active: task.active !== false
  }));
  return {
    tasks,
    done: pruneByDateKey(state?.done, cutoff),
    skipped: pruneByDateKey(state?.skipped, cutoff),
    snoozedUntil: pruneByDateKey(state?.snoozedUntil, cutoff),
    settings: {
      remindersEnabled: state?.settings?.remindersEnabled !== false,
      reminderIntervalMinutes: Number(state?.settings?.reminderIntervalMinutes) || 5,
      snoozeMinutes: Number(state?.settings?.snoozeMinutes) || 30,
      quietStart: String(state?.settings?.quietStart || '22:30').slice(0, 5),
      quietEnd: String(state?.settings?.quietEnd || '07:00').slice(0, 5)
    }
  };
}

function isValidSubscription(subscription) {
  return Boolean(
    subscription &&
    typeof subscription.endpoint === 'string' &&
    subscription.endpoint.startsWith('https://') &&
    subscription.keys &&
    typeof subscription.keys.p256dh === 'string' &&
    typeof subscription.keys.auth === 'string'
  );
}

async function handleSync(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || !isValidSubscription(body.subscription)) return json({ error: 'invalid subscription' }, 400);

  const tz = typeof body.tz === 'string' && body.tz ? body.tz : 'Europe/Zagreb';
  try {
    localInfo(tz);
  } catch {
    return json({ error: 'invalid timezone' }, 400);
  }

  const key = await recordKey(body.subscription.endpoint);
  const existing = await env.SUBS.get(key, 'json');
  const record = {
    subscription: {
      endpoint: body.subscription.endpoint,
      expirationTime: null,
      keys: { p256dh: body.subscription.keys.p256dh, auth: body.subscription.keys.auth }
    },
    tz,
    state: sanitizeState(body.state, tz),
    lastNotified: existing?.lastNotified || {},
    updatedAt: Date.now()
  };
  await env.SUBS.put(key, JSON.stringify(record));
  return json({ ok: true });
}

async function handleUnsubscribe(request, env) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.endpoint !== 'string') return json({ error: 'invalid endpoint' }, 400);
  await env.SUBS.delete(await recordKey(body.endpoint));
  return json({ ok: true });
}

async function processRecord(env, key, vapid) {
  const record = await env.SUBS.get(key, 'json');
  if (!record || !record.subscription) return;

  const due = computeDue(record);
  if (!due.length) return;

  const nowMs = Date.now();
  const lastNotified = {};
  const cutoff = nowMs - STATE_RETENTION_DAYS * 86400000;
  for (const [occ, at] of Object.entries(record.lastNotified || {})) {
    if (Number(at) > cutoff) lastNotified[occ] = at;
  }
  due.forEach(({ occ }) => { lastNotified[occ] = nowMs; });
  record.lastNotified = lastNotified;

  const message = {
    data: { due, snoozeMinutes: record.state?.settings?.snoozeMinutes || 30 },
    options: { ttl: 600, urgency: 'high', topic: 'rutinko-reminders' }
  };
  const payload = await buildPushPayload(message, record.subscription, vapid);
  const response = await fetch(record.subscription.endpoint, payload);

  if (response.status === 404 || response.status === 410) {
    console.log(JSON.stringify({ event: 'subscription-gone', key, status: response.status }));
    await env.SUBS.delete(key);
    return;
  }
  if (!response.ok && response.status !== 201) {
    console.error(JSON.stringify({ event: 'push-failed', key, status: response.status }));
    return;
  }
  await env.SUBS.put(key, JSON.stringify(record));
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

    const url = new URL(request.url);
    try {
      if (url.pathname === '/api/vapid-public-key' && request.method === 'GET') {
        return json({ key: env.VAPID_PUBLIC_KEY });
      }
      if (url.pathname === '/api/sync' && request.method === 'POST') {
        return await handleSync(request, env);
      }
      if (url.pathname === '/api/unsubscribe' && request.method === 'POST') {
        return await handleUnsubscribe(request, env);
      }
      return json({ error: 'not found' }, 404);
    } catch (error) {
      console.error(JSON.stringify({ event: 'fetch-error', path: url.pathname, message: String(error) }));
      return json({ error: 'internal error' }, 500);
    }
  },

  async scheduled(controller, env, ctx) {
    const vapid = {
      subject: env.VAPID_SUBJECT,
      publicKey: env.VAPID_PUBLIC_KEY,
      privateKey: env.VAPID_PRIVATE_KEY
    };
    let cursor;
    do {
      const page = await env.SUBS.list({ cursor });
      for (const { name } of page.keys) {
        try {
          await processRecord(env, name, vapid);
        } catch (error) {
          console.error(JSON.stringify({ event: 'record-error', key: name, message: String(error) }));
        }
      }
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
  }
};
