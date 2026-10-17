# Post Mortem: Bug Fix & Small Features Sweep

**Shipped:** 2026-10-17 (single-day milestone, 3 done-when criteria across 5
legs).

## What shipped

1. **Sibling Hooks' `applySyncedState` Stale-Overwrite Race** (`24c9c13`) —
   closed the gap the prior milestone's post mortem
   ([teamcard-bug-fixes-dev-tooling.md](teamcard-bug-fixes-dev-tooling.md))
   flagged as its own next-milestone lesson: `useBattles.ts` and
   `useSavedPokemon.ts` carried the same blind-overwrite shape `useTeams.ts`
   had already been fixed for (stale debounced sync response discarding a
   local edit that had already won the `enqueueMutation` queue). Both hooks
   now take the same per-record `updatedAt` reconciliation, local-order-
   preserving base, and tombstone-aware drop/clear `useTeams.ts` already had,
   with four new regression tests per hook mirroring `useTeams.test.ts`'s
   existing cases.
2. **Web Download/Landing Page** (`bc0a41e`) — new `/download/` route
   serving an OS-appropriate installer link via two new pure, tested
   modules (`detectPlatform.ts`, `releaseAssets.ts`), falling back to a
   GitHub Releases link on fetch failure or missing assets. Verified against
   the real latest release's live asset list and confirmed live on
   choicebuds.vannyproductions.com.
3. **Web Content-Area Padding Fix** (`e836d52`) — `AppWeb.tsx`'s `<main>`
   had no padding at all (unlike `App.tsx`'s desktop shell), rendering pages
   like Battle Log edge-to-edge in the browser. Added `md:px-8 md:py-6`,
   gated to `md` and up so it doesn't double up with TeamsPage/BoxPageGrid's
   own mobile padding. The 5 tabs with no padding of their own below `md`
   (Battle Log, Statistics, Type Matchup, Speed Tiers, Settings) were
   deliberately left open as a separate Unscheduled TODO item rather than
   folded in. Verified live.
4. **Teams Tab Search Bar** (`9f34fe6`) — search input filtering the Teams
   list live by partial, case-insensitive species/nickname match, layered on
   top of the existing format filter. New `utils/teamSearch.ts`, tested.
5. **Item Usage Percentage Ordering** (`f1e0097`) — `ItemPickerPanel.tsx`
   was the one picker not sorted by Champions usage data, unlike the ability
   and move pickers. Wired the existing usage fetch/memo pattern through to
   items and mirrored the sort + percentage badge.

Full suite at close: lint/type-check/test all pass, 809 tests across 78
files.

## What went well

- Leg 1 directly resolved a lesson the previous milestone's post mortem
  named as its own carry-over ("worth a shared helper... rather than a
  third hand-copied implementation") instead of letting it sit as a known
  gap for another milestone. The fix applied the same shape `useTeams.ts`
  already proved out, so it landed as one leg rather than a fresh
  investigation.
- Two web-facing legs (Download page, Padding fix) were both verified live
  on the real deployed site rather than stopping at `dev:web`, matching the
  project's own CLAUDE.md rule that `dev:web`-only checking isn't enough for
  base-path/routing or GitHub Pages-specific behavior.
- The Padding fix leg recognized mid-leg that fully matching the desktop
  shell's padding would double it up on 5 pages with their own mobile
  padding, and scoped that cleanly into a separate Unscheduled item instead
  of either skipping the fix or silently expanding the leg to touch 5
  unrelated files.

## What didn't / friction points

- None notable — all 5 legs landed in their first pass with no reverts,
  no failing-test flags, and no re-scoping mid-leg beyond the padding
  carve-out above (which was a deliberate scope decision, not friction).

## Scope creep observed

None against the milestone's 3 done-when criteria. The padding fix's
5-tab gap and the "Get the desktop app" sidebar link's low visibility
(flagged by Vanny after live-verifying the Download page) were both
correctly deferred to Unscheduled TODO.md items rather than folded into
this milestone's legs.

## What changes for the next milestone

- No new shared-helper or cross-cutting lesson this time — Leg 1 closed out
  the `applySyncedState` duplication lesson from the prior milestone, and
  `useTeams.ts`/`useBattles.ts`/`useSavedPokemon.ts` now share the same
  reconciliation shape across all three hooks. Worth watching for a fourth
  hand-copied implementation if a new synced collection is added, but no
  action needed now.
