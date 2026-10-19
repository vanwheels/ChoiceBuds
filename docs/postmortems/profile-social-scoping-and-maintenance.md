# Post Mortem: Profile Social Scoping & Maintenance

**Shipped:** 2026-10-19 (4 legs, all same day).

## What shipped

1. **Profile Notes & Moderation — Leg 1** (`79f98f8`) — decided not to
   expose `Team.notes` on public profiles. Cheap to build (one more field
   filtered like `nickname`), but rejected on a privacy-mismatch basis:
   `notes` is personal strategy text written under a private-by-default
   expectation that predates Public Profiles & Team Sharing. Scoping-only,
   no code changed. See
   `docs/investigations/profile-notes-and-moderation-scope.md`.
2. **Player Search Directory — Leg 2** (`499d072`) — decided not to build a
   browsable username directory, reaffirming Profile System Revamp:
   Foundation's exact-username-lookup-only choice. Infra cost wasn't the
   blocker this time (a single Worker can already `KV.list` its own
   accounts) — the blockers were a privacy-default change at signup and low
   value at the project's real ~4-6-accounts-per-Worker scale. Closed the
   question outright rather than deferring it again. See
   `docs/investigations/player-search-directory-scope.md`.
3. **Player Favoriting / Friend System — Leg 3** (`f172bb3`) — decided not
   to build a friend/favorite system. The real "friend system" reading
   needs cross-account notification infrastructure that doesn't exist
   anywhere in the Worker (sync is manual, one-directional,
   `GET /profile/:username` is a one-shot unauthenticated read) — a new
   subsystem, not a cheap addition, for a signal the milestone-planning
   commit itself called tentative ("maybe"). A cheaper one-directional
   bookmark alternative was considered and rejected on its own terms. See
   `docs/investigations/player-favoriting-friend-system-scope.md`.
4. **Split useTeams.ts — Leg 4** (`c1405c0`) — split the 634-line
   `useTeams.ts` (flagged for a third consecutive milestone) along its
   natural seams: pure load/migration functions to
   `utils/teamMigrations.ts`, `applySyncedState`'s reconciliation algorithm
   to a pure `reconcileSyncedTeams` in `utils/teamSyncReconciliation.ts`.
   CRUD mutators stayed in the hook (inherently stateful, no split
   precedent elsewhere). `useTeams.ts` is now 499 lines.

Full suite at close: 88 test files, 875 tests, lint and type-check clean.

## What went well

- Three scoping legs in a row produced a genuine decision each time instead
  of a default "build it" — Leg 1 and Leg 2 each separately worked out that
  "cheap to build" and "worth building" are different questions, and said
  no anyway once the privacy or demand signal was absent.
- Leg 2 explicitly closed its question rather than re-deferring it to
  Unscheduled again — breaking a pattern from Profile System Revamp:
  Foundation, which had left it open.
- Leg 3 correctly sequenced itself after Leg 2 (a friend system needs
  discovery to exist first) rather than scoping both questions
  independently and risking a contradictory pair of decisions.
- Leg 4 finally executed a split flagged across three consecutive
  milestones' post mortems, closing out the longest-standing open item in
  recent `COMPLETED.md` history, and did it with zero behavior change
  (existing `useTeams.test.ts` passed unmodified) and a clean `/leg-review`.

## What didn't / friction points

- All three scoping legs reached "don't build" — a milestone entirely spent
  confirming the status quo. Not a problem in itself (the decisions were
  well-reasoned and now documented so the same questions don't get
  re-litigated from scratch), but worth naming: this milestone shipped no
  user-facing change at all.
- `/leg-review` on Leg 4 flagged one non-blocking note: the two new util
  files (`teamMigrations.ts`, `teamSyncReconciliation.ts`) were written to
  be unit-testable without React but don't yet have their own direct test
  file. Deferred rather than picked up in the same leg.

## Scope creep observed

None. Each leg matched its planned scope exactly — three scoping-only legs
with no implementation, one refactor leg with no behavior change.

## What changes for the next milestone

- None of this milestone's three "don't build" decisions need revisiting
  unless a real demand signal shows up — each investigation doc already
  states its own reopening condition (a new opt-in field for notes, a
  directory once a Worker outgrows friend-group scale, a bookmark feature
  if someone actually asks). No standing rule to promote from them; they're
  reference material, not process lessons.
- The useTeams.ts split closes a lesson that already existed (the 500-line
  hard cap); nothing new to add there beyond what's already in CLAUDE.md.
- Pick up the two new util files' direct test coverage only if either gets
  touched again, per `/leg-review`'s own note — not a standing action item
  otherwise.
