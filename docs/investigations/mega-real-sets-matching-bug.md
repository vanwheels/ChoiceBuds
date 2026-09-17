# Real Sets: Mega Evolution Species Matching Bug

Reported 2026-09-16 (Vanny, with a screenshot of a Mega Salamence team card
showing "No confirmed real sets found for Salamence in Reg M-C yet" despite
confirmed live that the VGCPastes sample pool for Reg M-C has numerous
Salamence entries). Confirmed as a code-level root cause during this scoping
session - not yet fixed, see `[Real Sets: Mega Evolution Species Matching
Bug] — Leg 1` in `TODO.md`.

## Root cause: two features independently disagree on Mega's species key

**Team Builder import intentionally strips the Mega suffix.**
`services/parser.ts` calls `normalizeMegaSpeciesOnImport()`
(`config/megaEvolution.ts`) on every parsed Pokemon. When a Showdown export
names a Mega-Evolved set by its Mega form (e.g. `Salamence-Mega @
Salamencite`), that function detects the `-Mega`/`-Mega-X`/`-Mega-Y` suffix,
confirms the held item is that species' own real Mega Stone, and rewrites
`species` back down to the base form (`Salamence`) - because Mega Evolution
isn't a standalone legal species for this app's team-validation purposes
(only base species + a Mega Stone item is). So `showdownData.species` for
*any* saved Mega-Evolved team member is always the base species name, never
`-Mega`-suffixed - confirmed by reading the function directly, not inferred.

Mega state is still recoverable at render time (`getMegaApiSlug(item,
species)` in the same file, used by `useMegaSprite.ts`) by re-deriving the
suffix from the held Mega Stone item, which is how the sprite correctly shows
the Mega art despite `species` staying base.

**VGCPastes real-set matching intentionally keeps the Mega suffix.**
`docs/investigations/vgcpastes-realset-extraction-scope.md` (from the
original Per-Species Real-Set Extraction scoping session, 2026-09-15) already
confirmed live that the sheet's own species-list columns are raw Showdown-
format tokens including the Mega suffix verbatim (`"Salamence-Mega"`,
`"Raichu-Mega-Y"`, etc.), and *decided* not to strip it: "Mega/regional-form
suffixes are deliberately *not* stripped, matching the existing usage-cache
convention of keying Mega Salamence separately from base Salamence."
`services/vgcRealSets.ts`'s `matchesSpecies`/`extractRealSetsForSpecies` both
key through `normalizeUsageCacheKey()` (`championsBattleData.ts`), which only
strips a gender suffix - it does nothing to a Mega suffix, by design.

**The collision.** `RealSetsButton.tsx` passes `showdownData.species`
directly into the lookup (`components/PokemonCard.tsx:302`) - the
already-Mega-stripped base name. A Mega Salamence team member therefore
queries `"salamence"`, but every real sample team's Salamence entry in the
sheet/pastes is keyed `"salamence-mega"`. `filterRowsBySpecies` never matches
a single row, so the lookup always returns zero bundles regardless of how
many real Mega sets exist in the pool - reproducing exactly what the
screenshot shows, and confirmed to generalize to any Mega-capable species
(not Salamence-specific), since the same base-species-only storage applies
to every team member.

## Calc tab's own Mega toggle: separate code path, not yet confirmed to share the bug

`CalcPokemonPanel.tsx`'s Mega toggle (`megaGroup`, built from
`calcFormes.ts`'s `getFormeFamily().megaFormes`) sets `state.species` *to*
the full `-Mega`-suffixed forme string directly via `onChange({ species,
ability: megaAbility })` - the opposite direction of Team Builder's import
normalization. That toggle handler does not itself call
`realSets.lookup(species)` again after switching formes (only
`handleSpeciesSelect`/`handleLoadOpponent` do, both pre-Mega-toggle entry
points), so toggling Mega on in Calc likely just leaves whatever real-sets
entry was already loaded for the base species displayed and stale, rather
than hitting this exact same mismatch a second way. Not fully traced this
session - worth a quick live check alongside the Team Builder fix rather than
assuming.

## Fix direction (not yet implemented - scoping only)

The two features' conventions are each individually reasonable (team
validation should treat Mega as base+item; a real-set catalog should keep
Mega and base sets distinct, since their EVs/moves/items differ). The bug is
that `RealSetsButton.tsx` needs to reconstruct the Mega-suffixed key the same
way `useMegaSprite.ts` already does for sprite lookups - i.e. pass
`getMegaApiSlug(item, species) ?? species` into `realSets.lookup()` instead
of the raw stored `species` - rather than changing either feature's own
storage/matching convention. `CalcPokemonPanel.tsx`'s Mega-toggle-not-
re-triggering-lookup gap (previous section) should be checked and likely
fixed in the same pass, since it's the same feature area.
