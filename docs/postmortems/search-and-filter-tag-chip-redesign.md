# Search & Filter: Tag-Chip Redesign — Post Mortem

**Dates:** 2026-10-23 to 2026-10-24 (5 legs)

## What shipped

Replaced the `#tag`-prefixed free-text search across the team builder and Box
with Showdown-style multi-select type/move/ability chips that AND together:

- **Leg 1** (`2dc9bcc`): the `{category, value}` `TagChip` data model, pure
  matching/dedupe/disambiguation logic (`utils/tagChipMatch.ts`), and a
  standalone `TagChipInput` component, unit-tested for space/hyphen-
  insensitive matching and type-vs-move disambiguation (e.g. Psychic).
- **Leg 2** (`6780314`): wired `TagChipInput` into `AddPokemonStatTable.tsx`
  (Roster Swap + the "+ Add Pokémon" slot + Box's "+ New Build" — all three
  call sites), routing each chip directly into the existing
  `usePokemonTypeFilter`/`usePokemonMoveFilter`/`usePokemonAbilityFilter`
  hooks instead of the old `#tag` text-probing chain. Caught and fixed five
  live-verified UX issues (duplicate search boxes, loading-state collapse,
  modal panel shrink, autocomplete dropdown occlusion).
- **Leg 3** (`44ad153`): wired `TagChipInput` into Box search
  (`BoxPageToolbar.tsx` desktop, `BoxPage.tsx` mobile popover), same
  category-routed pattern, replacing the last `parseTagFilters` consumer.
- **Leg 4** (`63384b1`): implicit Mega-row matching in
  `AddPokemonStatTable.tsx` — an active type/ability chip checks the Mega
  slug's own `calcSpecies.types`/`getMegaAbility` instead of the base
  species', so Mega forms surface without a separate "Mega" chip.
- **Leg 5** (`9db7d2e`): same implicit matching extended to Box's saved
  builds (`matchesChipsWithMega`), OR'd per-chip against the base-species
  check rather than replacing it, since one Box card represents a build
  that's both pre- and post-Mega depending on battle state.

All three of the milestone's done-when criteria are met: chips fully replace
`#tag` syntax in both surfaces, matching is space/hyphen-insensitive with
type/move disambiguation, and Mega forms match consistently in both places
with no separate Mega chip anywhere.

## What went well

- Leg 1's foundation-first sequencing (pure logic + tests before any UI
  wiring) meant the matching/disambiguation behavior was locked down and
  verified before it had to work inside two different, messier consumer
  components — Legs 2/3 were mechanical wiring by comparison.
- Live verification caught real UX regressions in Leg 2 (duplicate search
  boxes, dropdown occlusion) that unit tests couldn't have — the
  `run-desktop` skill paid for itself there.
- Leg 5's test-and-cleanup discipline (disposable Charizard + Mega Stone,
  confirmed absent/present across the change, deleted via a real simulated
  right-click after a `dispatchEvent` attempt failed to reach React's
  handler, then confirmed the saved-build count and real builds were
  intact) is the kind of rigor the Live UI Testing convention asks for when
  a leg touches persisted state.

## What didn't / friction points

- Leg 2's original scope named `SpeciesPickerCard.tsx` as the wiring
  target for Roster Swap and the Add-Pokémon slot; that premise was already
  stale — `AddPokemonStatTable.tsx` had replaced it at both call sites back
  on 2026-10-16 (Project Revision v2). The leg wired `TagChipInput` into
  `SpeciesPickerCard.tsx` first before discovering this, then had to redo
  the work against the real target. A planned Leg 6 ("add Mega rows to
  `SpeciesPickerCard.tsx`") was later dropped as moot for the same stale
  premise.
- Leg 4 shipped Mega-row gating as "no chips active," then Leg 4's own
  COMPLETED.md entry records reversing that same leg to implicit
  type/ability matching — a design correction caught and fixed within the
  leg rather than carrying an interim behavior into a later one.

## Scope creep observed

None — each leg stayed inside the milestone's three done-when criteria, and
the stale `SpeciesPickerCard.tsx` premise was corrected in place rather than
expanding scope.

## What changes for the next milestone

1. **Before scoping a leg against a named file, grep for its current call
   sites first.** Leg 2's stale-target rework happened because the leg's
   scope was written from a premise (`SpeciesPickerCard.tsx` serves Roster
   Swap/Add-Pokémon) that a previous milestone (Project Revision v2,
   2026-10-16) had already invalidated. A one-line "does `<file>` still
   import/render at the call sites I'm about to change?" check before
   starting a leg would have caught this before any wiring work happened
   against the wrong component.
