# Public Profiles: Safety Filter Research

Scoping pass for Public Profiles: Safety Filter Research — Leg 1 (Public
Profiles & Team Sharing milestone). Question: for the three surfaces this
milestone makes publicly visible by URL with no login (usernames, public
team names, public Pokémon nicknames), what profanity/safety-filter approach
should be used (word-list library vs. a filtering API), and where should it
run (client-side validation vs. Worker-side)? No implementation in this leg.

## What exists today

- **Accounts are real but the sync backend is self-hosted per user.**
  `worker/src/index.ts` already runs real username+password accounts (KV for
  account/token state, R2 for the sync blob), but `worker/README.md` is
  explicit that this Worker is "infrastructure **you** own and run — nobody
  else can deploy to your Cloudflare account." Each of the ~4-6 existing
  accounts' owner deploys their own Worker instance by hand (`wrangler
  login` → create KV namespace → create R2 bucket → `wrangler deploy`), with
  zero external API keys anywhere in that flow today.
- **Username validation already exists, but only for character shape.**
  `worker/src/crypto.ts::isValidUsername` (`/^[a-zA-Z0-9_]{2,32}$/`) runs
  server-side at `/signup`. The renderer duplicates the same pattern by hand
  in `hooks/useSync.ts` (`USERNAME_PATTERN`) for immediate client-side
  feedback before the request round-trips — this duplication is an existing,
  established pattern in this codebase (same thing happens with the
  `Account`/`SyncPayload` shapes between `worker/src/index.ts` and
  `types/settings.ts`, "kept in sync by hand" per that file's own comment),
  not something new this leg would introduce. There is no profanity check at
  any layer today.
- **Team names and Pokémon nicknames are opaque to the Worker by design.**
  `PUT /sync/:username` treats each `Team`/`SavedPokemonEntry` record as
  `HasIdAndUpdatedAt` — the Worker only ever reads `id`/`updatedAt` to merge;
  the rest of the shape (including `Team.name` and a Pokémon's `nickname`)
  is opaque JSON it never inspects. Making team names/nicknames public is a
  new requirement from this milestone, not an existing capability — the
  still-unbuilt "Base Route" and "Per-Item Visibility Toggles" legs will need
  a new public-serving endpoint that, for the first time, reads inside those
  records specifically to render them. That endpoint is the real exposure
  boundary this filter has to guard, not the generic opaque sync endpoint.
- **No existing dependency in either `package.json`.** Neither the root app
  nor `worker/` currently pulls in any word-list or moderation-API package.

## Options considered

**Filtering API (e.g. a hosted moderation/profanity-check service).**
Rejected. It would be the first external network dependency inside either
the Worker's or the renderer's request path, and it doesn't fit the
self-hosted model: every one of the ~4-6 users who deploys their own Worker
would need to obtain and configure their own API key/secret for that
service, on top of the existing KV/R2 setup steps — real added friction for
a hobby-scale project. It also doesn't help client-side: the renderer is an
Electron/web bundle shipped to users, so any API key embedded there is
public, and routing every keystroke-level check through the Worker adds
latency and a new failure mode (the filter silently stops working if the
third-party service is down or the key expires) for a problem this project's
scale doesn't need solved that heavily.

**Word-list / pattern-based library, run as a pure function.** Chosen. No
network dependency, no secrets to provision, works fully offline (needed for
instant inline validation on the renderer side), and matches the exact
pattern `crypto.ts` already establishes for this class of concern in this
codebase: a small, pure, offline-testable validation function with its own
`*.test.ts`. A naive substring word-list risks false positives on legitimate
Pokémon-nickname/gamer-tag text (the "Scunthorpe problem" — innocuous names
containing a flagged substring), so Leg 2 should specifically evaluate a
library built to avoid that (whole-word/leetspeak-aware matching with an
allowlist), not just the first word-list package found. `obscenity` came up
as one candidate in a quick search — TypeScript-native, no Node-only APIs in
its matcher — but its current maintenance state wasn't verified here; Leg 2
should re-check that (or an alternative) against the Workers runtime
directly rather than trusting this leg's search.

## Decision

**Approach:** a word-list/pattern-based filter, implemented as a small pure
function (word list + matcher), not a hosted filtering API.

**Enforcement point, per surface:**

- **Username:** client-side at signup (immediate feedback in `useSync.ts`,
  mirroring today's `USERNAME_PATTERN` duplication) **and** server-side in
  `worker/src/crypto.ts`/`index.ts` at `/signup` (and any future
  username-change endpoint) — the same client-duplicates-server pattern
  already used for the character-shape check, since the Worker must never
  trust client-side validation alone for the account record it owns.
- **Public team name / public Pokémon nickname:** client-side at the
  existing rename/nickname-edit entry points (immediate feedback, prevents
  bad content from ever being saved locally) **plus** a server-side check at
  whatever new Worker endpoint ends up serving public profile data (the
  "Base Route"/"Per-Item Visibility Toggles" legs' public-read endpoint,
  since that is the first and only place the Worker actually looks inside
  `Team`/`SavedPokemonEntry` fields). The generic `PUT /sync/:username`
  endpoint stays opaque as today — it should not start parsing team/Pokémon
  internals just for this filter, since that would couple the sync protocol
  to renderer-specific shapes it currently doesn't need to know about.
  Server-side enforcement here is defense-in-depth against a modified client
  or a hand-crafted `PUT` bypassing the renderer's form validation, since
  these two fields (unlike username) can reach public display without ever
  going through `/signup`.
- Server-side failure handling (reject the public-toggle vs. redact at serve
  time) is an implementation detail for the Base Route/Per-Item Visibility
  Toggles legs to settle once that endpoint's shape exists — this leg only
  fixes that server-side enforcement must exist at that boundary, not its
  exact failure UX.

## Follow-up for Leg 2

Public Profiles: Safety Filter Implementation — Leg 1 should: pick and vet a
specific word-list library (or a hand-rolled list) against the Workers
runtime (no Node-only APIs) and against false-positive risk on real
Pokémon/VGC nicknames, add it as a pure module in both `worker/src/` and
`src/renderer/` (duplicated by hand per the existing pattern, since
`worker/` and the root app are separate `package.json`s with no shared
package today), wire it into the username entry points now, and run it
retroactively against the existing accounts' usernames per that leg's
existing scope. The public-team-name/nickname server-side check slots into
whichever endpoint the Base Route/Per-Item Visibility Toggles legs add, so
that part of the wiring happens there rather than in Leg 2.
