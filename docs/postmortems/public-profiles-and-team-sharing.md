# Post Mortem: Public Profiles & Team Sharing

**Shipped:** 2026-10-17 (single-day milestone, 3 done-when criteria across 4
scoping/implementation legs plus a follow-up fix leg).

## What shipped

1. **Safety Filter Research — Leg 1** (`21c811e`) — decided a word-list/
   pattern-based filter (pure function, no external moderation API) over a
   hosted API, since the sync Worker is infrastructure each user deploys and
   owns themselves and an API-key dependency would add real friction. Wrote
   the enforcement plan (client + Worker at username entry; client + a new
   server-side check at whichever endpoint serves public team names/
   nicknames) in
   `docs/investigations/public-profiles-safety-filter-research.md`. No code
   changed.
2. **Safety Filter Implementation — Leg 1** (`2553a35`) — picked `obscenity`
   (zero runtime deps, no Node-only APIs) and vetted it live against ~4,500
   real species/move/ability/item names plus VGC jargon, finding and fixing
   3 false positives (two-word names colliding with slur-evasion patterns,
   e.g. "Neutralizing Gas") via targeted allowlist entries. Implemented as
   hand-duplicated `worker/src/safetyFilter.ts` / `src/renderer/utils/
   safetyFilter.ts`, each with its own test suite, wired into `/signup` and
   `useSync.ts::signUp`. Ran it retroactively against all 4 existing real
   accounts — none flagged.
3. **Base Route — Leg 1** (`1c7a733`) — added `GET /profile/:username`
   (Worker) and the `/u/<username>` web route mounting a standalone
   `PublicProfilePage.tsx` outside the full `AppWeb` shell, so an
   unauthenticated visitor never pulls in Teams/Box/sync state. Added a
   GitHub Pages `404.html` SPA-fallback for direct links on the static
   build. Found live that pushing to `main` only redeploys the web app, not
   the Worker — the user ran `wrangler deploy` manually to get the real
   endpoint live.
4. **Per-Item Visibility Toggles — Leg 1** (`f0bb5cb`) — added `Team.isPublic`
   (off by default) and a new account-wide `FavoritePokemon` singleton
   (species-only), both managed from a new "Public Profile" Settings
   section. `GET /profile/:username` now reads the account's stored sync
   blob (`worker/src/publicProfile.ts`) to serve whichever teams/pick are
   toggled on, running team names and nicknames through `safetyFilter.ts`
   server-side as defense-in-depth. All three of the milestone's "done when"
   criteria were met by this commit; full suite passed, but live manual
   verification was still outstanding.
5. **Per-Item Visibility Toggles — Leg 2** (`14cbca3`) — live verification
   surfaced a real sync bug: toggling a team/the favorite pick public 400'd
   on every sync attempt. Root cause: `useSettings.ts`'s load-time migration
   only backfills top-level keys missing entirely, so the user's pre-
   existing `playerProfile` object (predating the `updatedAt` field) kept
   `updatedAt: undefined`, which drops on the wire and the Worker's
   `isOptionalSingleton` check rejects outright — failing the *entire* push,
   including unrelated teams/battles/savedPokemon. Fixed by deep-backfilling
   `playerProfile`/`favoritePokemon` to a real `Date.now()` `updatedAt` and
   persisting the correction. Also re-hit the Base Route leg's Worker-
   redeploy gotcha a second time before the live page actually reflected the
   fix. Confirmed working live by screenshot afterward.

Full suite at close: lint/type-check/test all pass — 82 renderer test files
(838 tests) and 4 Worker test files (46 tests).

## What went well

- The safety-filter research leg vetted the chosen library against real
  production data (~4,500 PokeAPI names) before writing any enforcement
  code, catching 3 false positives that a generic test suite wouldn't have
  surfaced, and fixed them with targeted allowlist entries rather than
  loosening the filter generally.
- Leg 1's own completion note flagged live verification as still
  outstanding instead of treating a clean full-suite pass as proof the
  feature worked end to end — that honesty is exactly what let Leg 2 catch
  the real `updatedAt` sync bug before calling the milestone done.
- The milestone correctly split out the harder, open-ended "public team
  browse/upload database" sub-scope (abuse/moderation model undecided) to
  its own Unscheduled TODO item rather than letting it block or balloon this
  milestone's three concrete done-when criteria.

## What didn't / friction points

- The Worker-needs-its-own-`wrangler deploy` gotcha was hit twice in this
  one milestone (Base Route leg, then again in Per-Item Visibility Toggles
  Leg 2) despite being documented after the first occurrence — the
  documentation didn't change the workflow, only explained the symptom
  after the fact each time.
- `useSettings.ts`'s shallow top-level-key backfill migration pattern
  (`{ ...DEFAULT_SETTINGS, ...database }`) silently produces `undefined` on
  nested fields added to an existing object shape after the fact, and this
  is now the second time that same shape of bug has been hit (the file's
  existing `defaultRegulation` fix was the first) — it's a repeating failure
  mode of the migration helper itself, not of any one field.

## Scope creep observed

None against the milestone's three "done when" criteria. The fourth
originally-scoped leg (shared public team browse/upload database) was
correctly split out to its own Unscheduled TODO.md item during scoping,
before any implementation work started on it.

## What changes for the next milestone

- `useSettings.ts`'s singleton load migration only backfills *missing*
  top-level keys, not missing nested fields on an object that already
  exists. Any future field added to `PlayerProfile`, `FavoritePokemon`, or
  a similar synced singleton needs an explicit backfill check (as Leg 2 just
  added for `updatedAt`), not just a type change — the type system won't
  catch a real saved file that predates the field.
- Any change under `worker/src/` needs its own `wrangler deploy` reminder
  surfaced *before* live verification is attempted, not discovered by a
  failed check each time. Worth a standing checklist line rather than
  relying on memory of the last time this bit.
