# Post Mortem: Mobile Web & UI Polish

**Shipped:** 2026-10-17 (single-day milestone, 3 done-when criteria across 4
legs).

## What shipped

1. **Mobile Web Content-Area Padding Fix** (`0ef6aaa`, Leg 1) — Battle Log,
   Statistics, Type Matchup, Speed Tiers, and Settings (plus
   `RecordMatchForm`'s in-place record/edit view) each gained their own
   `px-4 md:px-0` on their root container, matching `TeamsPage.tsx`'s
   existing pattern so `AppWeb.tsx`'s unpadded mobile `<main>` no longer
   leaves them edge-to-edge below `md`. This closed the 5-tab gap the prior
   milestone's padding fix deliberately deferred rather than folding in.
2. **Download App Sidebar Link Visibility** (`66650cd`, Leg 2) —
   `AppWeb.tsx`'s sidebar footer "Get the desktop app" link became a solid
   accent-gold button with a new `DownloadIcon`, moved above the Settings
   nav item per live feedback, and shortened to "Desktop App" to stop it
   wrapping onto a second line. `Sidebar.tsx`'s `renderFooter` reorder
   applies to both the desktop rail and mobile drawer, and falls back
   correctly when no `renderFooter` is passed (`App.tsx`'s desktop
   sidebar).
3. **Team Picker Sprites: Shared Component + Adoption** (`661e7e9`, Legs
   3-4) — new `TeamPickerDropdown.tsx` (searchable, sprite-per-row, same
   pattern as `AbilityPickerPanel.tsx`/`ItemPickerPanel.tsx`) replaces the
   plain native `<select>` previously duplicated across
   `CalcTeamTray.tsx`, `SpeedTiersPage.tsx`, `TypeMatchupPage.tsx`, and
   `RecordMatchForm.tsx`. Verified live on all 4 sites via `run-desktop`,
   including `CalcTeamTray`'s own separate click/drag-to-load sprite row
   and its live sync with `RecordMatchForm`'s picker through the existing
   Battle Log session integration.

Full suite at close: lint/type-check/test all pass, 809 tests across 78
files.

## What went well

- All 4 legs landed in their first pass — no reverts, no re-scoping
  mid-leg, no failing-test flags.
- Leg 1 directly closed the gap the previous milestone's own post mortem
  ([bug-fix-small-features-sweep.md](bug-fix-small-features-sweep.md))
  named as a deliberate carve-out rather than letting it sit indefinitely
  as an Unscheduled item.
- Legs 3-4 reused an existing shared-component pattern
  (`AbilityPickerPanel.tsx`/`ItemPickerPanel.tsx`) instead of designing a
  new one from scratch, so adopting it across 4 call sites stayed a single
  leg rather than ballooning into per-site rework.
- The sprite picker rollout was verified live across all 4 call sites,
  including a cross-component interaction (`CalcTeamTray`'s drag-to-load
  row syncing with `RecordMatchForm`'s picker) that unit tests alone
  wouldn't have caught.

## What didn't / friction points

- Minor: wiring `TeamPickerDropdown` into `RecordMatchForm.tsx` changed
  `handleCalcUpdate`'s surrounding JSX shape enough that the React
  Compiler's memoization-preservation check started flagging
  `setOpponentRoster` as an inferred `useCallback` dependency that hadn't
  been listed before. Added it to the deps array - a no-op at runtime
  since the setter is stable, but worth knowing this check can retrigger
  on JSX reshaping even when the underlying logic doesn't change.

## Scope creep observed

None against the milestone's 3 done-when criteria. A live mobile-web bug
report (tapping into an empty team doesn't let you add a Pokémon,
surfaced 2026-10-17 during this milestone's mobile-focused work) was
correctly deferred to its own Unscheduled TODO item for a dedicated repro
pass rather than folded into an in-flight leg.

## What changes for the next milestone

- No new cross-cutting lesson this time. The one open thread worth
  tracking: the newly reported mobile empty-team bug needs its repro pass
  on `dev:mobile` before it's scoped into concrete legs — see TODO.md's
  Unscheduled section.
