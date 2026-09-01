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
| `moves.ts` | ~439 entries, mostly `isNonstandard: "Past"` flags + a smaller set of real balance overrides (`basePower`/`accuracy`/`type`/`pp`) | `championsMoveOverrides.ts` |
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
- **Leg 4**: `championsMovepoolChanges.ts` / `learnsets.ts` audit.
- **Leg 5** (separate, open-ended): evaluate `formats-data.ts`/`items.ts`
  as a roster/tier source — needs the ruleset-alignment question above
  answered first, likely its own scoping pass rather than a straight build
  leg.
- `championsMechanics.ts` (`conditions.ts`) is small enough to fold into
  whichever leg touches it first rather than needing its own.
