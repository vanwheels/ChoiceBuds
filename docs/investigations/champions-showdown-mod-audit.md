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
