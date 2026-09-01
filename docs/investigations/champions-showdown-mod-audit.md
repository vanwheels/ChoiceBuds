# Champions Data: Showdown `champions` Mod — Scoping Pass (2026-09-01)

Leg 1 of the "Champions Data: Adopt Showdown's `champions` Mod as Primary
Reference" backlog item. This session was scoping only, per project
convention (scoping and building are always separate sessions) — no config
files were edited here. See `TODO.md`'s Leg 2+ entries for the resulting
build plan.

## Source files

All eight files live at
`smogon/pokemon-showdown/data/mods/champions/` on GitHub (raw URLs used
below, `master` branch, fetched 2026-09-01):

| File | Shape | Relevant to |
|---|---|---|
| `moves.ts` | 259 entries (corrected 2026-09-01, see Leg 2 update below - originally estimated ~439), mostly `isNonstandard: "Past"` flags + a smaller set of real balance overrides (`basePower`/`accuracy`/`type`/`pp`) | `championsMoveOverrides.ts` |
| `abilities.ts` | 13 entries only | `championsAbilityOverrides.ts`, and cross-cuts the separate "Remaining Champions Mega Ability Audit" backlog item |
| `items.ts` | 288 entries — Mega Stone legality (`isNonstandard: null`) + banned-item flags (`isNonstandard: "Past"`) | Not directly mapped to an existing config file today; candidate source for Mega roster / item-legality data |
| `formats-data.ts` | ~1,000+ species/form entries, `tier` + `isNonstandard` fields | Candidate cross-check for the legal-roster list `useInitialSync` diffs against |
| `learnsets.ts` | ~100+ species, each a full per-move learn-method map (not the whole legal roster — just species with a Champions-specific delta, same narrowed scope our own file already converged on) | `championsMovepoolChanges.ts` |
| `conditions.ts` | `par`/`slp`/`frz` volatile/status definitions | `championsMechanics.ts` |
| `rulesets.ts` | Format/clause definitions (Standard, Flat Rules, Team Preview, etc.) | No current config file — informational only, not obviously needed |
| `scripts.ts` | Battle-engine hooks (damage formula, PP cap-at-20, Mega/Tera mechanics, Stellar STAB) | Not a static-data source; relevant instead to the separate "Calc Auto Ability-Effect Application" backlog item if that's ever built by extending `@smogon/calc` rather than layering on top of it |

`rulesets.ts` and `scripts.ts` don't map to any static config file this
project maintains — noted for completeness per the original TODO wording
("audit each override file against the matching Showdown mod file") but not
carried into the Leg 2+ plan below.

## `moves.ts` vs. `championsMoveOverrides.ts` — spot-check results

Fetched the full move-key list (all 439 entries with their overridden
fields) and cross-checked every entry currently in
`CHAMPIONS_MOVE_OVERRIDES`:

- **All 26 "confirmed" balance entries match exactly** — crabhammer,
  bone-rush, iron-head, night-daze, moonblast, first-impression,
  spirit-shackle, fire-lash, trop-kick, beak-blast, snap-trap, apple-acid,
  grav-apple, dire-claw, psyshield-bash, mountain-gale, infernal-parade,
  make-it-rain, syrup-bomb, growth, salt-cure, toxic-thread, rage-fist,
  freeze-dry, and the three "considered a slicing move" flavor-text-only
  entries (crush-claw, shadow-claw, dragon-claw — these show up as `flags`
  changes in Showdown's source, consistent with our description-only
  treatment).
- **All 11 "LOWER CONFIDENCE" entries are also confirmed present with
  matching values** in Showdown's `moves.ts`: gear-grind, anchor-shot,
  revelation-dance, dragon-hammer, snipe-shot, bolt-beak, fishious-rend,
  astral-barrage, triple-dive, hyper-drill, blood-moon, clangorous-soul.
  Showdown's mod is code-level/ladder-verified, so it doesn't share the
  spreadsheet's "no Pokémon can use this move yet to check against"
  limitation — Leg 2 should drop the low-confidence framing for these once
  ported over.
- **One redundant field found**: our `crabhammer` entry sets `power: 100`,
  but mainline SV's own base Crabhammer power is already 100 — Showdown's
  mod only touches `accuracy: 95`. Harmless (same value either way) but a
  concrete example of the "drop whatever becomes redundant" cleanup the
  original TODO called for.
- **PP-exceptions table (`CHAMPIONS_PP_EXCEPTIONS`) does not match
  Showdown's raw values.** Verified verbatim (not summarized) for all 13
  moves in our exceptions table:

  | Move | Our value | Showdown's `pp` field |
  |---|---|---|
  | protect | 8 | **5** |
  | baneful-bunker | 8 | **5** |
  | king's-shield | 8 | **5** |
  | spiky-shield | 8 | **5** |
  | beak-blast | 8 | **5** |
  | sandstorm | 8 | **5** |
  | snowscape | 8 | **5** |
  | purify | 8 | **5** |
  | obstruct | 8 | **5** |
  | night-slash | 20 | 20 (matches) |
  | shell-trap | 12 | **10** |
  | spin-out | 12 | **10** |
  | nihil-light | 8 | **5** |

  This is the single most concrete, actionable discrepancy this pass
  surfaced. It doesn't fit the "5→8/10→12/15→16/20+→20" retiering formula
  our comment describes either way, so before overwriting anything Leg 2
  should confirm what Showdown's `pp` field actually represents at this
  value (its own base-PP convention, not a display-multiplied number, as
  far as spot-checking other untouched moves suggests) with one in-game or
  Serebii/Bulbapedia cross-check, per CLAUDE.md's numeric-fact discipline —
  the current source (the RoiDadadou spreadsheet, relayed via screenshots)
  is exactly the kind of single-community-source data this whole item
  exists to replace, so don't just swap one unverified number for another.
  No `hiddenpower`/`secretpower` entries appear anywhere in Showdown's
  `moves.ts` at all (their absence isn't handled as a per-move flag in this
  file) — worth understanding where Showdown actually encodes that removal
  before treating our `GLOBALLY_REMOVED_MOVES` list as redundant with it.

