const DEFAULT_TZ = 'Europe/Zagreb';
const DEVICE_PREFIX = 'device:';
const DEVICE_TTL_SECONDS = 60 * 60 * 24 * 120;
const MAX_DUE_PER_PUSH = 12;
const PUSH_TTL_SECONDS = 60 * 30;

const DEFAULT_SETTINGS = {
  remindersEnabled: true,
  reminderIntervalMinutes: 5,
  snoozeMinutes: 30,
  quietStart: '22:30',
  quietEnd: '07:00'
};

const textEncoder = new TextEncoder();

export default {
  async fetch(request, env) {
    return handleFetch(request, env);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduledPush(env));
  }
};

async function handleFetch(request, env) {
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(env) });
  }

  try {
    if (request.method === 'GET' && url.pathname === '/api/vapid-public-key') {
      return handleVapidPublicKey(env);
    }

    if (request.method === 'POST' && url.pathname === '/api/sync') {
      return handleSync(request, env);
    }

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/api/health')) {
      return json({ ok: true, service: 'rutinko-push' }, 200, env);
    }

    return json({ ok: false, error: 'not_found' }, 404, env);
  } catch (error) {
    console.error('[rutinko-push] request error', error?.stack || error?.message || error);
    return json({ ok: false, error: 'server_error' }, 500, env);
  }
}

function handleVapidPublicKey(env) {
  if (!env.VAPID_PUBLIC_KEY) {
    return json({ ok: false, error: 'missing_vapid_public_key' }, 500, env);
  }
  return json({ key: env.VAPID_PUBLIC_KEY }, 200, env);
}

