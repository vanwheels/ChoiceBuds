# Live Calc: Page Layout & Function Rework — Scoping Session

Scoping pass done 2026-09-11 per `TODO.md`'s hand-off note (Result Clarity
Pass shipped the result panel's own readability, but Vanny stayed unhappy
with the tab's layout/function as a whole and wanted to spend more time with
the page before turning it into legs). Resolves into the legs now sitting
under `TODO.md`'s Current Milestone section.

## The core model shift

Today's tab is one-directional: the attacker (your own Pokémon) is fully
known, the defender (the opponent's) is the only thing ever narrowed, and
narrowing only comes from "your move → damage% into them" observations plus
turn-order reads.

Vanny's actual mental model, same as the real Calc tab: your own Pokémon is
always fully known (you built/imported it), but the *opponent* isn't just
"the thing you're attacking" — their moves land on you too, and that
direction currently isn't modeled or shown at all. Both directions narrow
the *same* opponent stat spread:

- **Your move → them**: narrows their Def/SpD (already built).
- **Their move → you**: narrows their Atk/SpA/nature (new).
- **Turn order**: narrows their Speed/nature (already built, Leg 15 of the
  prior milestone).

So there's still exactly one "unknown" Pokémon in singles (the opponent's),
not two simultaneously-unknown sides — it's just now narrowed from two
directions of combat evidence instead of one, and both directions need to
be visible live as move grids the way the real Calc shows two grids at
once, rather than a single result panel for one direction only.

Doubles (two unknown opponents at once) stays out of scope — Vanny called
this out explicitly ("we aren't there yet").

## Resolved (2026-09-11, Vanny's calls)

- **Observation entry stays list-based.** The existing "add an observation
  row" list pattern stays (not replaced with inline entry on the move-grid
  row) — it's what already lets a single move log more than one distinct
  hit (crit vs. non-crit variance across turns), and a live grid rendered
  from the current narrowed state sits above/alongside it, same relationship
  as today's result panel to today's observation list. A second, mirrored
  list is added for the new "their move → you" direction.
- **Known-fact locks expand beyond ability.** The existing Known-Ability
  Lock pattern (`liveCalcEngine.ts`'s `knownAbility` override) extends to
  item, nature, **and all six stat-boost stages** (today only Def/SpD boost
  stage are exposed on the opponent panel — Atk/SpA/Spe boost stages need
  the same treatable-as-known fields, since the opponent's own boosts, e.g.
  a seen Swords Dance/Dragon Dance, affect incoming damage on you same as
  outgoing damage from you).
- **Leg 1 stays layout + bidirectional engine only.** No popup launcher, no
  Battle Log auto-populate, no doubles this leg — see "Deferred" below.

## Leg breakdown

1. **Bidirectional Inference Engine** — `liveCalcEngine.ts` gains the
   mirror direction: infer the opponent's Atk/SpA candidates from "their
   move did X% to you" observations, the same heuristic-narrowing shape
   `inferDefenderStats()` already uses for Def/SpD. `LiveCalcDefenderInput`
   (or whatever it's renamed to, now that "defender" isn't quite right once
   the same Pokémon attacks too) grows `knownItem`, `knownNature`, and
   `atkBoost`/`spaBoost`/`speBoost` alongside the existing `defBoost`/
   `spdBoost`/`knownAbility`. Pure engine + hook plumbing, covered by the
   same `liveCalcEngine.test.ts`/`useLiveCalc.test.ts` pattern already in
   place. No UI changes yet.
2. **Opponent Panel & Reverse Observations** — wires Leg 1's new inputs
   into `LiveCalcDefenderPanel` (item/nature dropdowns, the 4 missing boost
   stage inputs) and adds the mirrored "their move → you" observation list
   next to the existing one.
3. **Layout & Live Range Grid Rework** — reorganizes `LiveCalcPage` to
   mirror `CalcPage`'s structure: two move grids up top (yours → them,
   theirs → you), each cell showing a min–max % range instead of a single
   number since the opponent's spread is never fully resolved; a result
   panel below; the Pokémon-panel row underneath. Needs a range-aware grid
   variant since today's `CalcMoveGrid` assumes one fixed `Result` per
   move.

## Deferred (raised by Vanny, explicitly not this milestone)

- **Global popup launcher** — a button reachable from anywhere in the app
  that pops the Live Calc as an overlay. Not scoped yet; revisit once the
  layout/engine rework above has shipped and settled.
- **Battle Log auto-populate** — opening that popup from inside an active
  Battle Log session should pre-fill both sides from the Pokémon already
  selected there. Depends on the popup launcher above existing first.
- **Doubles support** (2 unknown opponents, ally-side interactions) — noted
  as a real future need, not scoped.