## `abilities.ts` — cross-cutting finding

Only 13 ability overrides exist in the whole mod, and most are a single
`isNonstandard: null` flag (removes an existing-but-previously-nonstandard
ability from ban), not a new behavior definition:

`angershell`, `berserk`, `disguise`, **`dragonize`**, **`eelevate`**,
**`firemane`**, `healer`, **`megasol`**, `naturalcure`, **`piercingdrill`**,
`regenerator`, **`spicyspray`**, `unseenfist`.

`healer` and `unseenfist` are the two entries our
`championsAbilityOverrides.ts` already corrects, and both match (spot-checked
in an earlier session per that file's header). The bolded five —
`dragonize`, `eelevate`, `firemane`, `megasol`, `piercingdrill`,
`spicyspray` — are exactly the shape of ability this project already
confirmed for Eelektross's Mega (`Eelevate`, see `COMPLETED.md`) and
directly overlaps the separate "Remaining Champions Mega Ability Audit"
backlog item's ~30-species gap list. `items.ts`'s Mega Stone block (below)
confirms all ~30 of that item's excluded species do have a Champions Mega
Stone, so cross-referencing which stone unlocks which of these five
abilities would resolve most of that item's open list in one pass. Flagging
here since it's a real dependency between the two backlog items, not
duplicating the audit itself — that item owns its own scoping.

## `items.ts` — Mega Stone list

63 Mega Stones are flagged `isNonstandard: null` (legal). Checked against
the "Remaining Champions Mega Ability Audit" item's ~30-species exclusion
list — every species named there (Raichu X/Y → `raichunitex`/
`raichunitey`, Meowstic → `meowsticite`, Barbaracle, Chimecho, Golurk,
Falinks, Scovillain, Crabominable, Feraligatr, Meganium, Emboar, Drampa,
Dragalge, Audino, Glimmora, Malamar, Skarmory, Starmie, Chandelure,
Delphox, Greninja, Hawlucha, Clefable, Dragonite, Excadrill, Floette,
Froslass, Pyroar, Scolipede, Scrafty, Staraptor, Victreebel, Chesnaught) has
a matching stone in this list. Confirms `items.ts` is a complete source for
"which Mega forms exist in Champions," independent of whatever ability each
one grants (that still needs `abilities.ts` cross-referencing, per above).

## `formats-data.ts` — legal roster / tier

~1,000+ species/form entries, each with `tier` (competitive ranking, e.g.
OU/UU/Uber/NFE/Illegal) and/or `isNonstandard` (Past/Future/LGPE/Custom).
Plausible as a cross-check against `useInitialSync`'s legal-roster diff and
`vgcData.ts`'s legality tables, but this needs its own dedicated look at
whether Showdown's tier/format buckets actually line up with whatever
ruleset Champions' own in-game VGC-legal pool uses (Showdown's "Standard"
formats aren't necessarily the same restriction set as Champions' actual
in-game ranked ruleset) — not verified in this pass, flagged as open for
whoever picks up that specific leg.

## `conditions.ts` — spot-check against `championsMechanics.ts`

Freeze thaw chance (0.25) matches our documented value exactly. Sleep
turn range (2-3) and paralysis full-para chance weren't confirmed to
verbatim-level in this pass (the summarized fetch's paralysis description
looked internally inconsistent) — Leg 2 should re-verify with a raw
(non-summarized) read the same way the PP table above was double-checked,
not trust the first-pass summary.

## Leg 2 update (2026-09-01)

Corrections to this doc's own findings, made while actually building Leg 2 -
recorded here rather than silently rewritten, since the original framing
turned out to be wrong in one case:

- **The PP-exceptions "discrepancy" above was a misreading, not a real bug.**
  This doc's `moves.ts` spot-check compared our `CHAMPIONS_PP_EXCEPTIONS`
  values directly against Showdown's raw `pp` field and called the mismatch
  (8 vs. 5, 12 vs. 10) the pass's most concrete finding. It isn't one:
  `data/mods/champions/scripts.ts` overrides `calculatePP(move, ppUps)` to
  `(move.pp / 5 + 1) * 4` (ignoring `ppUps` entirely - Champions has no
  per-Pokemon partial PP Up scaling, one final number per move), and that
  formula run over Showdown's raw values reproduces every one of our
  existing 13 exception values exactly (`5 -> 8`, `10 -> 12`, `20 -> 20`).
  It also reproduces the game-wide 5→8/10→12/15→16/20+→20 bucket formula
  for every move without an exception. Independently confirmed for one entry
  via Serebii's own updated-attacks page, which states Beak Blast is 8 PP in
  Champions - matching our pre-existing value, not Showdown's raw `5`.
  **No values in `CHAMPIONS_PP_EXCEPTIONS` needed to change** - the file's
  header/PP comments were expanded instead to record the derivation, so a
  future reader doesn't have to re-discover this.
- The moves.ts entry-count estimate above ("~439 entries") was off - a
  parse of the actual raw file counts 259 top-level move entries.

## Leg 4 heads-up: `isNonstandard: "Past"` is a much bigger list than our current `GLOBALLY_REMOVED_MOVES`

