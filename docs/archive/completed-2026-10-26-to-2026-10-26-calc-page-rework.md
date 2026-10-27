# Completed Work Archive: 2026-10-26 to 2026-10-26 (Calc Page Rework)

Archived from `COMPLETED.md` at the 2026-10-26 Calc Page Rework milestone
boundary. Named with the milestone slug for consistency with the other
same-day archives.

- **[Calc Page Rework: Dynamic Move Types] — Leg 8** (2026-10-26): Calc move rows are tinted by the type `calculate()` actually used (Weather Ball, Terrain Pulse, -ate abilities, Normalize), carried on each result entry as `moveType` and read from `result.move` (calculate clones the move), with the static type as fallback before a calc exists. Engine test written from the rule. Live-verified by the user in the running app. The move tooltip's dynamic type and ability-boost line (deferred from Leg 5) were not part of this leg. See commit da525a1.
- **[Calc Page Rework: Custom Dropdowns] — Leg 7** (2026-10-26): Calc Nature and Status are custom dropdowns (`CalcDropdown`) instead of native selects; Nature reuses `NaturePickerPanel` (new `options`/`percentByName` props) with colored +/- stats and usage %. Live-verified by the user in the running app: both panels on both sides stay inside their Pokémon card, match trigger width, and sit above the HP inputs. A follow-up fixed usage % and spread chips missing on Team/Box-loaded Pokémon (usage was only fetched on autocomplete picks); verified live. See commits 0f40c16, 4fcedab, 3899328 and 444348e.
- **[Calc Page Rework: Box Integration] — Leg 6** (2026-10-26): Removed the Calc Saved Sets modal and button; Saved Sets and Box were already one store (`useSavedPokemon`), so no data was wiped (the TODO's "wipe" premise was wrong). "Save Set" is now "Save to Box", and each side has a bottom `CalcBoxPanel` under its own card, with an instant hover card (nickname, species, nature, item, moves) clamped to the popup. `/leg-review` caught that loading a Box set into Pokémon 2 left the Battle Log opponent link set (it would have written the set back into the opponent entry); fixed, and Box's alphabetical sort is now shared. Live-verified by the user in the running app: Save to Box, loading into each side from its Box panel, panel widths matching the side cards, hover card. See commits 11b5482, 2c79bea, 6a5cc8b and 04fadb3.
- **[Calc Page Rework: Smart Pickers & Hover Details] — Leg 5** (2026-10-26): Calc ability and move pickers list the species' legal options first (new `useCalcLegalOptions`, Champions overrides respected) with the rest under an "All" heading once the user searches; item, ability and move hovers use the team builder's shared `Tooltip`/`TooltipContent`. Live-verified by the user in the running app: legal-first ordering and All section on both pickers, full tooltips on rows and current values. Ability-boost line and dynamic move type in the move tooltip are deferred to Leg 8. See commits 1133d9c and 52560d5.
- **[Calc Page Rework: Auto Weather & Terrain] — Leg 4** (2026-10-26): A species/ability change in the Calc now sets weather/terrain from `config/fieldSettingAbilities.ts` via the pure `utils/calcAutoField.ts` (Doubles: slower setter wins, tie/Singles: side that just changed; one-shot write so chip clicks override). Megas resolve through their granted ability. Tests written from the rule (8 resolver + 3 hook); two of my own resolver expectations were wrong and corrected the same leg. Live-verified by the user in the running app. See commit 71e99f4.

- **[Calc Page Rework: Current HP] — Leg 3** (2026-10-26): Added current HP as synced flat/% inputs (`curHp` state, null = full) feeding `@smogon/calc`, so KO text uses current HP while damage % stays of max HP. Tests cover the %/flat sync and the engine at partial HP; live-verified in the running app by the user. See commit 8de63bd.

- **[Calc Page Rework: Sprites & Icons] — Leg 2** (2026-10-26): Added
  semi-transparent animated side sprites behind each move grid
  (`CalcSideSprite.tsx`) and optional leading icons in `CalcAutocomplete`
  rows for species and items. Side sprites verified manually in the app; item
  icons mostly seen loading but not fully verified across all Champions items.
  Findings spun out to TODO.md (item list/scroll, forme load delay). See
  commit 538c8336a3e2f414da3183b55988fc01d4c4fb60.

- **[Calc Page Rework: Layout] — Leg 1** (2026-10-26): Widened the Calc popup,
  narrowed move boxes to ~25% each, tinted the move input through the Crit box
  by calc move type, replaced weather/terrain dropdowns with type-colored chips
  (inactive chips outlined, primal/Mega Rayquaza weathers removed), and added
  colored +/- nature effects. Verified manually in the running app: popup
  width, move boxes, move tint, weather chips, and the inactive-chip outlines.
  The colored nature +/- label and `dev:web` weren't separately reported. See
  commit 1f4a5e4a6631f34b898ee9d97751b5deeea21073.
