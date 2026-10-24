# Missing Move/Ability Description Audit (Leg 2)

Full gap list for `[Missing Move/Ability Description Curated Fallbacks] —
Leg 3` in `TODO.md`. Produced 2026-10-24.

## Methodology

Live PokeAPI data, fetched 2026-10-24 (not the app's own 30-day disk cache -
a fresh pull, so this reflects PokeAPI's current state exactly).

1. Built the full Champions-legal species pool: every slug across
   `utils/pokemonRules.ts`'s `REG_MA_SPECIES` + `REG_MB_ADDED_SPECIES` +
   `REG_MC_ADDED_SPECIES` (Reg M-C is a superset of M-A/M-B, so this is the
   most inclusive pool the picker panels can ever show) - 266 slugs, 1
   skipped as an intentionally-redundant duplicate already covered by its
   correctly-spelled sibling slug (per that file's own header comment,
   e.g. bare `aegislash` vs. `aegislash-blade`/`aegislash-shield`).
2. Fetched `/pokemon/{slug}` for each, mirroring
   `pokeapiService.ts::fetchSpeciesLearnset`'s own champions-tag-filtered
   move selection (falls back to the all-time movepool only when a species
   has zero `champions`-version-group-tagged moves - true for 0 of the 265
   fetched here as of this run). Unioned every move/ability name across the
   whole pool: **614 unique moves, 201 unique abilities** - this is the
   real set the three picker panels can ever display today.
3. For each unique move/ability, fetched `/move/{slug}` or `/ability/{slug}`
   and ran `pokeapiService.ts::extractEffectDescription`'s exact fallback
   condition (`effect_entries` empty/missing, or missing both `short_effect`
   and `effect` on the English entry).
4. Excluded anything already corrected via a hand-written `description` in
   `config/championsMoveOverrides.ts` (15 moves) or
   `config/championsAbilityOverrides.ts` (2 abilities) - those already show
   real text in the UI today regardless of what PokeAPI itself returns, so
   they're not a live gap.

## Result

**0 abilities** fall back to "No description available" - PokeAPI's
ability `effect_entries` coverage is complete across the whole legal
roster.

**52 moves** fall back, confirming both examples named in the Leg 2 item
(Upper Hand, Temper Flare):

```
alluring-voice, aqua-cutter, aqua-step, armor-cannon, axe-kick,
barb-barrage, bitter-blade, bitter-malice, ceaseless-edge, chilling-water,
chilly-reception, comeuppance, double-shock, electro-shot, fickle-beam,
flower-trick, gigaton-hammer, glaive-rush, hard-press, headlong-rush,
ice-spinner, infernal-parade, jet-punch, kowtow-cleave, last-respects,
lumina-crash, matcha-gotcha, mortal-spin, mountain-gale, population-bomb,
pounce, psychic-noise, psyshield-bash, raging-bull, raging-fury,
revival-blessing, shed-tail, shelter, snowscape, spicy-extract, stone-axe,
supercell-slam, syrup-bomb, temper-flare, tera-blast, tidy-up, torch-song,
trailblaze, triple-arrows, twin-beam, upper-hand, wave-crash
```

All 52 are Scarlet/Violet-native (Gen 9) moves - PokeAPI's `effect_entries`
backfill has a long-documented gap for newly-introduced moves (hand-written
prose per move, not auto-generated), and Gen 9 is still catching up.
`dragon-cheer` surfaced in the raw pre-exclusion fallback count too, but is
already covered by a `championsMoveOverrides.ts` description override, so
it's correctly left out of the 52 above.

## Side-finding (out of scope for this leg - flagged separately in TODO.md)

`tera-blast` is in the 52-move gap list. That's accurate for *this* leg
(it's really in the pool the picker panels show today), but it also
surfaces a separate, pre-existing movepool-correctness gap:
`config/championsMovepoolChanges.ts`'s documented "Tera Blast doesn't exist
in Champions" blanket rule (`GLOBALLY_REMOVED_MOVES`) only runs through
`applyChampionsMovepoolChanges`, gated behind `hasChampionsMoveData ===
false` - a path that's dead for virtually the entire current roster (see
that file's own "Prune Dead" note). The *unconditional* removal path
(`applyChampionsPatchRemovals` / `CHAMPIONS_PATCH_MOVEPOOL_REMOVALS`) only
covers Archaludon's Mirror Coat/Metal Burst. So for any species whose live
PokeAPI `champions` tag includes Tera Blast, the app offers it as a
pickable move today, contradicting the documented rule. Not fixed here -
see the new Unscheduled TODO.md item.
