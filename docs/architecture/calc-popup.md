# Calc popup

Deep-dive split out of `ARCHITECTURE.md`; the summary there links here.

`CalcPage.tsx` renders the damage calculator: two `CalcMoveGrid`s (one per
Pokémon) above a shared `CalcResultPanel`, then a 3-column row
(`CalcPokemonPanel` | `CalcFieldPanel` | `CalcPokemonPanel`). `useDamageCalc.ts`
wraps `@smogon/calc` and owns both sides' state; `CalcPage.tsx` instantiates
it (not `App.tsx`) so the engine stays behind the lazy-loaded tab boundary.

- **Result selection**: `useDamageCalc.ts`'s `effectiveSelectedResult` is
  `selectedResult ?? ` a memoized default — once both Pokémon have a species
  and a resolvable speed, the faster side's highest-average-damage move
  (skipping error/empty entries). Both `CalcMoveGrid`s' `selectedIndex` and
  `CalcResultPanel`'s `entry` read from it, so the likely matchup shows with
  no manual click, but a real click on a move row still pins that instead.
- **Sprites**: Calc's `state.species` is typed/selected against
  `@smogon/calc`'s own bundled species list, which carries no national dex
  id the way a saved Team/Box entry's `pokedexNumber` does. `utils/
  calcSpriteResolve.ts`'s `resolveCalcPokemonSpriteUrl` resolves one on the
  fly, reusing `vgcPasteRowDisplay.ts`'s tiered roster lookup (direct match,
  then `normalizeSpeciesForAPI`'s slug fallback) plus `useMegaSprite.ts`'s
  cache for Mega formes, rather than duplicating that lookup.
  `CalcPokemonPanelFields.tsx` renders the resolved species sprite plus an
  item sprite (reusing `ItemSpriteBox.tsx`'s PokeAPI → Serebii → emoji
  fallback chain). `speciesRosterState` is threaded down from `App.tsx`/
  `AppWeb.tsx` for this; `CalcPage.tsx` also calls `useMegaSpritePrefetch()`
  so Mega sprites resolve too. `CalcSideSprite.tsx` cross-fades the static
  sprite into the Showdown GIF (rendered at 1.2x native size) to avoid a
  visible swap; the Pokémon panel root is `flex-1` so both sides and their
  Box panels align.
- **Sprite-box highlight**: `CalcTeamTray.tsx`/`CalcOpponentTray.tsx`
  highlight the loaded Pokémon's sprite box by comparing each tray entry's
  species against the active panel's own `state.species` (the same
  convention `FormeToggle.tsx` uses), not a separate click-selection state —
  so drag-drop loads, manual species edits, and Mega-toggling all update the
  highlight for free.
- **Box loading**: each side has its own `CalcBoxPanel.tsx` listing the same
  `useSavedPokemon` entries the Box tab shows (there is no separate Calc
  "saved sets" store); a click loads that entry into its own side only. A
  panel's "Save to Box" writes through `addSavedPokemonBatch`.
- **Auto weather/terrain**: a species or ability change sets the field via
  the pure `utils/calcAutoField.ts` from `config/fieldSettingAbilities.ts`
  (Doubles: slower setter wins, tie/Singles: the side that just changed;
  Megas resolve through their granted ability). It is a one-shot write, so a
  manual chip click overrides it until the next species/ability change.
- **Current HP**: `curHp` state (null = full) is a synced flat/% input pair
  feeding `@smogon/calc`; KO text uses current HP while damage % stays of max.
- **Pickers and dropdowns**: `useCalcLegalOptions` lists a species' legal
  abilities/moves first (Champions overrides respected) with the rest under
  "All" once the user searches. Item/ability/move hovers reuse the team
  builder's `Tooltip`/`TooltipContent`. Nature and Status use `CalcDropdown`
  (Nature reuses `NaturePickerPanel`). The item picker lists only
  `VGC_ITEMS` (the full `@smogon/calc` list is kept as `allItemOptions` for
  the "All" section) with `maxResults={Infinity}`. `CalcAutocomplete` tracks
  an `edited` flag: an unedited open (select-all on focus) lists every
  option instead of filtering by the current value.
- **Dynamic move type**: each result entry carries `moveType` read from
  `result.move` (calculate clones the move), so move rows tint by the type
  actually used (Weather Ball, -ate abilities); the static type is the
  fallback before a calc exists.
