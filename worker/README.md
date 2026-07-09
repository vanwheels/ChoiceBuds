# ChoiceBuds sync Worker

A tiny Cloudflare Worker backing ChoiceBuds' cross-device sync feature (see
`TODO.md`/`COMPLETED.md` in the repo root for the full design). Stores one
JSON blob per pairing identifier in Workers KV - `PUT`/`GET` at
`/sync/:identifier`. No accounts, no auth beyond the identifier itself.

This is infrastructure **you** own and run - nobody else can deploy to your
Cloudflare account, so these steps are for you to run yourself.

## First-time deploy

1. `cd worker && npm install`
2. `npx wrangler login` - opens a browser to authorize the CLI against your
   Cloudflare account (free tier is enough).
3. `npx wrangler kv:namespace create SYNC_KV` - creates the KV namespace and
   prints an `id`. Paste that `id` into `wrangler.toml`'s
   `[[kv_namespaces]]` block, replacing `REPLACE_WITH_YOUR_KV_NAMESPACE_ID`.
4. `npx wrangler deploy` - deploys the Worker and prints its URL, something
   like `https://choicebuds-sync.<your-subdomain>.workers.dev`.
5. Paste that URL into `SYNC_WORKER_URL` in
   `src/renderer/services/syncApi.ts` (repo root, not this folder) and
   rebuild the app.

## Local testing without deploying

`npm run dev` (runs `wrangler dev`) emulates the Worker + KV locally, e.g.:

```bash
curl -X PUT http://localhost:8787/sync/testuser%231234 \
  -H "Content-Type: application/json" \
  -d '{"teams":[],"battles":[],"savedAt":1234567890}'
curl http://localhost:8787/sync/testuser%231234
```

(`%23` is a URL-encoded `#` - the identifier is `testuser#1234`.)

## Costs / limits

Free tier: Workers allows 100k requests/day; KV allows 1,000 writes/day and
100k reads/day, shared across every identifier this Worker ever serves. Fine
for personal/small-group use. If this ever needs to scale past that, the
right move is switching the KV binding for an R2 bucket inside `src/index.ts`
- the renderer only ever talks to this Worker's HTTP API, never to KV/R2
directly, so that swap needs zero client-side changes.
