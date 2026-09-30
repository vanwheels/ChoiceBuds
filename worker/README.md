# ChoiceBuds sync Worker

A tiny Cloudflare Worker backing ChoiceBuds' cross-device sync feature (see
`TODO.md`/`COMPLETED.md` in the repo root for the full design). Real
username + password accounts. Low-volume account/token/lockout state lives
in Workers KV; the high-frequency per-account sync blob (one JSON blob of
teams/battles, rewritten on every push/pull) lives in an R2 bucket instead -
see Costs/limits below for why. A device authenticates with a server-issued
opaque bearer token (not the password itself) on every `/sync` request - see
`src/crypto.ts`'s header comment and `docs/investigations/web-version-scope.md`
for the reasoning.

This is infrastructure **you** own and run - nobody else can deploy to your
Cloudflare account, so these steps are for you to run yourself.

## First-time deploy

1. `cd worker && npm install`
2. `npx wrangler login` - opens a browser to authorize the CLI against your
   Cloudflare account (free tier is enough).
3. `npx wrangler kv namespace create SYNC_KV` - creates the KV namespace and
   prints an `id`. Paste that `id` into `wrangler.toml`'s
   `[[kv_namespaces]]` block, replacing `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.
4. Enable R2 on your Cloudflare account if you haven't already (Dashboard ->
   R2 -> Enable R2; one-time account-level opt-in, separate from accepting
   the Workers/KV terms), then `npx wrangler r2 bucket create
   choicebuds-sync` - creates the bucket `wrangler.toml`'s `[[r2_buckets]]`
   block already points `SYNC_R2` at.
5. `npx wrangler deploy` - deploys the Worker and prints its URL, something
   like `https://choicebuds-sync.<your-subdomain>.workers.dev`.
6. Paste that URL into `SYNC_WORKER_URL` in
   `src/renderer/services/syncApi.ts` (repo root, not this folder) and
   rebuild the app.

## Endpoints

- `POST /signup` - body `{"username", "password", "email"?}` -> `{"ok":true,"token"}`.
  Username is `2-32` letters/numbers/underscores, unique (case-insensitive).
  Password is at least 8 characters. `email` is optional and only used by a
  future password-reset flow - not sent anywhere in this leg.
- `POST /login` - body `{"username", "password"}` -> `{"ok":true,"token"}`.
  Issues a **new** token for this device without invalidating any other
  device's existing token. Locked out for 15 minutes after 10 failed
  attempts for that username.
- `GET /sync/:username` / `PUT /sync/:username` - require
  `Authorization: Bearer <token>`. `GET` 404s if the account exists but
  nothing's been pushed yet.

Data keys, split across two bindings:
- KV (`SYNC_KV`, prefixed): `account:<username>`, `tokens:<username>` (up to
  10 device tokens), plus the short-lived `loginfail:`/`signupthrottle:`
  counters - all low-volume, and KV's `expirationTtl` is what makes the
  15-minute login lockout and 60-second signup cooldown work.
- R2 (`SYNC_R2`, one bucket): `sync:<username>` (the `SyncPayload` blob) -
  the object every push/pull rewrites, moved off KV since it's the
  high-frequency one (see Costs/limits below). The write-throttle timestamp
  that used to live in KV's per-key `metadata` now lives in the R2 object's
  `customMetadata.receivedAt` (R2 metadata values are strings only, so it's
  stored as one and parsed back to a number). A GET/PUT that finds no R2
  object yet falls back to the account's old KV `sync:<username>` blob if
  one exists (pre-hybrid-storage accounts) - a PUT then writes its merge
  result to R2, migrating that account with no separate bulk-copy step.

Only *hashes* of passwords/tokens are ever stored - see `src/crypto.ts`.

## Local testing without deploying

`npm run dev` (runs `wrangler dev`) emulates the Worker + KV + R2 locally -
no real Cloudflare account access needed, so this works even before R2 is
enabled on your account or the bucket exists remotely:

```bash
curl -X POST http://localhost:8787/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"correcthorse"}'
# -> {"ok":true,"token":"..."}

curl -X PUT http://localhost:8787/sync/testuser \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token from above>" \
  -d '{"teams":[],"battles":[],"savedAt":1234567890}'

curl http://localhost:8787/sync/testuser \
  -H "Authorization: Bearer <token from above>"

# A second "device" signing in doesn't invalidate the first device's token:
curl -X POST http://localhost:8787/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"correcthorse"}'
```

`npm test` runs the unit tests for the pure crypto/validation helpers in
`src/crypto.ts` (`vitest`). The full HTTP handler isn't covered by an
automated test - no Miniflare/wrangler test harness is set up in this repo -
so exercise it manually via `wrangler dev` + curl as above, or through the
app's Settings page against a local deploy.

## Costs / limits

Free tier: Workers allows 100k requests/day. KV allows 1,000 writes/day and
100k reads/day, shared across every account this Worker ever serves - fine
for the account/token/lockout keys, which are low-volume, but too tight for
the sync blob (rewritten on every push/pull), which is why that one lives in
R2 instead: R2's free tier is ~1M Class A (write) operations and ~10M Class B
(read) operations per month, no egress fee. Same sharing caveat applies - R2
usage is also pooled across every account this Worker serves, just with a
much higher ceiling. The renderer only ever talks to this Worker's HTTP API,
never to KV/R2 directly, so any future storage swap needs zero client-side
changes.
