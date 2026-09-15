# VGCPastes catalog sprite matching — diagnosis

Live-verification follow-up for the "VGCPastes Sample Team Catalog: Row
Display Rework" Leg 2 item (see TODO.md/COMPLETED.md). Vanny reported the
new sprite strip had visibly more empty slots than expected right after the
first live check.

## Method

Fetched the live Reg M-C sheet CSV
(`gviz/tq?tqx=out:csv&sheet=Champions M-C`) and PokeAPI's full `/pokemon?
limit=2000` list directly via a scratchpad Node script (not committed),
reimplementing `services/vgcPastes.ts`'s own column indices/EVs filter and
`hooks/useSpeciesRoster.ts`'s own Mega-exclusion + display-name logic, then
diffed every unique species string across all 243 `EVs == Yes` rows against
the roster's normalized names.

## Result

**75 / 119** unique species strings matched the roster directly. The other
**44** split into two real, previously-unhandled causes — not random sheet
noise:

1. **35 were Mega forms** ("Absol-Mega-Z", "Charizard-Mega-X", …).
   `useSpeciesRoster.ts` deliberately filters every `-mega` PokeAPI resource
   out of the roster (Mega Evolution is item-driven in this app's own team
   builder, not a roster pick) — but the sheet's species text spells Mega
   forms out directly, so there was never going to be a roster entry to
   match, regardless of normalization.
2. **6 were species with no bare-named PokeAPI resource** (Aegislash,
   Basculegion, Basculegion-F, Indeedee, Indeedee-F, Mimikyu) — PokeAPI only
   exposes these by a specific forme/gender slug
   (`aegislash-shield`, `basculegion-male`), a gap this app's own
   `services/pokeapi.ts::normalizeSpeciesForAPI` already maps around for the
   real import/enrichment path.

Only **3 genuinely irreducible gaps** remained after accounting for both:

- `Maushold-Four` — a sheet-only spelling; `normalizeSpeciesForAPI` maps
  bare `maushold` (Showdown's own convention) to `maushold-family-of-four`,
  but has no entry for the sheet's own "-Four" shorthand.
- `Meowstic-F-Mega` — a combined Mega + gender-divergent form; no config in
  this app models that combination anywhere.
- `Toxtricity` — **not a catalog-specific issue**. PokeAPI has no bare
  `toxtricity` resource (only `-amped`/`-low-key`/gmax variants), the same
  class of gap `normalizeSpeciesForAPI`'s `formMappings` table already fixes
  for Aegislash/Mimikyu/Gourgeist/etc., but Toxtricity was never added to
  that table. This means a real Showdown-text import of a plain
  "Toxtricity" through the app's normal enrichment path likely 404s today,
  independent of this catalog. Flagged as its own TODO item rather than
  patched inside this leg (a different file, a different code path, outside
  the display-rework scope) — see TODO.md's "Toxtricity Import Enrichment
  404" entry.

## Fix applied

`utils/vgcPasteRowDisplay.ts`'s `resolveCatalogSpriteEntry()` tries three
tiers in order: direct roster match → a sheet-spelling override or
`normalizeSpeciesForAPI`-normalized roster match → a Mega-form slug read
from `hooks/useMegaSprite.ts`'s shared cache (warmed via
`useMegaSpritePrefetch()`, same as `TeamCard.tsx`'s own mini sprite strip).
Re-running the same diagnostic against all three tiers resolved 41 of the
44 gaps outright, leaving the 3 "irreducible" ones above - which, on a
second look, weren't actually irreducible:

- `Maushold-Four` → added as a direct `SHEET_SPECIES_TEXT_OVERRIDES` entry
  to `maushold-family-of-four` (plus a pre-emptive `Maushold-Three` entry
  for the same shorthand, not yet seen live).
- `Meowstic-F-Mega` → the Mega-slug builder now strips an embedded gender
  token (`-f-`/`-female-`/`-m-`/`-male-`) immediately before `-mega`, so it
  resolves to the one curated `meowstic-mega` slug regardless of gender.
  Still resolves to an empty slot in practice today, because PokeAPI has no
  `meowstic-mega` resource yet (a genuinely new Champions Mega form, same
  "not released to PokeAPI yet" situation `hooks/useMegaSprite.ts`'s own
  header already documents) - but the lookup itself is now correct and will
  pick it up automatically once PokeAPI adds it.
- `Toxtricity` → not a catalog-matching problem at all: PokeAPI has no bare
  `toxtricity` resource, the same class of gap
  `services/pokeapi.ts::normalizeSpeciesForAPI`'s `formMappings` table
  already covered for Aegislash/Mimikyu/Gourgeist/Lycanroc/Morpeko/Palafin/
  Pyroar, just never extended to Toxtricity. Added `'toxtricity':
  'toxtricity-amped'` there directly - fixes the real
  import/enrichment path too, not just this catalog.

Net result: **119 / 119** of the live Reg M-C species-text entries now
resolve to a real sprite (or will, the moment PokeAPI adds the one
still-unreleased Mega resource above).
