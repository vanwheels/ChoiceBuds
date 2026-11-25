# Mega & alt-form display toggle

Deep-dive split out of `ARCHITECTURE.md`; the summary there links here.

A roster slot's stored set never changes for Mega Evolution or Aegislash's
Blade/Shield — both are in-battle-only states, so the toggle is purely a
display override, keyed by the slot's own stable id via
`usePokemonFormToggle` (see `renderer-layers.md`). Four consumers read it
(the fourth, Type Matchup's coverage tables, is covered in `type-matchup-coverage.md`
since it shares resolution logic with this one rather than just
reading the toggle directly):

- **Team card** (`EditablePokemonCore.tsx`): a Mega Stone held item shows
  `MegaFormToggleBadge`; toggling it swaps the ability capsule/stats
  grid/type badges to the Mega's own values, sourced from
  `useMegaSprite.ts`'s existing per-slug PokeAPI fetch (already pulling the
  Mega's sprite id, so types/base stats ride the same response) and
  `config/megaAbilities.ts`'s forced-ability table. The sprite gates on the
  same toggle (fixed in Team Editor & Box Fixes Leg 4 — it used to swap to
  the Mega form as soon as a Mega Stone was held, ahead of this toggle,
  while stats/types/ability correctly waited for it). The always-on sprite
  Aegislash gets `AegislashFormToggleBadge` instead: Blade's stats are
  derived from the stored Shield stats via `utils/aegislashForme.ts`'s
  Attack↔Defense/Sp. Atk↔Sp. Def swap (the real in-game rule) rather than a
  second hardcoded table, and its sprite flips too via the same
  `useMegaSprite` PokeAPI-slug fetch (Blade has its own ordinary PokeAPI
  resource).
  The team header's mini sprite strip resolves through
  `resolveActiveMegaSlug` with each slot's toggle state
  (`useActiveFormsForIds`). `useMegaSprite` retries PokeAPI with backoff,
  never caches a failure, and each card prefetches only its own slugs;
  `toPokeApiMegaResource` aliases Meowstic/Floette Megas to PokeAPI's own
  resource names. The Mega sprite shows static first, swapping to Showdown's
  GIF on load, since the CDN can hang on a missing Mega GIF.
- **Team builder card**: same toggle/components as the team card.
- **Battle logger** (`RecordMatchForm.tsx`): a separate, stricter concern —
  not "what does this Mega look like" but "did this Pokémon Mega Evolve in
  this logged match." `config/megaEvolution.ts::resolveOpponentMegaControl`
  gates the control per roster tile: hidden for a non-Mega-capable species
  or one confirmed holding a different item, a plain toggle for an
  unambiguous Mega form, an X/Y/Z picker for real ambiguity (e.g. Charizard)
  that never collapses back to a plain toggle once answered, so a misclick
  stays correctable. The player's own tile only shows the control when
  already holding its own real Mega Stone. `utils/battleMegaToggle.ts` holds
  the pure one-Mega-per-side mutual-exclusion logic (marking one clears any
  other mark on the same side), and `PastBattlesList.tsx` surfaces a "Mega"
  badge/tooltip on any saved match with a mark.
