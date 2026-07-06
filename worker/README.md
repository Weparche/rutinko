# Rutinko Push Worker

Cloudflare Worker backend for reliable background Web Push reminders.

The existing frontend already calls:

- `GET /api/vapid-public-key`
- `POST /api/sync`

and `public/sw.js` already handles `push` events with this payload shape:

```json
{
  "due": [{ "occ": "task-id::YYYY-MM-DD", "icon": "💧", "title": "Popiti vode", "time": "10:00" }],
  "snoozeMinutes": 30
}
```

## One-time setup

Create KV:

```bash
npx wrangler kv namespace create RUTINKO_PUSH_KV
```

Copy the returned namespace id into `wrangler.toml` under `[[kv_namespaces]].id`.

Set VAPID values as Cloudflare secrets. Do not commit the private value to GitHub.

```bash
npx wrangler secret put VAPID_PUBLIC_KEY
npx wrangler secret put VAPID_PRIVATE_KEY
npx wrangler secret put VAPID_SUBJECT
```

Deploy:

```bash
npx wrangler deploy
```

The frontend currently expects:

```js
const PUSH_SERVER = 'https://rutinko-push.ig29007.workers.dev';
```

so deploy this Worker under the same `rutinko-push` name/account or update `PUSH_SERVER` in `src/main.jsx`.

## Scheduled trigger

Add a Cloudflare Worker Cron Trigger in the dashboard or add it to `wrangler.toml` under `[triggers]` before deploy. The Worker implements the `scheduled()` handler already.

## Debugging

Tail logs:

```bash
npx wrangler tail rutinko-push
```

Expected log flow:

1. Opening the app and allowing notifications logs `[rutinko-push] sync`.
2. The scheduled trigger logs `[rutinko-push] cron summary`.
3. Due reminders log `[rutinko-push] push sent`.
4. Expired browser subscriptions are deleted on HTTP 404/410.
