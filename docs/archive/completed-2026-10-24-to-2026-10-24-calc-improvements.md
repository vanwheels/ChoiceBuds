# Completed Work Archive: 2026-10-24 to 2026-10-24 (Calc Improvements)

Archived from `COMPLETED.md` at the 2026-10-24 Calc Improvements milestone
boundary. Named with the milestone slug since it shares its date range with
the Display Bug Fix Sweep and Selection UX & Data Audit archives.

- **[Calc UI Sprites] — Leg 4** (2026-10-24)
  Added `utils/calcSpriteResolve.ts` to resolve a live sprite URL for
  Calc's own `state.species` text (sourced from @smogon/calc's bundled
  dex, carries no national dex id the way a saved Team/Box entry's
  `pokedexNumber` does), reusing `vgcPasteRowDisplay.ts`'s already-
  validated tiered lookup (direct roster match, then
  `normalizeSpeciesForAPI`'s slug fallback for bare default-forme names,
  then the Mega-sprite cache for Mega formes) rather than duplicating
  it. `CalcPokemonPanelFields.tsx` now renders that species sprite plus
  an item sprite (reusing `ItemSpriteBox.tsx`'s PokeAPI -> Serebii ->
  emoji fallback chain) next to their respective fields; threaded
  `speciesRosterState` through `App.tsx`/`AppWeb.tsx` -> `CalcPopup` ->
  `CalcPage` -> `CalcPokemonPanel` and added a `useMegaSpritePrefetch()`
  call in `CalcPage.tsx` so Mega sprites resolve too. Manually verified
  in `npm run dev`'s Calc popup. Closes out all four "Calc Improvements"
  done-when criteria. See commit 24dcb801eec6a389535718c1395d91244b5a5cca.

- **[Calc Auto Damage-Roll Display] — Leg 3** (2026-10-24)
  Added `useDamageCalc.ts`'s `effectiveSelectedResult` (`selectedResult ??`
  a memoized default pick: once both Pokémon have a species and a
  resolvable speed, the faster side's highest-average-damage move,
  skipping error/empty entries) - both `CalcMoveGrid`s' `selectedIndex` and
  `CalcResultPanel`'s `entry` now read from it instead of the raw click
  state, so the damage roll shows with no manual move click but a real
  click still wins. Manually verified: picking two Pokémon with moves set
  auto-highlights and displays the faster side's best move with no click,
  and clicking a different move row pins that instead. See commit
  51edbb348f5e04db6186c8081369993123b1210f.

- **[Calc Sprite Box Highlight] — Leg 2** (2026-10-24)
  Highlighted the loaded Pokémon's sprite box in `CalcTeamTray.tsx`/
  `CalcOpponentTray.tsx`, deriving the highlight from the panel's own
  `state.species` (same convention `FormeToggle.tsx` already uses) rather
  than tracking a separate click selection, so drag-drop loads, manual
  species edits, and Mega-toggling update it too. Manually verified in
  `npm run dev`. See commit 48a2ee77f203a2fda5fd41871a54b68614831e85.

- **[Tera Blast Movepool Leak Fix] — Leg 1** (2026-10-24)
  Closed the leak documented in
  `docs/investigations/missing-move-ability-descriptions.md`'s side-finding:
  `CHAMPIONS_PATCH_MOVEPOOL_REMOVALS`/`applyChampionsPatchRemovals` runs
  unconditionally for every species (before the `hasChampionsMoveData`
  gate), but the "Tera Blast doesn't exist in Champions" rule only lived in
  `GLOBALLY_REMOVED_MOVES`, which is only consulted on the
  `hasChampionsMoveData === false` fallback path — dead for virtually the
  entire roster. Added a blanket `CHAMPIONS_PATCH_GLOBALLY_REMOVED_MOVES`
  list (`tera-blast`) to `config/championsMovepoolChanges.ts` that
  `applyChampionsPatchRemovals` now strips for every species, rather than a
  per-species `CHAMPIONS_PATCH_MOVEPOOL_REMOVALS` entry (would mean an
  entry for virtually the whole roster, same reasoning
  `GLOBALLY_REMOVED_MOVES` itself already documents). Updated two
  `useGameData.test.ts` cases that had asserted the old leaky behavior,
  confirmed with the user before changing their expectations since they'd
  previously been passing. Live-verified in the running app (Calc popup,
  Playwright-driven): Gengar (common species, `hasChampionsMoveData: true`)
  no longer offers Tera Blast in its move search at all, and Baxcalibur
  (Reg M-C, `hasChampionsMoveData: false` fallback path) still excludes
  Tera Blast too with no regression to its own signature move (Glaive Rush
  still pickable).
  See commit 4dcd56f5e099043c52e513c741709464cf5275a2.