Found while diffing Showdown's `moves.ts` the other direction (checking for
balance changes we're missing, per Leg 2's scope) - not acted on here since
it belongs to Leg 4, but flagging clearly since it reframes that leg's size.
Of the 259 total entries in `data/mods/champions/moves.ts`, roughly 200 are
*only* an `isNonstandard: "Past"` flag with no other field changed. Since a
Showdown mod file only lists deltas from its parent dex (mainline SV), every
one of those ~200 moves is being flagged as **removed from Champions
relative to mainline** - the same meaning our own `GLOBALLY_REMOVED_MOVES`
(`championsMovepoolChanges.ts`) uses it for, which currently holds only 3
moves (`tera-blast`, `hidden-power`, `secret-power`). That's a large gap
between what our config currently encodes as "not usable in Champions" and
what Showdown's mod says is actually removed. Leg 4 should treat the
`isNonstandard: "Past"`-only subset of `moves.ts` as the candidate source
for a much larger `GLOBALLY_REMOVED_MOVES`, not just a movepool/learnset
audit. One example already spotted in passing: `metalclaw` is both
`isNonstandard: "Past"` (removed) and separately gets a `slicing` flag added
in the mod - same shape as our existing crush-claw/shadow-claw/dragon-claw
"considered a slicing move" entries in `championsMoveOverrides.ts` - but
adding that description here in Leg 2 would be wrong if the move isn't
actually legal/selectable in Champions at all, which is exactly the
open question Leg 4 needs to resolve first.

## Leg 3 update (2026-09-01)

Fetched the raw `data/mods/champions/abilities.ts` (13 entries, already listed
above) plus the main `data/abilities.ts` and `data/pokedex.ts` for
cross-reference (not summarized fetches - saved to disk and read/grepped
directly, per the same discipline as Leg 2's PP re-check).

**`championsAbilityOverrides.ts` audit**: of the 13 abilities.ts entries,
only `healer`/`unseen-fist` needed (and already have) description overrides.
The other 11 split into two groups:
- `angershell`, `berserk`, `disguise`, `naturalcure`, `regenerator` are
  internal engine-behavior fixes (multi-hit-move edge cases, a Team-Preview
  info-leak fix for Natural Cure, Mimikyu/Disguise's substitute
  interaction) - none change the ability's user-facing description vs.
  mainline, so no override needed.
- `dragonize`, `eelevate`, `firemane`, `megasol`, `piercingdrill`,
  `spicyspray` are Future-flagged abilities Champions un-bans
  (`isNonstandard: null` in the mod, `isNonstandard: "Future"` in the base
  dex) that don't exist as a PokeAPI resource at all - PokeAPI only models
  released mainline games, and these are abilities from an unreleased
  future game reused early by Champions. `applyChampionsAbilityOverride`
  only runs on ability data PokeAPI actually returned, so these can't reach
  it regardless. They're Mega-only fixed abilities instead - see next
  section.

**Mega-ability cross-reference resolved**: read each of the six Future-only
abilities' full definition in the base `data/abilities.ts` (name, num,
mechanic), then grepped `data/pokedex.ts` for which Mega forme's
`abilities: { 0: ... }` field actually uses each one - the authoritative
answer, not name-theming guesswork (which would have gotten 2 of 6 wrong -
see below). Confirmed:

| Ability | num | Mechanic | Mega forme |
|---|---|---|---|
| Eelevate | 313 | Boosts best stat by hit count when a move faints the target (already confirmed pre-Leg 3) | Eelektross-Mega |
| Piercing Drill | 311 | Contact moves bypass Protect (same `onHitProtect` shape as Unseen Fist) | Excadrill-Mega |
| Dragonize | 312 | Normal -> Dragon type conversion + 1.2x power, i.e. Pixilate/Aerilate's exact mechanic for Dragon | Feraligatr-Mega (Water/**Dragon**, hence the added secondary type) |
| Mega Sol | 315 | Hooks `onWeatherModifyDamage` to always apply Sunny Day's own damage modifier regardless of actual weather | Meganium-Mega (Grass/Fairy - no obvious name-theme link to "sun") |
| Fire Mane | 316 | 1.5x Atk/SpA boost to Fire-type moves (Dragon's Maw's exact mechanic for Fire) | Pyroar-Mega |
| Spicy Spray | 318 | Guaranteed-burn the attacker on any damaging hit (no contact requirement, no chance roll) | Scovillain-Mega |

