# Public Team Browse & Upload Database — Scoping

Scoping pass for Scoping Sweep — Leg 3. Split out of Public Profiles & Team
Sharing's scoping (2026-10-17, see `docs/postmortems/public-profiles-and-
team-sharing.md`): a shared public team browse/upload database, distinct
from the per-account visibility toggles that milestone shipped. Question:
pick an abuse/moderation model for public uploads, or decide not to build
this. Research/decision only — no implementation.

## What exists today

- **Every Worker is self-hosted per account, by design.** `worker/README.md`
  is explicit: "this is infrastructure **you** own and run — nobody else
  can deploy to your Cloudflare account." Each of the ~4-6 existing accounts'
  owner runs their own Worker/KV/R2 instance. There is no central,
  project-wide service anywhere in this codebase today.
- **Public Profiles & Team Sharing (shipped 2026-10-17) is scoped per
  account, not shared.** `GET /profile/:username` is served by *that
  account's own* Worker instance and only returns teams/the favorite pick
  that account's owner explicitly toggled public
  (`worker/src/publicProfile.ts`), run through the word-list
  `safetyFilter.ts` server-side as defense-in-depth. It's opt-in exposure of
  one known, existing account's own data — not a shared pool anyone can add
  to.
- **`/u/<username>` already covers "share my team publicly."** The Base
  Route leg's standalone `PublicProfilePage.tsx` + web route means any user
  can already hand out a direct link to their own public teams today, with
  zero additional infrastructure.
- **No reporting/takedown/admin mechanism exists anywhere in this project.**
  There's no admin UI, no flag-for-review flow, no staff beyond the solo
  maintainer. Abuse handling for anything public-facing today is manual and
  ad hoc (none has been needed yet, at ~4-6 accounts).

## The real scope question: who would host it?

A "browse database" implies content visible in one place across *many*
users, not just one account's own profile page. Two ways to build that, and
both run into the same problem:

1. **Aggregate across each user's own self-hosted Worker.** Would need every
   self-hoster to register their Worker's URL somewhere central so a browse
   page could poll/index them — that central index doesn't exist, and
   building it means this project now runs its own always-on, publicly
   reachable service for the first time.
2. **A single new central database that anyone uploads to directly**
   (independent of the self-hosted sync accounts) — the more likely reading
   of "upload database," closer to how Pokepaste/VGCPastes work. This is
   categorically different from every other Worker feature shipped so far:
   it's not something a user deploys and owns themselves, it's a
   project-wide service that only the maintainer runs, reachable by anyone
   on the internet, not just the ~4-6 known accounts.

Either path makes this the project's first centrally-hosted, publicly
writable service. That's a bigger decision than "which moderation model,"
and it's the thing actually driving the moderation burden below — a
self-hosted, opt-in, per-account model (what shipped) never had this
problem because exposure was bounded to content its own owner chose to
publish.

## Options considered (for a moderation model, if built)

**Fully open, unauthenticated uploads (Pokepaste-style — paste a team, get a
link, no account needed).** Rejected outright. Zero accountability for any
submission, the worst version of the abuse surface, and inconsistent with
every other write path in this project, which all require an authenticated
account.

**Automated filter only, reusing `safetyFilter.ts` at submission.**
Insufficient alone. The existing word-list filter was vetted for
profanity/slurs in short identifier-like strings (usernames, team names,
nicknames) on an opt-in, already-accountable surface. It does nothing
against spam volume, bulk junk uploads, or repeated submissions — the
actual shape of abuse an open public-upload endpoint invites, which the
opt-in profile pages were never exposed to.

**Account-gated uploads (reuse existing sync accounts/token auth) +
`safetyFilter.ts` + per-account rate limiting + a report/manual-takedown
flag.** The most defensible design if this were built: ties every
submission to one of the real accounts that already exist, bounds volume,
and reuses infrastructure already vetted (Safety Filter Implementation —
Leg 1). Still leaves an open-ended obligation this project has no mechanism
for today: someone has to see and act on reports, indefinitely, with no
admin tooling and no staff beyond the solo maintainer.

**Don't build it.** `/u/<username>` (shipped) already satisfies "let people
see my public teams" via a direct link, with no shared infrastructure and
no new abuse surface. The only thing a shared browse/upload database adds
on top is discoverability across users who don't already know each other's
usernames — a real but much smaller feature than "public team database,"
and one with no demand signal beyond the original idea (nobody has asked
for it).

## Decision

**Not building this.** Reasons:

- It would be the project's first centrally-hosted, publicly-writable
  service — a different operational category than the self-hosted-per-
  account model every other Worker feature uses, moving hosting cost and
  internet-facing exposure onto the maintainer's own Cloudflare account
  instead of each user's own.
- Even the most conservative design (account-gated, filtered, rate-limited)
  still creates an unbounded ongoing moderation obligation — reports and
  takedowns, forever — that this project has no tooling or staffing for
  today, for a hobby-scale project at ~4-6 known accounts.
- The actual "share my team publicly" need is already met by `/u/<username>`
  (shipped 2026-10-17), with none of the above risk.
- No demand signal beyond the original idea — this was scoped out of Public
  Profiles & Team Sharing speculatively, not in response to anyone asking
  for cross-user discoverability.

If real demand for cross-user discoverability shows up later, the minimum
viable version is the account-gated design above (reuse existing auth +
`safetyFilter.ts` + per-account rate limit + a simple report/admin-delete
flag) — but that's a re-scope for whenever that demand is real, not now.
