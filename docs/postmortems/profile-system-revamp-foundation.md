# Post Mortem: Profile System Revamp: Foundation

**Shipped:** 2026-10-18 (single-day milestone, 4 legs across 3 done-when
criteria plus a same-day `/leg-review` fix).

## What shipped

1. **In-App Profile Page & Navigation Shell — Leg 1** (`80ded0e`) — added a
   `useProfileNav` back-stack (a stack of usernames, not a single optional
   field) layered on top of the existing `ActiveTab` navigation in both
   `App.tsx`/`AppWeb.tsx`, so opening a profile never changes the active tab
   — "Back" just pops the stack and the underlying tab reappears untouched.
   The new in-app `ProfilePage` shares its fetch/render logic
   (`usePublicProfile`/`ProfileCard`) with the standalone `/u/<username>`
   route, which was left as-is for signed-out visitors. Settings'
   `/u/<username>` link was switched to open the profile in-app instead of a
   new browser tab.
2. **Sidebar Footer Profile Entry — Leg 2** (`258dcf0`) — pinned a profile
   icon+username entry above the Settings entry in both the desktop rail and
   mobile drawer, reusing `Sidebar.tsx`'s existing nav-item row styling by
   generalizing `renderNavItem` to take an explicit `isActive`/key pair
   instead of deriving it from `ActiveTab`. Hidden entirely when signed out.
3. **Teamsheet Open/Closed Visibility Tiers — Leg 3** (`faeba49`, `b98a4cc`,
   `e9e8a96`) — replaced the binary `Team.isPublic` with a 3-state
   `Team.visibility` (`'private'`/`'closed'`/`'open'`): `closed` keeps the
   original species+sprite-only exposure, `open` additionally exposes the
   full competitive set. `TeamsDatabase.schemaVersion` bumped to 2; an
   existing `isPublic: true` team migrates to `closed`, never `open`
   (widening exposure needs an explicit choice). Live-verified on desktop
   and web after a manual `wrangler deploy`. The same-day `/leg-review`
   found `applySyncedState` never ran incoming sync records through the
   load path's migration, so a legacy-shaped record from a stale device
   could win a merge and read back as `visibility: undefined` — fixed by
   routing every sync-merge-sourced team through `normalizeTeam` too.
4. **Move Profile Editing Onto the Profile Page — Leg 4** (`aaabec9`) —
   moved the team/teamsheet-tier visibility toggles and the favorite-
   Pokémon picker out of Settings' `PublicProfileSection` into a new
   `ProfileEditControls`, rendered by `ProfilePage` only when the viewed
   username matches the signed-in account. Settings now just links to the
   profile page instead of duplicating the controls. This closed the
   milestone's last done-when criterion.

Full suite at close: lint/type-check/test all pass — 83 renderer test files
(848 tests).

## What went well

- Scoping this milestone out of the prior day's Scoping Sweep paid off
  immediately: all three done-when criteria were concrete and sequential
  (navigation shell → sidebar entry → visibility model → edit surface), and
  each leg built directly on the previous one's output with no rework.
- The `/leg-review` on Leg 3 caught a real sync-merge gap
  (`applySyncedState` skipping migration) same-day, before it could surface
  as a user-visible "my team shows the wrong tier after sync" bug — the
  same pattern the prior milestone's post mortem flagged (`useSettings.ts`'s
  shallow-backfill class of bug), this time caught in review rather than
  live.
- Splitting the harder adjacent questions (profile notes/moderation, a
  player search directory, friend/favoriting) to Unscheduled rather than
  pulling them into this milestone's scope kept all 4 legs small and
  shippable in one day.

## What didn't / friction points

- `useTeams.ts` grew from 588 to 634 lines handling the visibility
  migration and sync-merge fix, pushing it further past CLAUDE.md's 500-line
  hard cap. The cap was already being watched (it was close before this
  milestone started) but no leg budgeted time to split it preemptively —
  it's now its own Unscheduled TODO item instead.
- `ProfileCard.tsx`'s per-team render (plain text rows for item/ability/
  nature/EVs/moves) was flagged live during Leg 3 as needing a visual
  redo to match `TeamCard.tsx`/the export image's styled-card look, but
  fixing it wasn't in scope for this milestone — deferred to a future leg
  rather than scope-creeping Leg 3.

## Scope creep observed

None against the milestone's three done-when criteria. Three adjacent
questions surfaced during scoping (profile notes & moderation, a player
search directory, player favoriting/friends) were correctly split out to
Unscheduled rather than absorbed into this milestone.

## What changes for the next milestone

- When a hook is already close to the 500-line hard cap going into a
  milestone, budget a line-count check at the start of any leg expected to
  add meaningfully to it, rather than only reacting after `/leg-review`
  flags the overage.
- Any new team/account field that needs to flow through sync must be
  checked against both `useTeams.ts`'s load-path migration *and*
  `applySyncedState` — this is the second time a sync-merge path has been
  found skipping a migration step that the load path already had (see
  `docs/investigations/teamcard-notes-sync-race.md` for the first).