Piercing Drill/Fire Mane/Spicy Spray matched their obvious name-theme
(drill -> mole, mane -> lion, spicy -> chili plant). Dragonize and Mega Sol
would *not* have been guessed correctly from theming alone (Feraligatr
isn't obviously "Dragon," Meganium has no sun connection) - worth noting as
a caution against trusting thematic inference over reading the actual data
for the remaining ~25-species list.

Applied to `megaAbilities.ts` (5 new entries; Eelevate/Eelektross was
already present) and `championsAbilityOverrides.ts` (header comment only,
no new override entries - see above). Feraligatr, Meganium, Excadrill,
Pyroar, and Scovillain are removed from that file's "deliberately
incomplete" list and from the "Remaining Champions Mega Ability Audit"
backlog item's open list (see TODO.md/COMPLETED.md).

## Leg 4a update (2026-09-01): the "Past-only" premise is unsafe as-is

Started building the `GLOBALLY_REMOVED_MOVES` list per the Leg 4 heads-up
above. Extracted the actual candidate set first (raw-parsed, not
summarized): of `moves.ts`'s 259 entries, **194** have a body that is
*only* `inherit: true` + `isNonstandard: "Past"` (no other field changed) -
the earlier "~200" estimate was directionally right. `metalclaw` is
correctly excluded from this set (it also gets a `flags.slicing` addition,
per the original heads-up caution), and diffing against the base
(non-modded) `data/moves.ts` confirmed all 194 are genuinely *new* Past
flags added by the Champions mod, not flags simply inherited from an
already-Past mainline entry.

**Cross-checked against Bulbapedia's [List of moves by availability in
Pokémon Champions](https://bulbapedia.bulbagarden.net/wiki/List_of_moves_by_availability_in_Pok%C3%A9mon_Champions)**
(raw-parsed its ✔/✘ table, 921 rows, not summarized) as a second source,
per CLAUDE.md's cross-check discipline for a big/consequential config
change. Strong agreement - 192/194 match; the two disagreements
(`double-shock`, `revival-blessing`) both lean "available" on Bulbapedia's
individual move pages, so those two would be dropped either way. Bulbapedia
also has a *bigger* list - 422 moves marked unavailable total, not just
194 - because Showdown's mod file only lists deltas from the mainline dex,
so a move already unobtainable in mainline SV doesn't get a redundant
re-flag in the Champions mod even though Champions still lacks it.

**But the flag itself doesn't mean what the heads-up assumed.** Cross-
referencing the 422-move "unavailable" list against our own
`championsMoveOverrides.ts` found **16 moves already carrying verified,
in-use Champions balance overrides** that Bulbapedia/Showdown both flag as
unavailable: `anchor-shot`, `astral-barrage`, `blood-moon`, `bolt-beak`,
`dragon-hammer`, `fishious-rend`, `gear-grind`, `hyper-drill`, `nihil-light`,
`obstruct`, `purify`, `revelation-dance`, `shell-trap`, `snipe-shot`,
`spin-out`, `triple-dive`. Most of these are **signature moves** (Shell
Trap/Turtonator, Anchor Shot/Copperajah, Bolt Beak/Regieleki,
Obstruct/Grimmsnarl, etc.), and Leg 2 already confirmed via Showdown's own
`moves.ts` that these have live Champions-specific PP/power values - i.e.
they're actively used, not removed. The most likely real meaning of
`isNonstandard: "Past"` (and Bulbapedia's matching ✘) in this context is
**"not freely teachable via TM/Tutor,"** not "absent from the game." A
signature move is never TM-teachable anywhere, so it gets flagged
unavailable/Past even when its one owning species still has it baked into
their fixed learnset.

This invalidates treating either source's flagged-move set as a safe direct
source for `GLOBALLY_REMOVED_MOVES`, which strips a move from *every*
species unconditionally with no per-species exception mechanism. The
16-move collision above is only the subset catchable by cross-referencing
`championsMoveOverrides.ts` (moves that happened to also need a stat
override); it doesn't catch a signature move with *unchanged* stats, which
would never have gotten an override entry and so isn't caught by that
filter. `v-create` (Victini's signature move) is a concrete example still
sitting unflagged in the 194/422 lists with no override entry to catch it.

**Not resolved this session** (decision made 2026-09-01 to stop rather than
resolve under time pressure - see TODO.md): identifying which of the
~406 remaining flagged moves are single/few-species signature moves (would
need a systematic check, e.g. cross-referencing PokeAPI's SV level-up
learnsets for the current legal roster against the flagged-move list) so
they can be excluded before the rest is safely usable as
`GLOBALLY_REMOVED_MOVES`. Scratchpad working files (raw-downloaded
`moves.ts`/`data/moves.ts`/Bulbapedia HTML, extracted id/name/slug/
availability TSVs) were session-local and not preserved - re-fetch if
picking this back up.

## Leg 4a resolution (2026-09-01, same day)

Picked back up in a later session the same day. The "systematic
signature-move exclusion pass" scoped above turned out to rest on an
unverified premise: it assumed `GLOBALLY_REMOVED_MOVES` strips a move from
*every* species. It doesn't - `useGameData.ts::applyMovepoolChangesIfNeeded`
only ever calls into `championsMovepoolChanges.ts` (and therefore
`GLOBALLY_REMOVED_MOVES`) for a species when
`SpeciesLearnsetEntry.hasChampionsMoveData` is `false`, i.e. PokeAPI hasn't
"champions"-tagged that species's moves yet - see that file's own 2026-07-19
header comment, which this pass had re-read but not connected back to the
Leg 1 heads-up's "~200 moves removed from every species" framing. That
single missed connection is what made the problem look far bigger than it
actually is.

**Re-ran the file's own documented follow-up check** ("re-run the same live
coverage check... once PokeAPI back-fills those too") against the *full*
current legal roster this time, not just the previously-known 23 species -
235 unique species/form slugs pulled directly from
`utils/pokemonRules.ts`'s `REG_MA_SPECIES`/`REG_MB_ADDED_SPECIES` (several
needed resolving to their real PokeAPI slug first, e.g. `gourgeist` ->
`gourgeist-average`, `pyroar` -> `pyroar-male`, the `-breed`-suffixed Tauros
forms). Queried each for `champions`-tagged `version_group_details`
presence. Result: **PokeAPI has since back-filled all 22 of the Reg M-B
species - Floette is the only species left with zero champions-tagged move
data**, i.e. the only species this file's corrections (including
`GLOBALLY_REMOVED_MOVES`) currently reach at all.

This also resolves the `v-create`/Victini worry from the original heads-up
without needing a signature-move exclusion mechanism: Victini isn't on this
app's legal roster in the first place (absent from both
`REG_MA_SPECIES`/`REG_MB_ADDED_SPECIES`), so it was never at risk regardless
of `GLOBALLY_REMOVED_MOVES`'s contents.

**Actual safety check performed**: fetched Floette's own PokeAPI
`scarlet-violet`-version-group learnset (method-tagged: level-up/egg/
tutor/machine) and intersected it against the 194 Showdown Past-only
candidates. 5 hits were real level-up moves Floette would lose if
blanket-removed (`vine-whip`, `tackle`, `razor-leaf`, `fairy-wind`, and
`magical-leaf` which it gets via both level-up and machine) - excluded from
the final list. The other 189 aren't in Floette's SV learnset by any
method, so removing them changes nothing for the one species this table
actually affects. Also dropped `double-shock`/`revival-blessing` from the
candidate set (Bulbapedia's individual move pages, cross-checked earlier in
this doc, list both as available, disagreeing with the Past flag) purely
for data accuracy - neither touches Floette either way, so this costs
nothing today.

