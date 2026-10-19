# Stored-Snapshot Audit

Grep of `src/renderer` + `worker/src` for persisted fields that are
one-time snapshots (like the old `ImportedPokemonInfo.spriteUrl`) read
directly instead of recomputed from canonical fields, per
`.claude/rules/stored-snapshot-vs-live-recompute.md`. Maintenance Sweep:
useSavedPokemon Split & Housekeeping, Leg 3.

## Found and fixed

- **`RecordMatchForm.tsx`'s `snapshotRoster`** (Battle Logger's "Record
  Match" roster picker) built each `BroughtPokemonSnapshot` from
  `p.spriteUrl` — the stored `ImportedPokemonInfo.spriteUrl` snapshot
  field — instead of recomputing via `utils/spriteUrl.ts`'s
  `getPixelSpriteUrl`. `EditablePokemonCore.tsx`'s
  `handleShinyToggle` only writes `showdownData.shiny`, never the stored
  `spriteUrl` field (`handleGenderToggle` only patches it for the four
  `FORM_DIVERGENT` species, and only for gender). So any Pokemon whose
  shiny state was toggled after import showed the wrong (pre-toggle)
  sprite in the brought-4 picker (`BroughtToggleTile`), while every real
  on-screen card elsewhere in the app already recomputes live and showed
  it correctly. Same bug class as the original public-profile `spriteUrl`
  bug, just a second, later-added read path. Fixed by recomputing from
  `pokedexNumber`/species/gender/shiny at snapshot time, same as
  `worker/src/publicProfile.ts`'s `resolvePokemonSpriteUrl`. No `shiny`
  field exists on `BroughtPokemonSnapshot` itself (it's not used by the
  post-battle calc review), so the historical record still won't show
  which Pokemon were shiny at battle time — not in scope here; the
  picker's sprite was the only thing silently wrong.

## Checked and ruled out

- **`FavoritePokemon.spriteUrl`/`shinySpriteUrl`** (public-profile
  showcase pick): copied from `SpeciesRosterEntry` at pick time and never
  re-derived — but this is explicit, documented intent
  (`types/settings.ts`'s own doc comment), not an oversight: the public
  profile page needs to render the sprite without loading the full
  species roster, and nothing else about the pick (species-only, no
  gender/form) can change out from under it later. `worker/src/
  publicProfile.ts::extractPublicFavoritePokemon` forwards these as-is,
  consistent with that.
- **`ImportedPokemonInfo.types`/`baseStats`**: snapshotted from PokeAPI at
  import/species-change time, but every write path that could change them
  (species swap via the picker, Roster Swap, Real Set import) runs back
  through `services/pokeapi.ts::enrichPokemonWithAPI`, which refreshes
  both together. Nothing mutates species without re-enriching, so these
  can't drift independently the way `spriteUrl`/`shiny` could.
- **`ImportedPokemonInfo.calculatedStats`**: declared but never actually
  populated anywhere outside `clonePokemon.ts` copying it through
  unchanged; the real stat display always computes live from
  `baseStats`/EVs/nature. Dead field, not a live staleness risk.
  (Out of scope to remove it here — not what this leg's audit covers.)
- **`Battle.playerRoster`/`BroughtPokemonSnapshot` as a whole**: already
  documented and intentional as a point-in-time historical snapshot
  (`docs/postmortems/battle-logger-overhaul.md`) — a battle record should
  freeze the roster as it was, not live-track the team's current state.
  The `spriteUrl` fix above doesn't change that; it just makes the
  snapshot accurate *at the moment it's taken* instead of carrying forward
  a stale pre-toggle value.
- **Statistics/Speed Tiers/Type Matchup `spriteUrl` reads**
  (`TypeMatchupPage.tsx`, `SpeedTiersPage.tsx`, `PokemonUsagePanel.tsx`,
  `TeamRosterUsagePanel.tsx`, `OpponentFacedPanel.tsx`,
  `UsageThreatsList.tsx`, `SpeedTierList.tsx`): all read from the
  species-keyed PokeAPI cache (`getCachedEntry`/usage data), not from a
  specific user Pokemon record — no gender/shiny concept applies, so
  there's nothing to go stale.
- **`worker/src/publicProfile.ts`**: `extractPublicPokemon` already
  recomputes sprite URLs live (the original fix). No other field there
  reads a stored per-record snapshot instead of a canonical source.

## Not re-audited

`teamMigrations.ts`/`teamSyncReconciliation.ts` direct test coverage is
explicitly out of scope for this milestone (see `TODO.md`).
