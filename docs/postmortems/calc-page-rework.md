# Calc Page Rework — Post-Mortem

2026-10-26. Eight legs reworking the Calc popup for web and app (mobile out
of scope), all shipped the same day.

## What shipped

- **Layout** (Leg 1, `1f4a5e4`): wider popup, ~25% move boxes, type-tinted
  moves, type-colored weather/terrain chips, colored +/- natures.
- **Sprites & Icons** (Leg 2, `538c833`): semi-transparent side sprites
  behind move grids; icons in species/item rows.
- **Current HP** (Leg 3, `8de63bd`): synced flat/% inputs feeding the engine.
- **Auto Weather & Terrain** (Leg 4, `71e99f4`): pure `calcAutoField.ts`,
  Doubles slower-setter-wins, one-shot so chip clicks override.
- **Smart Pickers & Hover Details** (Leg 5, `1133d9c`, `52560d5`): legal
  options first, "All" section on search, shared tooltips.
- **Box Integration** (Leg 6, `11b5482`..`04fadb3`): Saved Sets modal
  removed, per-side `CalcBoxPanel`.
- **Custom Dropdowns** (Leg 7, `0f40c16`..`444348e`): `CalcDropdown` for
  Nature/Status.
- **Dynamic Move Types** (Leg 8, `da525a1`): rows tinted by the type
  `calculate()` resolved.

Done check: 993 tests, lint and type-check pass; every leg live-verified by
the user except where noted in its entry.

## What went well

- Tests written from the stated rule (Leg 4 resolver, Leg 8 move type) and
  reuse of existing pieces (`NaturePickerPanel`, shared `Tooltip`, `useSavedPokemon`).
- `/leg-review` on Leg 6 caught the stale opponent link on Box load.

## What didn't / friction points

- Leg 7 dropdown panels took five fix commits (`bb1f38f`, `e54f72a`,
  `7b7b526`, `4fcedab`, `3899328`) for clipping/layering inside the card.
- Usage % and spread chips were missing for Team/Box-loaded Pokémon
  (`444348e`): loading was wired only to autocomplete picks.
- Leg 6's TODO premise ("wipe Saved Sets") was wrong; Saved Sets and Box were
  already one store.
- The move tooltip's dynamic type/ability-boost line was deferred from Leg 5
  and only noted in prose, so it was nearly lost at close-out.
- Two of my own Leg 4 resolver test expectations were wrong; corrected in-leg.
- The milestone section had no leg list or `Done when` lines, so criteria were
  reconstructed from the decisions paragraph.

## Scope creep observed

- None significant. Findings (height parity, item picker, forme load delay,
  animated sprite source) went to TODO.md Unscheduled rather than into legs.
  Leg 7's usage-load follow-up was a bug in the leg's own surface.

## What changes for the next milestone

- Active check on every Calc load path and popover placement:
  `.claude/rules/calc-entry-paths-and-popovers.md`.
- Verify store premises by grep before scoping; "deferred" gets a TODO item
  in the same commit: project `CLAUDE.md`.
- Milestone sections should carry `Done when` lines: global `/plan-milestone`
  change, left for Vanny.
