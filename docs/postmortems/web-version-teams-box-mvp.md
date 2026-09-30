# Post-mortem: Web Version: Teams & Box MVP

**Date:** 2026-09-29 (single day). **Status:** Shipped. Boundary: `git log`
range `fc758e5..cfc4876` — starts at the milestone's scoping commit, right
after Maintenance & Bug Fix Sweep shipped (`v0.8.1`, `bd5a171`), ends at the
Web Login/Signup UX closeout commit. Full implementation detail for every
item below lives in its own `COMPLETED.md` entry — this doc is the
retrospective, not a restatement.

## What shipped

Eight legs, all landed the same day:

1. **Scoping.** Resolved five architecture forks in conversation: local
   storage stays canonical, sync is an automatic background mirror, not the
   source of truth; sync moves from whole-blob overwrite to per-record
   last-write-wins (needs `updatedAt` + delete tombstones); the
   `username#XXXX` shared secret is replaced with real username+password
   accounts (no reset flow yet, but an optional email is collected at
   signup to avoid a later backfill); the renderer stays one shared
   codebase behind a storage-adapter interface rather than a forked web
   app; hosting on a `vannyproductions.com` subdomain. Full reasoning in
   [docs/investigations/web-version-scope.md](../investigations/web-version-scope.md).
2. **Sync Accounts: Username + Password.** Real accounts on the Worker,
   authenticated per device via a server-issued opaque bearer token instead
   of the password itself. Also fixed a live-discovered bug: the Worker's
   `GET` endpoint had no rate limiting, making the old 4-digit discriminator
   brute-forceable in ~10k requests. See commit `eb3653c`.
3. **Sync Data Model: Per-Record Merge & Auto Sync.** Replaced whole-blob
   push/pull with per-record last-write-wins merge plus tombstones; Box
   joined sync for the first time; `useSync` now runs automatically instead
   of needing a manual button. See commit `8f8fffa`.
4. **Web App Scaffold: Storage Adapter.** `StorageAdapter` interface with
   `ElectronStorageAdapter`/`IndexedDBStorageAdapter` implementations,
   lazily selected so Vitest's mock still resolves correctly; new `web/`
   Vite entry with a trimmed `AppWeb.tsx` shell proving the round-trip. See
   commit `68b2e0a`.
5. **Web Teams Parity.** Real `TeamsPage` wired in; five more hooks ported
   to the adapter. Fixed a test-isolation gap the port exposed (dangling
   debounced-write timers across hook tests) and, live, an unstyled-build
   bug from Tailwind v4's root-relative content scan. See commits `7fa9130`
   and `43f3385`.
6. **Web Box Parity.** Real `BoxPage` wired in; needed no further hook
   porting since its dependencies were already covered. See commit
   `d9ed9c3`.
7. **Web Hosting & Domain.** Narrowed to deploy+domain only after a
   sequencing check-in split login/signup into its own leg. Pivoted from
   the originally-planned Cloudflare Pages to GitHub Pages mid-leg once a
   live `wrangler pages deploy` attempt showed Cloudflare's Workers Custom
   Domains need the whole DNS zone on Cloudflare, too risky against
   `vannyproductions.com`'s existing IONOS-hosted email. Live at
   `https://choicebuds.vannyproductions.com`.
8. **Web Login/Signup UX.** Wired `useSync`'s auto-sync into `AppWeb.tsx`
   behind a dismissible, opt-in "Sign in to sync" prompt. The first pass
   wrongly gated the whole app behind sign-in; corrected same-day per
   Vanny's Showdown-style call (never lock the player out of using the app
   over an account). See commits `1210b69` and `3da0937`.

**Not closed with the rest:** the milestone's implicit 9th item, migrating
existing (pre-accounts) friends' data into the new system, moved to
`TODO.md`'s `Blocked` tier instead of shipping with the milestone — see
"What changes for the next milestone" below.

Separately, the same day: Vanny migrated his own real local data (17 teams,
31 battles, 8 saved Pokémon) into his new account by building from source
and running the real Electron binary, since his installed release predates
accounts entirely. That surfaced a real production bug (see below) but is
its own `COMPLETED.md` entry, not one of the eight legs.

## What went well

- **Front-loading the architecture forks into a single scoping leg** meant
  none of the seven build legs had to stop and re-litigate a design
  decision mid-implementation — every fork (accounts model, sync model,
  storage adapter vs. forked app, hosting target) was already resolved
  before the first line of code.
- **The hook-by-hook storage-adapter porting order worked cleanly**:
  scaffold two hooks first to prove the round-trip, then port whatever each
  page actually needed as that page's own leg. Box Parity needed zero
  additional porting because Teams Parity had already covered its
  transitive dependencies.
- **The login-gating mistake was caught and corrected the same day**,
  before it reached any real user — Vanny's live check flagged it
  immediately against the existing desktop precedent (Showdown-style,
  account optional) rather than it shipping as a silent behavior change.

## What didn't go well / friction points

- **The Cloudflare Pages pivot cost a dead-end attempt**, not just a
  decision reversal: an initial `wrangler pages deploy` silently created a
  plain Worker instead of a Pages project, deployed the wrong build output,
  and mutated the root `vite.config.ts`/`package.json` with an unrelated
  plugin — all had to be reverted locally and the stray Worker deleted
  before redoing the deploy cleanly on GitHub Pages.
- **The KV merge's eventual-consistency race was only discovered live**,
  during Vanny's own account migration, not caught by any test: a
  freshly-signed-up second device with empty local state auto-synced
  moments after the real push and clobbered it by reading a stale
  pre-push snapshot. Recovered manually; the real fix (`cacheTtl: 0` or a
  resettlement delay) is still open and needs a call on approach.
- **Existing-account migration turned out to be gated on more than code**:
  it needs a real release to exist (deliberately held back, so existing
  users skip straight to a more-finished web-sync story) and needs each
  friend to actually reach out with their old identifier — neither of
  which this milestone's build legs could resolve by writing more code.

## Scope creep observed

- None inside the eight build legs themselves — Web Hosting & Domain
  narrowing to deploy+domain and splitting Login/Signup UX out was a
  sequencing correction caught before work started, not creep discovered
  mid-leg.

## What changes for the next milestone

- **Don't fold an operationally-blocked item (needs other people, needs a
  future release) into a feature milestone's `Current Milestone:` section
  in the first place** — Maintenance & Bug Fix Sweep's postmortem already
  flagged this exact pattern (a `Blocked` item holding a milestone open
  with no natural closing moment) and this milestone hit it again anyway.
  Next time: if an item's exit condition is external to this codebase,
  route it straight to `Blocked` at scoping time instead of into the
  current milestone.
- **A new hosting platform is worth a small dry-run before touching root
  config** — the Cloudflare Pages attempt mutated `vite.config.ts`/
  `package.json` before it was confirmed working, which is what made the
  revert necessary. A throwaway test deploy in isolation would have caught
  the Workers-vs-Pages routing surprise without touching real files.
- **The KV race needs an actual fix, not just a documented workaround**,
  before more than one or two accounts are actively multi-device syncing -
  worth deciding on `cacheTtl: 0` vs. a resettlement delay before the
  friend migrations in `TODO.md`'s `Blocked` tier start landing for real.