**Applied**: `GLOBALLY_REMOVED_MOVES` expanded from 3 to 189 entries (net
+186, after excluding the 5 Floette blockers and the 2 accuracy
corrections) - see
[championsMovepoolChanges.ts](../../src/renderer/config/championsMovepoolChanges.ts)
for the final list and full derivation comment.

**Deferred, not done this session**: `CHAMPIONS_MOVEPOOL_ADDITIONS`/
`CHAMPIONS_MOVEPOOL_REMOVALS`'s per-species entries for the other 22
species are very likely dead code now (their `hasChampionsMoveData` is
confirmed `true` live), but weren't pruned - a user with an already-cached
(`NEVER_EXPIRES`) `hasChampionsMoveData: false` entry from before their
species's backfill would still be relying on those corrections until that
cache entry is invalidated some other way, and no such invalidation path
exists today. See TODO.md's new backlog entry.

## Leg 4b (2026-09-01, same day): a second, stronger Showdown source

Leg 4a used `moves.ts`'s blanket per-move Past-flag list. This leg instead
used `data/mods/champions/learnsets.ts` - a *per-species* table, one entry
per species whose Champions moveset differs from mainline, each a complete
standalone movepool (not a delta list: confirmed by checking for PS's
`inherit: true` flag, which appears exactly once in the whole file, on
`floetteeternal` - an unrelated Eternal Flower form override; bare
`floette` has no entry at all in this file). 232 species are covered.

