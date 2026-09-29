# Web Version: Teams & Box MVP — Scoping Session

Scoped 2026-09-29. Vanny wants to reopen a web-version discussion he'd
previously deferred on this project and on GW2Squaded (GW2Squaded's web
functionality stays deferred; this is the first real test of the approach).
Minimum scope: Teams + Box working on the web, with room to add the rest of
the app's features later. This session resolves the open architecture forks
before any legs get built.

## Decided

- **Local storage stays canonical; sync is an automatic mirror, not the
  source of truth.** IndexedDB on web, the existing `teams.json`/
  `pokeapi-cache.json` files on desktop — offline capability doesn't change
  on either platform. Sync runs in the background (on mutation, debounced;
  on reconnect; on an interval) instead of needing the existing manual
  push/pull button, which becomes a fallback "sync now" rather than the
  primary trigger.
- **Sync moves from whole-blob overwrite to per-record merge.** Today's
  Worker (`worker/src/index.ts`) stores one JSON blob per identifier and
  each push replaces it wholesale — fine for a manual, one-directional-at-a-
  time model (`useSync.ts`'s own doc comment says as much: no backend
  arbitrates real conflicts because the human picks push-or-pull direction).
  Automatic sync removes that human conflict-avoidance, so `Team`/
  `SavedPokemonEntry` need an `updatedAt` timestamp and a delete tombstone,
  and the Worker needs to merge per-record (last-write-wins) instead of
  accepting/returning one opaque blob. Full CRDT-style merging is overkill
  for this app's scale.
- **Real accounts: username + password, not the current shared-secret
  identifier — and not full accounts with reset, either.** Two things
  pushed this beyond the original "harden the identifier" idea:
  1. Vanny wants shareable public profiles (viewing someone's public teams)
     as a real feature, which means the username needs to be safe to
     display everywhere, not a secret.
  2. The current `username#XXXX` identifier *is* the credential — visible
     in Settings, visible if streaming your screen, and only 10,000
     possible discriminators per username with **no rate limiting on the
     Worker's `GET` endpoint today** (confirmed reading
     `worker/src/index.ts`: only `PUT` has a throttle, and it's a 3s
     anti-spam throttle, not anti-brute-force). A password fixes both
     problems at once: it's designed to be memorable (easier new-device
     setup than a long random token, which was the original harden-the-
     identifier proposal Vanny pushed back on) and it's never displayed on
     screen, so it doesn't leak the way the current identifier does.
  - Username becomes a unique, public-facing handle. No more `#XXXX`
    discriminator — that only existed to let usernames collide safely
    under the old secret-identifier model; a real login doesn't need it.
  - Password hashed server-side (Workers has Web Crypto's PBKDF2/scrypt;
    no external bcrypt dependency needed).
  - Collect an **optional email field at signup**, but do not build the
    reset flow itself in this milestone. Reset needs a third-party
    transactional email API (Workers can't send mail directly) plus
    domain-deliverability setup (SPF/DKIM) — not hard, but a new external
    dependency this project doesn't have today, and not worth taking on
    before the account system itself is proven. Collecting the field now
    avoids having to ask existing users to backfill it later, which is the
    one part of this that's awkward to retrofit.
  - Accepted tradeoff: **no password reset for now.** Lose your password,
    you lose write access to that account and make a new one — same
    failure mode the current identifier model already has. Reasonable for
    a project at this scale; revisit if the account count actually grows.
  - When reset eventually gets built: send from a **dedicated subdomain**
    of vannyproductions.com (e.g. `mail.vannyproductions.com`), not the
    root domain — Vanny's email is hosted through IONOS already, and a
    dedicated sending subdomain gets its own SPF/DKIM records with no risk
    of interfering with his existing mailbox's records.
  - Fix the Worker's missing `GET` rate limit as part of this leg, since
    it's the same auth surface already being reworked.
- **Public profile / team-sharing pages are a real desired feature, but are
  explicitly deferred past this milestone** (see below) — the username
  design accommodates it (public-safe handle) but the actual public routes
  and any per-team public/private toggle are separate scope.
- **Shared codebase, not a separate web app project.** Add a storage-
  adapter interface behind `useTeams`/`useDatabase` with two
  implementations (existing Electron IPC, new IndexedDB), and a new `web/`
  folder (sibling to `worker/`) holding its own Vite entry and a trimmed
  `App` shell (Teams + Box nav only). The parser, `pokeapi.ts`, and
  `config/` are already environment-agnostic (pure functions/`fetch`, no
  Electron dependency) and don't need to change. Tradeoff: this means
  touching `useTeams`/`useDatabase` now to go through the adapter interface
  rather than duplicating the app, but it's the only way the shared logic
  doesn't fork into two copies that drift.
- **Hosting: Cloudflare Pages, on a vannyproductions.com subdomain.** The
  sync Worker already lives on Cloudflare, so one dashboard covers both.
  Vanny's domain is on IONOS (not Cloudflare DNS), so attaching a custom
  domain means one manual CNAME record in IONOS's panel — same amount of
  work GitHub Pages would need, so there's no cost difference between the
  two hosts; Cloudflare wins on having everything in one place. Exact
  subdomain name (e.g. `choicebuds.vannyproductions.com` vs.
  `app.vannyproductions.com`) is a detail for the hosting leg, not decided
  here.
- **Existing-user migration: manual, not a built feature.** Only ~4-6
  accounts exist today (Vanny + friends). Once the new account system
  ships, copying each person's old `username#XXXX`-keyed KV blob to their
  new account is a one-off `wrangler kv` copy per person (or a throwaway
  script), coordinated directly. A self-service "claim your old
  identifier" step in signup was considered and rejected — it'd be
  permanent code for a one-time transition with no future use once
  everyone's migrated.

## Deferred / explicitly out of scope for this milestone

- **Password reset flow** (email sending, SPF/DKIM subdomain setup,
  deliverability) — the optional email field ships now; the flow itself
  waits until warranted.
- **Public profile / team-sharing pages** — a real fast-follow, not core
  MVP. Needs its own scoping pass (what's public by default, is there a
  per-team toggle, what does a public profile URL look like) once the
  account system and web app exist to build it on top of.

## Resulting legs

See `TODO.md`'s Current Milestone section:
- **[Sync Accounts: Username + Password] — Leg 1**
- **[Sync Data Model: Per-Record Merge & Auto Sync] — Leg 1**
- **[Existing Account Migration] — Leg 1** (blocked on the accounts leg)
- **[Web App Scaffold: Storage Adapter] — Leg 1**
- **[Web Teams Parity] — Leg 1** (needs the scaffold leg)
- **[Web Box Parity] — Leg 1** (needs the scaffold leg)
- **[Web Hosting & Domain] — Leg 1** (needs the web app to exist)
