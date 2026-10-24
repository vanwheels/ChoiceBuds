# ChoiceBuds - Completed Work Archive (2026-10-23 to 2026-10-24: Search & Filter: Tag-Chip Redesign)

Archived from `COMPLETED.md` at the 2026-10-24 Search & Filter: Tag-Chip
Redesign milestone boundary. See
[docs/postmortems/search-and-filter-tag-chip-redesign.md](../postmortems/search-and-filter-tag-chip-redesign.md).

## Search & Filter: Tag-Chip Redesign

- **[Search & Filter: Tag-Chip Redesign] — Leg 1** (2026-10-23): Added the
  `{category, value}` `TagChip` data model, pure matching/dedupe/
  disambiguation logic, and a standalone `TagChipInput` component (no real
  consumer wired in yet). Unit tests cover space/hyphen-insensitive
  matching and type/move disambiguation (e.g. Psychic); a component render
  test caught `addChip` storing the autocomplete option's `label` onto the
  chip itself, fixed before merge. See commit `2dc9bcc`.

- **[Search & Filter: Tag-Chip Redesign] — Leg 2** (2026-10-24): The leg's
  original scope targeted `SpeciesPickerCard.tsx` for Roster Swap + the
  "+ Add Pokémon" slot, but `AddPokemonStatTable.tsx` had already replaced
  it at both call sites (plus Box's "+ New Build") back on 2026-10-16 -
  wired `TagChipInput` into `AddPokemonStatTable.tsx` instead, the real
  target, each chip now routing directly by category into
  `usePokemonTypeFilter`/`usePokemonMoveFilter`/`usePokemonAbilityFilter`
  rather than the old `#tag` text-probing chain. Added
  `fetchAllAbilityNames`/`useAbilityNameList.ts` for the ability column's
  autocomplete candidates. Also wired `TagChipInput` into
  `SpeciesPickerCard.tsx` itself (still live for Battle Logger's opponent
  picker) before finding the above. Live-verified 2026-10-24 across three
  rounds in `npm run dev` (Roster Swap + the Add-Pokémon slot, Psychic
  type/Expanding Force move chip combo), surfacing and fixing five UX
  issues: two search boxes merged into one, a loading chip no longer
  collapses the whole result list, the modal panel no longer shrinks to
  fit a narrow result set, and the autocomplete dropdown no longer floats
  over (and hides) matching rows below it. See commit `6780314`.

- **[Search & Filter: Tag-Chip Redesign] — Leg 3** (2026-10-24): Wired
  `TagChipInput` into Box search (`BoxPageToolbar.tsx`'s desktop box,
  `BoxPage.tsx`'s mobile popover box - two instances sharing one `chips`
  array), same category-routed `usePokemonTypeFilter`/
  `usePokemonMoveFilter`/`usePokemonAbilityFilter` pattern as Leg 2,
  replacing the last remaining `parseTagFilters` `#tag`-chain consumer. No
  Mega chip-matching yet (Leg 4/5). Live-verified by the user against real
  saved builds in `npm run dev`. See commit `44ad153`.

- **[Search & Filter: Tag-Chip Redesign] — Leg 4** (2026-10-24): Replaced
  `AddPokemonStatTable.tsx`'s interim Leg 2 Mega-row gating ("no chips
  active") with implicit matching: an active type chip now checks the Mega
  slug's own `calcSpecies.types` instead of the base species', and an
  active ability chip checks `getMegaAbility(slug)` first, falling back to
  the base species' own ability-tag membership for Mega forms with no
  confirmed override. Move chips are unaffected (Mega Evolution doesn't
  change a species' learnset). Updated
  `docs/investigations/mega-form-rows-scoping.md` to record the reversal.
  Live-verified via `run-desktop`: a Dragon type chip surfaces Mega
  Charizard X/Ampharos/Sceptile alongside the real Dragon-types, and a
  Tough Claws ability chip surfaces exactly the five Mega forms with that
  confirmed override (Aerodactyl/Barbaracle/Charizard X/Golisopod/
  Metagross), no false positives once the async ability-member fetch
  resolved. See commit `63384b1`.

- **[Search & Filter: Tag-Chip Redesign] — Leg 5** (2026-10-24): Extended
  `BoxPage.tsx`'s own chip matching (`matchesChipsWithMega`) so a saved
  build holding its own Mega Stone (`getMegaApiSlug`) also matches a
  type/ability chip against the Mega form's own type (`calcSpecies.types`)
  or guaranteed ability (`getMegaAbility`), OR'd per chip against the
  existing base-species check rather than replacing it outright - a Box
  entry is one card representing a build that's both pre- and post-Mega
  depending on battle state, unlike Leg 4's separate per-stone Mega row.
  Move chips unaffected. This was the milestone's last open done-when
  criterion - all three are now met, so `/close-milestone` is next.
  Live-verified via `run-desktop`: saved a disposable Charizard holding
  Charizardite X, confirmed it was absent from a Dragon-chip search on the
  pre-change build then present after, deleted via a real Playwright
  right-click (`button: 'right'`) on the test tile - a plain DOM
  `dispatchEvent('contextmenu')` never reached `BoxCard.tsx`'s React
  handler, so the first verification attempt had to switch to a real
  simulated click. Cleanup confirmed via the saved-build count dropping
  back to 25 and the real saved builds all still present. See commit
  `9db7d2e`.