**Method**: for each of the 22 Reg M-B species, fetched its real PokeAPI
all-time movepool (every version group PokeAPI has ever recorded a move
for, matching `fetchSpeciesLearnset`'s actual fallback baseline exactly -
*not* scoped to `scarlet-violet`, which four of these species don't even
have any moves tagged under at all: Barbaracle, Mawile, Musharna, and
Scolipede aren't in mainline SV's dex, only Champions'). Applied this
file's `GLOBALLY_REMOVED_MOVES`/`ADDITIONS`/`REMOVALS` to that baseline and
diffed the result against the species' real `learnsets.ts` entry.
`annihilape` (Gen-9-native, no legacy-game moves in its all-time pool at
all) matched exactly on the first pass - good confirmation the method
itself is sound before trusting it on the other 21.

**Finding 1 (applied)**: aggregating every "our correction expects this
move, Showdown's mod says it's gone" gap across all 22 species and keeping
only the moves absent from literally every one of the 232 tracked species
(not just one species' own restricted movepool) surfaced 46 more moves
missing from `GLOBALLY_REMOVED_MOVES` - now added
([championsMovepoolChanges.ts](../../src/renderer/config/championsMovepoolChanges.ts),
189 -> 235 entries). All 5 of Leg 4a's Floette carve-out moves (`vine-whip`,
`tackle`, `razor-leaf`, `fairy-wind`, `magical-leaf`) are among the 46 -
none appear anywhere in `learnsets.ts`'s 232 species, including several
Grass-types elsewhere in the file that would have no reason to lose Vine
Whip if Champions left their movepool untouched. That's stronger,
species-scoped evidence than `moves.ts`'s blanket Past flag, so Leg 4a's
carve-out is superseded: all 5 are globally removed now, meaning Floette
(the one species this file's corrections actually reach today) loses them
like every other species.

Moves like `toxic`/`attract`/`doubleteam`/`swagger`/`return`/`revenge` also
showed up as "expected but absent" for several of the 22, but do appear
elsewhere in `learnsets.ts` for other species (e.g. `swagger` is confirmed
present for `annihilape` itself) - real per-species removals, not global
ones, so they were **not** added to `GLOBALLY_REMOVED_MOVES`.

**Finding 2 (documented, not applied - dead code)**: after applying
Finding 1's fix, each of the 22 species still has a residual set of
real per-species discrepancies against its own `learnsets.ts` entry. Not
applied to `CHAMPIONS_MOVEPOOL_ADDITIONS`/`REMOVALS` this session, per Leg
4a's standing finding that all 22 species' entries are dead code today
(PokeAPI's own `champions` tag already covers them, bypassing this file
entirely) - see the "Prune Dead `championsMovepoolChanges.ts` Per-Species
Entries" TODO.md item. Recorded here so whoever resolves that item has the
data instead of re-deriving it:

| Species | Missing from `REMOVALS` (still shows as learnable, Champions disagrees) | Missing from `ADDITIONS` |
|---|---|---|
| barbaracle | doubleteam, torment | - |
| blaziken | seismictoss, toxic, doubleteam, swagger, attract, dynamicpunch, roleplay, defog | - |
| dragalge | swagger, attract, bounce | - |
| eelektross | bind, roar, toxic, doubleteam, swagger, attract, magnetrise, aquatail | - |
| falinks | *(none - matches exactly)* | - |
| gholdengo | *(none - matches exactly)* | - |
| grimmsnarl | attract, darkest-lariat | - |
| houndstone | *(none - matches exactly)* | - |
| malamar | bind, toxic, attract, roleplay, block, allyswitch | - |
| metagross | toxic, doubleteam, dynamicpunch, block, rockpolish, allyswitch | - |
| pyroar-male | toxic, doubleteam, swagger, attract, bounce | - |
| qwilfish | doubleteam, explosion, swagger, attract, bounce, scald | - |
| sceptile | pound, counter, seismictoss, toxic, mudslap, swagger, attract, safeguard, dynamicpunch | - |
| scolipede | doubleteam, strugglebug | - |
| scrafty | toxic, doubleteam, attract | - |
| staraptor | toxic, mudslap, attract, pluck, defog, strugglebug | - |
| swampert | seismictoss, toxic, doubleteam, swagger, attract, dynamicpunch, aquatail, scald, darkest-lariat | - |
| vileplume | doubleedge, doubleteam, reflect, curse, swagger, safeguard, gastroacid, worryseed, drainpunch, infestation | - |
| mawile | doubleteam, mudslap, torment, lastresort | **charm** (Champions grants it; absent from Mawile's PokeAPI all-time movepool entirely, so this isn't even a "removed by Champions" case - it's a Champions-exclusive addition) |
| musharna | torment, worryseed | - |
| overqwil | *(none - matches exactly)* | - |

(Move names above are camelCase-to-kebab as PokeAPI slugs, e.g.
`doubleteam` -> `double-team`, `dynamicpunch` -> `dynamic-punch`,
`allyswitch` -> `ally-switch` - written without the dash here to match
Showdown's own raw move keys, for easy re-searching in
`champions-learnsets.ts` if this table needs re-deriving.)

## Leg 5 (2026-09-01): `formats-data.ts`/`items.ts` evaluated as a roster/item source

Scoping-only session per project convention (scoping and building stay
separate) — no config files touched. Answers the open question this doc's
original Leg 5 recommendation left hanging: does Showdown's tier/
`isNonstandard` data for species actually line up with Champions' real
in-game legal pool, or does it share `moves.ts`'s "the flag doesn't mean
what it looks like" trap (Leg 4a)?

**Method**: raw-fetched `data/mods/champions/formats-data.ts` (5,086 lines,
~2,281 species/form entries) and `data/mods/champions/items.ts` (1,046
lines), both parsed programmatically (regex entry-extraction script,
scratchpad-local, not preserved) rather than summarized-fetched, per the
same discipline as every prior leg in this doc.

### `formats-data.ts` — species roster: **safe to use, ruleset-alignment question resolved**

Unlike `moves.ts`'s Past flag (Leg 4a), species-level `isNonstandard: "Past"`
+ `tier: "Illegal"` in this mod file really does mean "not in Champions'
obtainable pool" — confirmed by spot-checking known-good cases: Legendaries/
Mythicals (`mewtwo`, `mew`, `rayquaza`) are Illegal (matches our roster's
total Legendary exclusion), un-evolved base stages (`bulbasaur`, `eevee`)
are Illegal (matches Champions' "must be a caught, fully-evolved Pokémon"
mechanic - our roster has no pre-evolutions either), and all 22 Reg M-B
species plus every REG_MA_SPECIES entry checked have a real (non-Illegal)
tier.

**Full diff, both directions**, of every non-Mega/Gmax species with a
legal tier (233 entries) against `utils/pokemonRules.ts`'s
`REG_MA_SPECIES`/`REG_MB_ADDED_SPECIES` (235 normalized slugs, after
resolving known naming differences - `mrrime`→`mr-rime`, `kommoo`→
`kommo-o`, regional-form suffixes, the two `-breed`/no-`-breed` Tauros
spellings, etc.): **232/233 agree exactly.** The one disagreement is a real
finding, not a parsing artifact - see below.

### Floette: our roster likely has the wrong form entirely

Both diff directions point at the same root cause. Showdown-legal-but-
missing-from-our-roster: `floetteeternal` (tier UU). Our-roster-but-
Illegal-in-Showdown: `floette`. Three independent pieces of evidence say
this isn't a Showdown quirk - **Champions' actual legal Floette is the
Eternal Flower form, not the ordinary color-variant form our roster
currently lists**:

1. **`formats-data.ts` flips the mainline (non-Champions) relationship
   exactly.** Base (non-modded) `data/formats-data.ts`: `floette` is legal
   (`tier: "NFE"`, no flag), `floetteeternal` is `isNonstandard: "Past"` /
   Illegal (matches its real mainline status - Eternal Flower is an
   unobtainable, event/gift-only cosmetic form). The Champions mod
   overrides *both* in the opposite direction: `floette` →
   `isNonstandard: "Past"` / Illegal, `floetteeternal` → no flag / `tier:
   "UU"`. A mod file only lists deltas, so both entries being explicitly
   touched (not just one) means this is a deliberate swap, not a stray
   flag.
2. **`learnsets.ts`'s only `inherit: true` entry in the entire file is
   `floetteeternal`'s** (already noted in Leg 4b's table as "an unrelated
   Eternal Flower form override" - it isn't unrelated). It carries a full,
   explicit 41-move TM/Tutor learnset, which is exactly what a species
   would need if it's the one actually meant to be played but has almost no
   moves in mainline data to inherit from (Eternal Flower Floette's real SV
   learnset is minimal - it's normally a static gift Pokémon, not one raised
   from an egg/level-up chain).
3. **PokeAPI has a `floette-eternal` resource** (`pokemon-species/
   floette-eternal` returns the variety; `pokemon/floette-eternal` is a
   live 200) - the roster fix is a straight slug swap, not blocked on a
   missing PokeAPI resource.

This also means Leg 4a's per-species safety check ("which of the 194
Past-flagged moves does Floette actually learn by level-up, so they aren't
blanket-removed") was run against the *wrong* species's SV learnset - it
checked ordinary `floette`, not `floette-eternal`. Not re-litigated in this
scoping pass; flagged for whoever picks up the fix leg (see TODO.md).

**Touch points if this gets fixed** (not attempted here — scoping only):
`utils/pokemonRules.ts` (`REG_MA_SPECIES`'s `'floette'` entry),
`config/pokemonRules.ts` (`'Floette'` in the gendered-form list - gender
rules may not even apply the same way to a static-gift form, needs
checking), `config/megaEvolution.ts` (`'floettite': { species: 'floette',
... }`), and `config/championsMovepoolChanges.ts`'s entire Floette-specific
`hasChampionsMoveData` re-audit (needs re-running against `floette-eternal`,
including re-deriving Leg 4a's 5-move learn-by-level-up exclusion list).

### `items.ts` — also viable, same delta-only convention, no conflicts found

Same shape as `formats-data.ts`: entries absent from the mod file inherit
whatever the *base* (non-Champions) dex already says (verified against
`data/items.ts` directly) - most ordinary items are legal-by-default in the
base dex with no flag at all, so they never need a Champions-file entry.
Only items whose legality *changes* relative to mainline get a flag here:
181 entries explicitly `isNonstandard: "Past"` (newly banned - includes
Choice Band/Specs, Assault Vest, Safety Goggles, confirming `vgcData.ts`'s
header comment), and 76 explicitly `isNonstandard: null` (newly un-banned -
74 Mega Stones plus, surprisingly, `spelltag` as the one standalone hold
item Champions restores from a mainline ban).

Spot-checked (slug-normalized) all 72 of `vgcData.ts`'s `VGC_HOLD_ITEMS` +
`VGC_BERRIES` against the 181-entry ban list: **zero conflicts** - nothing
our app treats as legal is actually banned per Showdown's data. Confirms
Choice Scarf's presence in `VGC_HOLD_ITEMS` is correct (it has no entry in
the Champions mod at all, meaning it inherits the base dex's already-legal
default) despite the file's own header comment reading "no Choice items ...
exist in this game" - a stale/overbroad comment, not a real data bug (Choice
Band/Specs *are* banned, Choice Scarf isn't - the comment just didn't say
so precisely). Minor doc nit, not worth its own leg.

**Not done this pass** (lower priority - the direction that matters for
correctness, "are we allowing something banned," came back clean): the
reverse-direction check, enumerating Showdown's full ~700+ item dex for
anything legal-by-default that's simply missing from our curated
allowlist. Would need the same base-dex-inheritance logic as above applied
exhaustively rather than spot-checked. No known driver for doing this beyond
completeness.

### Verdict

Both `formats-data.ts` and `items.ts` are usable as a Showdown-sourced
cross-check the same way `moves.ts`/`abilities.ts`/`learnsets.ts` already
proved to be in Legs 2-4 - the ruleset-alignment risk flagged in the
original Leg 5 recommendation didn't materialize for these two files.
Net result of running the cross-check: 232/233 species agree, 72/72
sampled items agree, and the one disagreement is a real, concrete, fixable
roster bug rather than noise. See TODO.md's new Leg 6 for the fix.

## Leg 6 (2026-09-01): the roster fix, and what it revealed

Applied Leg 5's recommended fix and re-ran the two follow-up checks its
"Touch points" list called for.

**`utils/pokemonRules.ts`**: `REG_MA_SPECIES`'s `'floette'` entry swapped to
`'floette-eternal'`.

**`config/pokemonRules.ts`'s gendered-form entry**: checked, no change
needed. Floette isn't in `GENDERED_FORM_VARIANTS` at all (that table is only
for the four species PokeAPI splits into distinct `-male`/`-female`
resources) - it's in `FEMALE_LOCKED_SPECIES` instead, keyed on the bare
species name. `getFallbackGender` checks `isFemaleLocked` against both the
full species string and `species.split('-')[0]` (the base), so
`"Floette-Eternal"` still resolves its base to `"Floette"` and matches the
existing entry correctly - no static-gift-form special case needed.

**`config/megaEvolution.ts`'s `floettite` mapping**: species field swapped to
`'floette-eternal'`, matching what `showdownData.species` actually holds for
a Floette on a team now (`toDisplayName` in `useSpeciesRoster.ts` renders
PokeAPI's `floette-eternal` slug as `"Floette-Eternal"`). This surfaced a new
finding, not anticipated by Leg 5's touch-points list: `@smogon/calc`'s own
bundled species dex (checked directly in `node_modules/@smogon/calc/src/data/
species.ts`) still attaches its `"Floette-Mega"` entry to base `"Floette"`
(`baseSpecies: 'Floette'`), not `"Floette-Eternal"` - it has no concept of
Champions' Floette/Floette-Eternal legal-form swap. `CURATED_MEGA_FORM_SLUGS`
(consumed by `calcFormes.ts` to gate the Calc tab's Mega toggle) is
mechanically derived as `${species}-${suffix}` from the same map, so once
`species` became `'floette-eternal'` that derivation produced
`'floette-eternal-mega'` - which would never match `@smogon/calc`'s actual
`'floette-mega'` name, silently hiding the Calc tab's Mega toggle for Floette
even though the Team Builder's own sprite-swap match (which does key off our
`species` field) would keep working. Fixed with a small, explicitly-commented
post-processing exception in `megaEvolution.ts` (swap the one Set entry) -
see that file and its new `megaEvolution.test.ts` rather than restating the
reasoning here. Scoped narrowly to Floette; not a general reconciliation of
the two systems (that was already done, see COMPLETED.md's "Mega Eligibility
Team Builder vs Calc Mismatch" entry) - this is a fresh, single-species
instance of the same category of mismatch that entry's fix didn't (and
couldn't have) anticipated, since the roster bug this leg fixes is what
exposed it.

**Re-ran the `hasChampionsMoveData` audit against `floette-eternal` instead
of plain `floette`**, per Leg 5's third touch point (`championsMovepoolChanges.ts`'s Floette-specific corrections). Fetched
`pokemon/floette-eternal` directly from PokeAPI (raw JSON, not summarized):
it carries **41 `champions`-tagged move entries** (all via the `train`/Move
Reminder learn method), vs. bare `floette`'s 0. That means
`hasChampionsMoveData` now resolves `true` for the species this app actually
uses, so `useGameData.ts::applyMovepoolChangesIfNeeded` never reaches
`championsMovepoolChanges.ts` for it at all - same outcome Leg 4a already
found for the 22 Reg M-B species. **This retires `championsMovepoolChanges.ts`'s per-species scope entirely** - there is no longer any species in the
current legal roster this file's corrections (`GLOBALLY_REMOVED_MOVES`
included) actually reach. Not pruned this session, same standing reason as
Leg 4a/4b (an already-cached `NEVER_EXPIRES` `hasChampionsMoveData: false`
entry from before a user's backfill would still depend on it) - see
TODO.md's "Prune Dead `championsMovepoolChanges.ts` Per-Species Entries"
item, whose scope now covers the whole file rather than just the 22 species.
This also means Leg 4a's original 5-move learn-by-level-up safety check
(superseded by Leg 4b anyway) never needed re-deriving against
`floette-eternal`'s real learnset - the question it was trying to answer
("is it safe for `GLOBALLY_REMOVED_MOVES` to apply to Floette") is moot once
`hasChampionsMoveData` gates the whole file out for Floette regardless.

## Leg 7 (2026-09-01): Remaining Champions Mega Ability Audit resolved

Leg 3 exhausted Showdown's mod as a source (13 ability overrides total, all
already accounted for) - the ~25/29-species gap it left (`megaAbilities.ts`'s
header list) needed the external sources CLAUDE.md's `abilities.ts`/
`items.ts` table flagged instead: an Insider Gaming/Kotaku-style reveal
article, cross-checked against Serebii's Champions Pokedex per this
project's cross-check rule.

**Source 1**: Insider Gaming's "All New Mega Pokémon & Abilities in Pokémon
Champions Regulation M-B" article covered only 11 of the 29 (the Regulation
M-B-specific reveal batch) - Eelektross/Pyroar were already confirmed, so it
gave 9 new: Raichu X/Y, Staraptor, Scolipede, Scrafty, Malamar, Barbaracle,
Dragalge, Falinks.

**Source 2**: a Kotaku article ("Pokémon Champions Guide: All The New
Legends: Z-A Mega Evolution Abilities") turned up covering all 34 Champions-
invented Mega forms in one list, including the remaining 20 the Insider
Gaming article didn't have (Meowstic, Chimecho, Golurk, Crabominable,
Emboar, Drampa, Glimmora, Skarmory, Starmie, Chandelure, Delphox, Greninja,
Hawlucha, Clefable, Dragonite, Floette, Froslass, Victreebel, Chesnaught) -
missing only Audino.

**Cross-check**: fetched Serebii's per-species Champions Pokedex page
(`serebii.net/pokedex-champions/<species>/`) for all 29 species individually
rather than trusting either article's summary alone, per CLAUDE.md's
caution against a condensed reference page silently dropping or
mislabeling effects. Every one of the 29 matched exactly between the
article source and Serebii, including several with no name-theming to
guess from the way Leg 3's Dragonize/Mega Sol weren't guessable either
(Golurk -> Unseen Fist, Chandelure -> Infiltrator, Meowstic -> Trace,
Drampa -> Berserk, Victreebel -> Innards Out). Audino (missing from the
Kotaku list) was confirmed by Serebii alone: Mega Audino -> Healer.

One mechanical note worth recording: a web search surfaced a Pikalytics
usage-stat page showing Mega Dragonite splitting between Multiscale
(~82%) and Inner Focus (~18%), which looked like it might mean Dragonite's
Mega doesn't force a single ability the way the others do. Checked
directly against Serebii's own page text (not just the raw ability list) -
it explicitly describes Mega Dragonite's ability as a single fixed entry,
matching Kotaku. Treating the Pikalytics split as stale/pre-reveal usage
data rather than evidence of a real exception; if a live-game check ever
contradicts this, this note is the place to update.

**Applied**: all 29 entries added to `megaAbilities.ts` (`emboar-mega` was
initially dropped from the edit despite being in the header list - caught
by a coverage script diffing `MEGA_ABILITIES`'s keys against every slug
`megaEvolution.ts`'s `MEGA_STONE_TO_SPECIES` derives, added, and the script
re-run clean). Floette keyed `floette-mega` (not `floette-eternal-mega`) to
match `@smogon/calc`'s own forme name, same substitution
`CURATED_MEGA_FORM_SLUGS` already makes for the Calc tab. Added
`megaAbilities.test.ts` (didn't exist before this leg) with a coverage
assertion using the same stone-list diff, so a future new Mega Stone added
to `megaEvolution.ts` without a matching ability entry fails CI rather than
silently falling through to "sprite swaps, ability doesn't." This closes
the "Remaining Champions Mega Ability Audit" backlog item - `megaAbilities.ts`
now has a guaranteed-ability entry for every Mega form in
`MEGA_STONE_TO_SPECIES`, mainline and Champions-invented alike.

## Recommended Leg 2+ breakdown

Per the "smaller working slice per leg" convention, splitting rather than
doing all four config files + both evaluation targets in one pass:

- **Leg 2**: `championsMoveOverrides.ts` audit — resolve the PP-exceptions
  discrepancy above first (it's the concrete, verified finding), promote
  the 11 "lower confidence" entries, drop the redundant crabhammer power
  field, add any Showdown-only balance changes we're missing (not yet
  diffed in the other direction — this pass only checked "does Showdown
  confirm what we already have," not "what does Showdown have that we
  don't"). Also where the actual CLAUDE.md policy-exception addition for
  citing Showdown as a source belongs, since this is the first leg that
  actually adopts it.
- **Leg 3**: `championsAbilityOverrides.ts` audit + the Mega-ability
  cross-reference feeding "Remaining Champions Mega Ability Audit".
- **Leg 4**: `championsMovepoolChanges.ts` / `learnsets.ts` audit - see the
  "Leg 4 heads-up" section above first, since it's a bigger scope than a
  learnset-only audit (a ~200-move `GLOBALLY_REMOVED_MOVES` candidate list,
  not just movepool deltas).
- **Leg 5** (separate, open-ended): evaluate `formats-data.ts`/`items.ts`
  as a roster/tier source — needs the ruleset-alignment question above
  answered first, likely its own scoping pass rather than a straight build
  leg.
- `championsMechanics.ts` (`conditions.ts`) is small enough to fold into
  whichever leg touches it first rather than needing its own.
