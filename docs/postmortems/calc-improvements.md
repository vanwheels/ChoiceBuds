# Calc Improvements — Post-Mortem

2026-10-24. Four items — one movepool-leak bug fix carried over from
Unscheduled, plus three UX/display gaps in the calc popup — bundled into
one milestone and shipped the same day.

## What shipped

- **Tera Blast Movepool Leak Fix** (Leg 1): `CHAMPIONS_PATCH_MOVEPOOL_REMOVALS`/
  `applyChampionsPatchRemovals` ran unconditionally for every species, but
  the "Tera Blast doesn't exist in Champions" rule only lived in
  `GLOBALLY_REMOVED_MOVES`, consulted only on the `hasChampionsMoveData ===
  false` fallback path — dead for virtually the entire roster. Added a
  blanket `CHAMPIONS_PATCH_GLOBALLY_REMOVED_MOVES` list to
  `config/championsMovepoolChanges.ts`. Live-verified via Playwright
  (Gengar and Baxcalibur both correctly exclude Tera Blast). See commit
  4dcd56f5e099043c52e513c741709464cf5275a2.
- **Calc Sprite Box Highlight** (Leg 2): `CalcTeamTray.tsx`/
  `CalcOpponentTray.tsx` now highlight the loaded Pokémon's sprite box,
  deriving the highlight from the panel's own `state.species` rather than
  a separate click-selection state. Manually verified. See commit
  48a2ee77f203a2fda5fd41871a54b68614831e85.
- **Calc Auto Damage-Roll Display** (Leg 3): added
  `useDamageCalc.ts`'s `effectiveSelectedResult`, defaulting to the
  faster side's highest-average-damage move once both Pokémon have a
  species and resolvable speed, with a real click still overriding it.
  Manually verified. See commit 51edbb348f5e04db6186c8081369993123b1210f.
- **Calc UI Sprites** (Leg 4): added `utils/calcSpriteResolve.ts`, reusing
  `vgcPasteRowDisplay.ts`'s tiered species-sprite lookup instead of
  duplicating it, and rendered a species sprite plus an item sprite
  (reusing `ItemSpriteBox.tsx`) in `CalcPokemonPanelFields.tsx`. Manually
  verified. See commit 24dcb801eec6a389535718c1395d91244b5a5cca.

## What went well

- Every leg reused existing infrastructure instead of adding parallel
  logic: Leg 2 reused `FormeToggle.tsx`'s species-matching convention, Leg 3
  only added a memoized default on top of the existing selection state, and
  Leg 4 reused `vgcPasteRowDisplay.ts`'s sprite-resolution tiering and
  `ItemSpriteBox.tsx` wholesale rather than writing new sprite-lookup code.
- Leg 1 followed through on a test-expectation change correctly: two
  `useGameData.test.ts` cases had asserted the old leaky behavior, and
  those were updated only after confirming with the user that the old
  behavior itself was the bug (per the global rule against silently
  flipping a failing test's expectation).
- All four legs shipped same-day with live/manual verification recorded in
  COMPLETED.md at the time, not reconstructed after the fact.

## What didn't go well / friction points

- None notable. All four legs were pre-scoped (Leg 1 carried over from
  Unscheduled; Legs 2-4 were the milestone's own stated done-when criteria)
  and none required rework or hit test failures.

## Scope creep observed

- None — `git log` across the milestone shows exactly four feature commits
  plus their four close-out docs commits, matching the four done-when
  criteria one-to-one.

## What changes for the next milestone

- No process changes. This milestone reinforced an existing pattern
  (reuse sprite/lookup infrastructure rather than duplicating it across
  Calc, Team/Box, and VGCPastes display code) rather than surfacing a new
  lesson worth promoting to a rule.
