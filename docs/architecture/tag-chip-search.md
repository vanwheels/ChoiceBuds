# Tag-chip search

Deep-dive split out of `ARCHITECTURE.md`; the summary there links here.

Type/move/ability search across the team builder and Box is multi-select
chips, not free-text `#tag` parsing (the old `parseTagFilters` chain is
gone). `types/tagChip.ts` defines the `{category, value}` `TagChip` shape;
`utils/tagChipMatch.ts` holds the pure matching logic shared by every
consumer — space/hyphen-insensitive name comparison and disambiguation
between a term that's both a type and a move (e.g. Psychic) via distinct
chip options rather than text guessing. `TagChipInput.tsx` is the one
autocomplete/chip-list UI component; each selected chip routes directly by
its category into the existing `usePokemonTypeFilter`/
`usePokemonMoveFilter`/`usePokemonAbilityFilter` hooks, and multiple chips
AND together. Two consumers:

- **`AddPokemonStatTable.tsx`** — serves Roster Swap, the "+ Add Pokémon"
  slot, and Box's "+ New Build" (all three call sites; `SpeciesPickerCard.tsx`
  no longer serves any of them as of Project Revision v2, though it's still
  live for Battle Logger's opponent picker). A Mega form's own row matches
  an active type chip against the Mega slug's `calcSpecies.types` and an
  active ability chip against `getMegaAbility(slug)` (falling back to the
  base species' ability-tag membership when there's no confirmed override)
  instead of the base species' values — so a Mega row surfaces wherever its
  own type/ability matches, with no separate "Mega" chip anywhere. Move
  chips are unaffected since Mega Evolution doesn't change a species'
  learnset. Mega rows are grouped into a `Map` keyed by base species name
  and spliced in directly below that species' own row, rather than all
  Mega rows trailing the full species list.
- **Box search** (`BoxPageToolbar.tsx` desktop, `BoxPage.tsx` mobile
  popover — one shared `chips` array) — `matchesChipsWithMega` applies the
  same Mega-aware check per chip, but OR'd against the base-species check
  rather than replacing it: a Box card represents one saved build that's
  both pre- and post-Mega depending on battle state (unlike
  `AddPokemonStatTable.tsx`'s separate per-stone Mega row), so a build
  holding a Mega Stone must match on either its base or Mega identity.
