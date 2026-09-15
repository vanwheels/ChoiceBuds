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

## Fix applied (this leg)

`utils/vgcPasteRowDisplay.ts`'s `resolveCatalogSpriteEntry()` tries three
tiers in order: direct roster match → `normalizeSpeciesForAPI`-normalized
roster match → a Mega-form slug read from `hooks/useMegaSprite.ts`'s shared
cache (warmed via `useMegaSpritePrefetch()`, same as `TeamCard.tsx`'s own
mini sprite strip). Re-running the same diagnostic against all three tiers
resolved 41 of the 44 gaps, leaving only the 3 irreducible ones above -
**116 / 119 (97.5%)** of live Reg M-C species text now resolves to a real
sprite.
