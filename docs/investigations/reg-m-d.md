# Regulation M-D research

Research for `TODO.md`'s `[Reg M-D Data Research] — Leg 1`, done
2026-11-24, eight days before Reg M-D launches. Sources follow
`.claude/rules/external-data-sources.md`: Serebii manual research
(exception #2) and Showdown source reads (exception #7). Bulbapedia's
"Ranked Battles Seasons in Pokémon Champions" and "Regulation Sets in
Pokémon Champions" pages returned HTTP 403 to automated fetches, so
nothing here is cross-checked against Bulbapedia yet. The post-launch
re-check leg covers that.

Status of each change: **confirmed** means a primary source states it.
**Provisional** means it comes from Showdown's mainline `data/`, which
models Legends Z-A rather than Champions, and needs re-checking once
Serebii publishes it. **Open** means no source has it yet.

## Sources read

| Ref | URL | Read |
|---|---|---|
| S1 | serebii.net/pokemonchampions/rankedbattle/seasonm-7.shtml | 2026-11-24 |
| S2 | serebii.net/pokemonchampions/rankedbattle/seasonm-8.shtml | 2026-11-24 |
| S3 | serebii.net/news/2026/25-November-2026.shtml (M-D announcement, posted 02:00 GMT 25 Nov) | 2026-11-24 |
| S4 | serebii.net/pokemonchampions/rankedbattle/regulationm-d.shtml | 2026-11-24 |
| S5 | serebii.net/news/2026/November.shtml, 18-11-2026 entry (M-D balance changes) | 2026-11-24 |
| S6 | serebii.net/pokedex-champions/heatran/, /tatsugiri/ | 2026-11-24 |
| S7 | serebii.net/pokemonchampions/items.shtml | 2026-11-24 |
| D1 | smogon/pokemon-showdown `data/pokedex.ts`, `data/items.ts` (master) | 2026-11-24 |
| D2 | `@smogon/calc` in node_modules, `dist/data/items.js`/`species.js` | 2026-11-24 |

Showdown's `data/mods/champions/` has no M-D changes yet. Its last commit
was 2026-11-15, Last Resort. No source returned a 404 except
`seasonm-9.shtml`, which isn't published yet.

## 1. Seasons (`config/seasons.ts`)

| Season | Regulation | Dates | Status | Source |
|---|---|---|---|---|
| M-7 | Reg M-C | 2026-10-07 to 2026-11-04 | confirmed | S1 |
| M-8 | Reg M-C | 2026-11-04 to 2026-12-02 | confirmed | S2. S5's 04-11 entry: "until December 2nd at 01:59 UTC" |
| M-D seasons | Reg M-D | not published | open | S4's seasons table is empty and `seasonm-9.shtml` 404s |

- One search summary gave M-7's end as November 5. S1 itself says
  "October 7th 2026 - November 4th 2026", and S2 starts M-8 on November 4,
  so November 4 is correct.
- Reg M-D runs **2026-12-02 to 2027-03-03** (S3, S4). S4 says it covers
  "three further seasons", which presumably means M-9 to M-11. Per
  `seasons.ts`'s own header, don't infer their dates. Add them only once
  Serebii or Bulbapedia publishes the rows.

## 2. Species roster (`utils/pokemonRules.ts`)

S3 says "A total of 24 new Pokémon and 4 Mega Evolutions will be added".
S4's "Newly Useable Pokémon" table, read in full, has only 7 rows:

| Dex | Species | Status |
|---|---|---|
| 0485 | Heatran | confirmed (S4) |
| 0977 | Dondozo | confirmed (S4) |
| 0978 | Tatsugiri (Curly/Droopy/Stretchy) | confirmed (S4; three Mega rows with icons `978-m`/`-md`/`-ms` imply all three forms) |
| — | 21 further species | **open**: S3's count, but no source names them |

- Heatran is the first Legendary legal in Champions. S4 calls it "the
  first Sub Legendary Pokémon".
- Tatsugiri's three forms differ only cosmetically in stats, but PokeAPI
  splits them into separate resources. Check whether
  `canonicalizeCosmeticVariantSlug` should collapse them, as it does for
  Squawkabilly. Commander behaves the same for all three, so collapsing is
  likely right. Confirm against PokeAPI's live slugs.
- No banned items or moves are mentioned. Legality stays species-only.

## 3. Mega Evolutions (`config/megaEvolution.ts`, `megaAbilities.ts`, `vgcData.ts`)

| Mega | Stone | Ability | Base stats | Status |
|---|---|---|---|---|
| Mega Heatran | Heatranite | Water Compaction (+2 Def when hit by a Water move) | 91/120/106/175/141/67 (700) | ability and stats confirmed (S3, S6). Stone name provisional (D1, D2; S7 doesn't list it yet) |
| Mega Tatsugiri (Curly/Droopy/Stretchy) | Tatsugirinite | Premium Grade (+1 SpA on switch-in) | 68/65/90/135/125/92 (575), all three forms | stats confirmed (S6). Stone provisional (D1, D2). Ability name from Vanny, 2026-11-24. S6's ability field is still blank, and D1 holds placeholder base abilities (Commander/Storm Drain), the same pattern Reg M-C's Megas had before launch. Effect from S3 |

- S3 says "4 Mega Evolutions". S4's four Mega rows are Mega Heatran plus
  three Mega Tatsugiri forms, so no Mega for an unnamed species is implied.
- `@smogon/calc` already has `Heatran-Mega` and a `Tatsugirinite` entry
  (D2). The stats are in the calc dex already, so only legality and the
  ability need wiring.
- **Shape problem:** `MEGA_STONE_TO_SPECIES` maps one stone to a single
  `{ species, suffix }`. Tatsugirinite maps to three base forms, each with
  its own Mega (D1 `megaStone`: Tatsugiri → Tatsugiri-Curly-Mega,
  Tatsugiri-Droopy → Tatsugiri-Droopy-Mega, and so on). The build leg has
  to decide whether forms collapse under one Mega, matching the roster
  decision above, or the table gains a per-form mapping.
  Resolved in Leg 4: a per-form mapping. `MULTI_FORM_MEGA_STONES` holds
  Tatsugirinite's three rows, `MEGA_FORMS` flattens both tables, and bare
  "Tatsugiri" aliases to `tatsugiri-curly` for the stone lookup.
- `hitReactiveAbilities.ts` already has `water-compaction`, because it's a
  mainline ability. No change is needed there.
- `onSwitchInAbilities.ts` needs `premium-grade` as a `stat` effect
  (`spa +1`, target self).
- `vgcData.ts`'s `VGC_MEGA_STONES` gets Heatranite and Tatsugirinite. S3,
  S4 and S5 announce no new hold items or berries.

## 4. Move balance changes (`config/championsMoveOverrides.ts`)

All of these are from S5, effective December 2:

| Move | Change |
|---|---|
| Screech | accuracy 85 → 100 |
| Rock Slide | accuracy 90 → 95; flinch chance 30% → 20% |
| Steel Wing | accuracy 90 → 100 |
| Metal Sound | accuracy 85 → 100 |
| Frost Breath | accuracy 90 → 100 |

- `ChampionsMoveOverride` has `accuracy` and `description` but no
  secondary-chance field. Rock Slide's flinch change goes in through
  `description`, which is how `iron-head`'s existing row handles its own
  flinch text.
- Accuracy doesn't feed damage, so `getChampionsCalcMoveOverride` should
  need nothing. Confirm in the build leg.

## 5. Movepool additions (`config/championsMovepoolChanges.ts`)

S5 lists moves newly learnable as of December 2:

| Move | Species |
|---|---|
| Psych Up | Alakazam, Starmie, Mr. Mime, Mawile, Altaria, Castform, Absol, Roserade, Weavile, Rotom (all six forms: base, Heat, Wash, Frost, Fan, Mow), Liepard, Musharna, Audino, Cofagrigus, Slurpuff, Drampa, Annihilape |
| Slack Off | Emboar |
| Roost | Beedrill, Hydreigon |
| Tailwind | Emolga |
| Wonder Room | Umbreon |
| Play Rough | Vaporeon, Jolteon, Flareon, Espeon, Umbreon, Leafeon, Glaceon |

- **Mechanism gap:** `CHAMPIONS_MOVEPOOL_ADDITIONS` is consulted only when
  PokeAPI has no Champions-tagged moves for a species (the
  `hasChampionsMoveData` gate in `useGameData.ts`). Every species above
  has Champions tag data already, so a row there would never apply. These
  additions have to bypass that gate, as the existing
  `CHAMPIONS_PATCH_MOVEPOOL_REMOVALS` does, because PokeAPI's tag snapshot
  predates the patch. They also have to be regulation-scoped (§7).
- **Conflict:** `CHAMPIONS_MOVEPOOL_REMOVALS['mr-mime']` removes
  `psych-up`, but the patch adds it to Mr. Mime. That removals table is
  gated too, so it shouldn't fire for a tagged species. Even so, the build
  leg should order patch additions after every removal and add a test for
  Mr. Mime.
- Rotom's forms are separate PokeAPI slugs (`rotom-heat` and so on), so
  each one needs its own row.

## 6. Ability changes (`config/championsAbilityOverrides.ts`)

Both are from S5:

| Ability | Change |
|---|---|
| Flash Fire | the Fire boost now persists through Mega Evolution |
| Stalwart | also ignores the opponent's substitutes |

- The app doesn't track Flash Fire's boost state, and only
  `typeImmunityAbilities.ts` references it. Stalwart is Mega Skarmory's
  ability (`megaAbilities.ts`). Neither has modeled behavior here, so both
  changes are description overrides only.

## 7. Regulation scoping (decided by Vanny, 2026-11-24)

The §4–6 balance changes take effect from Reg M-D onward. They must not
show in M-C or earlier calcs, or in those teams' move and ability text.
Every override table today applies globally:

- `useGameData.ts`'s `getCachedMove`, `getCachedAbility` and
  `getCachedSpeciesLearnset` apply move, ability and movepool overrides
  with no regulation input.
- `damageCalcEngine.ts` calls `getChampionsCalcMoveOverride(moveName)`,
  also with no regulation input.

The calc already holds a `regulationId` (`CalcPage.tsx`), and team surfaces
have `team.regulation`. A dated patch layer therefore needs a regulation
parameter threaded through those getters to roughly 8 caller files.
Surfaces with no regulation of their own default to the latest
regulation (confirmed by Vanny, 2026-11-24: Box and other regulation-less surfaces show the latest balance). Existing global overrides
(launch-era corrections, Archaludon's patch removals) keep applying to
every regulation. Only new dated entries get scoped.

## 8. Not applicable

- No items added or removed (S3, S5).
- No move power or type changes, and no new moves (S5).

## Gaps to close after launch (~2026-12-02)

1. The other 21 Reg M-D species. Re-read S4 once the regulation is live.
2. The M-D season rows (M-9 onward, three seasons per S4).
3. ~~Mega Tatsugiri's ability name~~: Premium Grade (Vanny, 2026-11-24).
   Still confirm the spelling against Serebii once it's listed.
4. Heatranite and Tatsugirinite on S7, to confirm the provisional spelling.
5. A Bulbapedia cross-check of everything above, once its pages are
   reachable.
6. Showdown's `champions` mod, once M-D lands there, to cross-check the S5
   balance changes.