async function handleSync(request, env) {
  ensureBindings(env);
  const body = await request.json();
  const subscription = body?.subscription;

  if (!isValidSubscription(subscription)) {
    return json({ ok: false, error: 'invalid_subscription' }, 400, env);
  }

  const id = await deviceId(subscription.endpoint);
  const key = DEVICE_PREFIX + id;
  const previous = await getJson(env.RUTINKO_PUSH_KV, key);
  const record = {
    id,
    subscription,
    tz: normalizeTimezone(body?.tz),
    state: sanitizeState(body?.state),
    serverNotified: previous?.serverNotified || {},
    createdAt: previous?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await env.RUTINKO_PUSH_KV.put(key, JSON.stringify(record), { expirationTtl: DEVICE_TTL_SECONDS });
  console.log('[rutinko-push] sync', {
    id,
    tz: record.tz,
    tasks: record.state.tasks.length,
    remindersEnabled: record.state.settings.remindersEnabled
  });

  return json({ ok: true, id }, 200, env);
}

async function runScheduledPush(env) {
  ensureBindings(env);
  ensureVapid(env);

  const startedAt = Date.now();
  let cursor;
  let scanned = 0;
  let dueDevices = 0;
  let sent = 0;
  let removed = 0;
  let failed = 0;

  do {
    const page = await env.RUTINKO_PUSH_KV.list({ prefix: DEVICE_PREFIX, cursor, limit: 100 });
    cursor = page.cursor;

    for (const item of page.keys) {
      scanned += 1;
      const record = await getJson(env.RUTINKO_PUSH_KV, item.name);
      if (!record?.subscription || !record?.state) continue;

      const due = getDueReminders(record, new Date());
      if (!due.length) continue;
      dueDevices += 1;

      const payload = {
        due,
        snoozeMinutes: Number(record.state.settings?.snoozeMinutes) || DEFAULT_SETTINGS.snoozeMinutes
      };

      const result = await sendPush(record.subscription, payload, env);
      if (result.ok) {
        sent += 1;
        const now = Date.now();
        const nextNotified = pruneNotified({ ...(record.serverNotified || {}) });
        for (const reminder of due) nextNotified[reminder.occ] = now;
        record.serverNotified = nextNotified;
        record.updatedAt = new Date().toISOString();
        await env.RUTINKO_PUSH_KV.put(item.name, JSON.stringify(record), { expirationTtl: DEVICE_TTL_SECONDS });
        console.log('[rutinko-push] push sent', { id: record.id, due: due.length, status: result.status });
        continue;
      }

      if (result.remove) {
        removed += 1;
        await env.RUTINKO_PUSH_KV.delete(item.name);
        console.log('[rutinko-push] subscription removed', { id: record.id, status: result.status });
        continue;
      }

      failed += 1;
      console.error('[rutinko-push] push failed', { id: record.id, status: result.status, body: result.body });
    }
  } while (cursor);

  console.log('[rutinko-push] cron summary', {
    scanned,
    dueDevices,
    sent,
    removed,
    failed,
    durationMs: Date.now() - startedAt
  });
}

function getDueReminders(record, now) {
  const state = record.state || {};
  const settings = { ...DEFAULT_SETTINGS, ...(state.settings || {}) };
  if (!settings.remindersEnabled) return [];

  const tz = normalizeTimezone(record.tz);
  const local = localParts(now, tz);
  if (isQuietTime(settings, local.minutes)) return [];

  const intervalMs = (Number(settings.reminderIntervalMinutes) || DEFAULT_SETTINGS.reminderIntervalMinutes) * 60_000;
  const due = [];

  for (const task of state.tasks || []) {
    if (!task || task.active === false || !task.time || !task.id) continue;
    if (!occursOn(task, local, tz)) continue;

    const occ = `${task.id}::${local.key}`;
    if ((state.done || {})[occ] || (state.skipped || {})[occ]) continue;

    const snoozeUntil = Number((state.snoozedUntil || {})[occ] || 0);
    if (snoozeUntil && now.getTime() < snoozeUntil) continue;

    const dueMinutes = toMinutes(task.time);
    if (!Number.isFinite(dueMinutes) || local.minutes < dueMinutes) continue;

    const last = Math.max(
      Number((record.serverNotified || {})[occ] || 0),
      Number((state.lastNotified || {})[occ] || 0)
    );
    if (last && now.getTime() - last < intervalMs) continue;

    due.push({
      occ,
      icon: String(task.icon || '⏰'),
      title: String(task.title || 'Rutina'),
      time: String(task.time)
    });

    if (due.length >= MAX_DUE_PER_PUSH) break;
  }

  return due;
}

function occursOn(task, today, tz) {
  const created = localParts(new Date(task.createdAt || Date.now()), tz);
  if (today.key < created.key) return false;

  switch (task.repeat) {
    case 'once':
      return today.key === created.key;
    case 'daily':
      return true;
    case 'weekdays':
      return today.weekday >= 1 && today.weekday <= 5;
    case 'weekly':
      return today.weekday === created.weekday;
    case 'monthly':
      return today.day === created.day;
    case 'yearly':
      return today.day === created.day && today.month === created.month;
    default:
      return true;
  }
}

async function sendPush(subscription, payload, env) {
  try {
    const encrypted = await encryptWebPushPayload(payload, subscription);
    const jwt = await createVapidJwt(subscription.endpoint, env);
    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        TTL: String(Number(env.PUSH_TTL_SECONDS || PUSH_TTL_SECONDS)),
        Urgency: env.PUSH_URGENCY || 'normal',
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`
      },
      body: encrypted
    });

    const body = response.ok ? '' : await response.text().catch(() => '');
    return {
      ok: response.ok,
      status: response.status,
      body,
      remove: response.status === 404 || response.status === 410
    };
  } catch (error) {
    return { ok: false, status: 0, body: error?.message || String(error), remove: false };
  }
}

async function encryptWebPushPayload(payload, subscription) {
  const uaPublic = base64UrlToBytes(subscription.keys.p256dh);
  const authSecret = base64UrlToBytes(subscription.keys.auth);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const asKeyPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, asKeyPair.privateKey, 256));

  const prkKey = await hmacSha256(authSecret, ecdhSecret);
  const keyInfo = concatBytes(textEncoder.encode('WebPush: info'), new Uint8Array([0]), uaPublic, asPublic);
  const ikm = await hmacSha256(prkKey, concatBytes(keyInfo, new Uint8Array([1])));
  const prk = await hmacSha256(salt, ikm);
  const cek = await hkdfExpand(prk, textEncoder.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfExpand(prk, textEncoder.encode('Content-Encoding: nonce\0'), 12);

  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const plain = concatBytes(textEncoder.encode(JSON.stringify(payload)), new Uint8Array([2]));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plain));

  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096, false);
  header[20] = asPublic.length;
  header.set(asPublic, 21);

  return concatBytes(header, cipher);
}

async function createVapidJwt(endpoint, env) {
  const aud = new URL(endpoint).origin;
  const header = bytesToBase64Url(textEncoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = bytesToBase64Url(textEncoder.encode(JSON.stringify({
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: env.VAPID_SUBJECT || 'mailto:admin@rutinko.app'
  })));
  const unsigned = `${header}.${claims}`;
  const key = await importVapidPrivateKey(env);
  const signature = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    textEncoder.encode(unsigned)
  ));
  return `${unsigned}.${bytesToBase64Url(ecdsaSignatureToJose(signature))}`;
}

async function importVapidPrivateKey(env) {
  const publicBytes = base64UrlToBytes(env.VAPID_PUBLIC_KEY);
  if (publicBytes.length !== 65 || publicBytes[0] !== 4) {
    throw new Error('VAPID_PUBLIC_KEY must be a base64url encoded uncompressed P-256 public key');
  }

  const jwk = {
    kty: 'EC',
    crv: 'P-256',
    x: bytesToBase64Url(publicBytes.slice(1, 33)),
    y: bytesToBase64Url(publicBytes.slice(33, 65)),
    d: env.VAPID_PRIVATE_KEY,
    ext: true
  };

  return crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
}

function ecdsaSignatureToJose(signature) {
  if (signature.length === 64) return signature;
  if (signature[0] !== 0x30) return signature;

  let offset = 2;
  if (signature[1] & 0x80) offset += signature[1] & 0x7f;
  if (signature[offset] !== 0x02) return signature;
  const rLength = signature[offset + 1];
  let r = signature.slice(offset + 2, offset + 2 + rLength);
  offset += 2 + rLength;
  if (signature[offset] !== 0x02) return signature;
  const sLength = signature[offset + 1];
  let s = signature.slice(offset + 2, offset + 2 + sLength);

  r = stripLeadingZeroes(r);
  s = stripLeadingZeroes(s);
  return concatBytes(leftPad32(r), leftPad32(s));
}

function stripLeadingZeroes(bytes) {
  let index = 0;
  while (index < bytes.length - 1 && bytes[index] === 0) index += 1;
  return bytes.slice(index);
}

function leftPad32(bytes) {
  if (bytes.length === 32) return bytes;
  if (bytes.length > 32) return bytes.slice(bytes.length - 32);
  const padded = new Uint8Array(32);
  padded.set(bytes, 32 - bytes.length);
  return padded;
}

async function hmacSha256(keyBytes, dataBytes) {
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, dataBytes));
}

async function hkdfExpand(prk, info, length) {
  const block = await hmacSha256(prk, concatBytes(info, new Uint8Array([1])));
  return block.slice(0, length);
}

async function deviceId(endpoint) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', textEncoder.encode(endpoint)));
  return bytesToBase64Url(digest).slice(0, 32);
}

function sanitizeState(state) {
  const source = state && typeof state === 'object' ? state : {};
  return {
    tasks: Array.isArray(source.tasks) ? source.tasks.slice(0, 250) : [],
    done: plainObject(source.done),
    skipped: plainObject(source.skipped),
    snoozedUntil: plainObject(source.snoozedUntil),
    lastNotified: plainObject(source.lastNotified),
    settings: { ...DEFAULT_SETTINGS, ...(source.settings || {}) }
  };
}

function plainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
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

function normalizeTimezone(tz) {
  if (!tz || typeof tz !== 'string') return DEFAULT_TZ;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return tz;
  } catch {
    return DEFAULT_TZ;
  }
}

function localParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date);
  const map = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = Number(map.hour);
  const minute = Number(map.minute);
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    weekday: weekdayMap[map.weekday] ?? date.getUTCDay(),
    minutes: hour * 60 + minute,
    key: `${map.year}-${map.month}-${map.day}`
  };
}

function toMinutes(time) {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return Number.NaN;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return Number.NaN;
  return hour * 60 + minute;
}

function isQuietTime(settings, currentMinutes) {
  const start = toMinutes(settings.quietStart);
  const end = toMinutes(settings.quietEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) return false;
  if (start < end) return currentMinutes >= start && currentMinutes < end;
  return currentMinutes >= start || currentMinutes < end;
}

function pruneNotified(notified) {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 10;
  return Object.fromEntries(Object.entries(notified).filter(([, value]) => Number(value) >= cutoff));
}

async function getJson(kv, key) {
  const raw = await kv.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function ensureBindings(env) {
  if (!env.RUTINKO_PUSH_KV) throw new Error('Missing RUTINKO_PUSH_KV binding');
}

function ensureVapid(env) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
    throw new Error('Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY');
  }
}

function json(data, status = 200, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(env),
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

function corsHeaders(env) {
  return {
    'access-control-allow-origin': env?.ALLOWED_ORIGIN || '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  };
}

function concatBytes(...parts) {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function base64UrlToBytes(value) {
  const normalized = String(value).replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.slice(index, index + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
