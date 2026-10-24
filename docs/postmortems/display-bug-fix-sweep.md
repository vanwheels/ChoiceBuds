# Display Bug Fix Sweep — Post-Mortem

2026-10-24. Two display bugs carried over from the Mega Form List Ordering
and Type-Changing Ability Move Badge Color items already sitting in
Unscheduled, bundled into one milestone and shipped the same day.

## What shipped

- **Mega Form List Ordering** (Leg 1): `AddPokemonStatTable.tsx` built its
  row list as `[...speciesRows, ...megaRows]`, so every Mega-Stone row
  trailed the full base-species list instead of sitting under its own
  species. Fixed by grouping Mega rows into a `Map` keyed by base species
  name and splicing each group in right after its species' row. Live-
  verified in the running app. See commit
  b17f9405a1e807f97d810ad0ee8db8228a371ad8.
- **Type-Changing Ability Move Badge Color** (Leg 2): `MoveBubbleGrid.tsx`
  and `TooltipContent.tsx` colored a move bubble/tooltip by its raw listed
  type even when an equipped type-changing ability (Aerilate, Pixilate,
  Refrigerate, Galvanize, Normalize, Liquid Voice) changes it in battle.
  Fixed by routing both through the existing
  `config/typeChangingAbilities.ts::getEffectiveMoveType`, already used by
  Type Matchup's Offensive Coverage, using the same Mega-aware ability
  `EditOverlays.tsx` already resolved for the move-boost indicator.
  Live-verified in the running app. See commit
  bf08e2edd692087e04fed3b4e2c2b4376a5cf201.

## What went well

- Both fixes reused existing infrastructure instead of adding new
  abstractions: Leg 1 only needed a different data-shaping step (grouping
  instead of concatenation) with no new types or files, and Leg 2 reused
  `getEffectiveMoveType` and the ability-resolution logic `EditOverlays.tsx`
  already had for the move-boost indicator feature. Neither leg touched
  `config/`.
- Both items had been sitting scoped-and-ready in Unscheduled from prior
  milestones (Mega Form List Ordering noted during Mega & Alt-Form
  Representation; the move badge color gap noted during Ability-Affects-
  Move Indicator work). Bundling them into one milestone and shipping both
  same-day took under an hour total with no new scoping work needed.

## What didn't go well / friction points

- None. Both legs were small, well-scoped bug fixes with no surprises,
  test failures, or rework.

## Scope creep observed

- None.

## What changes for the next milestone

- No process changes — this milestone was small and uneventful by design
  (pre-scoped carryover items), which is itself a useful data point: not
  every milestone needs a lesson, and a clean one shouldn't be stretched
  to manufacture one.
