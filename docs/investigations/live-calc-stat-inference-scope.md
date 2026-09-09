# Live Calc: Damage-Based Stat Inference — Scoping Session

Design-questions pass for the "Live Calc" milestone, done 2026-09-08 per the
hand-off note left in `TODO.md`'s Future Milestones section when it was first
surfaced (deferred until this milestone actually started, rather than
answered at surface time). Resolves into the legs now sitting under
`TODO.md`'s Current Milestone section.

## Resolved (2026-09-08, Vanny's calls)

- **Unknowns to solve for**: nature, full SP spread (all 6 stats), ability,
  AND item are all unknown for the defender. Species and level are entered
  the same way the existing Calc tab's dropdowns work - known inputs, not
  solved for. The attacker is the user's own Pokémon and is fully known
  (reuse `CalcPokemonState` as-is - nothing new needed there).
- **Search space stays tractable despite "everything unknown"**: ability is
  already constrained to the species' own real ability pool (`@smogon/calc`'s
  gen data already exposes this - typically 1-3 options, same source
  `CalcPokemonPanel` already reads for its own ability dropdown). Item needs a
  **new curated "damage-relevant defensive items" shortlist** (new
  `config/` file) rather than the full ~200-item VGC pool - most items don't
  affect damage *taken* at all; only a handful do (Assault Vest, type-resist
  berries, a few others).
- **Observation entry**: manual. Per observation: attacker's move used +
  observed damage as a percent of the defender's max HP (not exact HP -
  that's what a real battle's health bar actually shows, and exact HP isn't
  knowable anyway since defender's max HP is itself SP-dependent and
  unknown).
- **Solve method**: heuristic v1, not brute-force. Per-stat/per-variable
  bound narrowing from each observation, explicitly a starting point -
  migrate toward a hybrid (heuristic first pass, brute-force only within the
  narrowed range) later if v1's precision proves insufficient live. Don't
  build the brute-force path preemptively.
- **Persistence**: transient scratchpad only, same as today's Calc tab
  (`useDamageCalc`) - no new JSON store, lost on tab switch/app restart.

## Assumptions (not asked directly - stated here, flag if wrong)

- **Doubles-only v1** (corrected 2026-09-08 - singles was the wrong default
  to assume; Doubles is Champions' actual competitive format, singles is
  secondary): field `gameType` is fixed to `Doubles`, matching the existing
  Calc tab's own default. This brings in the spread-move 0.75x damage
  modifier that a pure singles model wouldn't need - a spread move only
  takes the reduction when it actually lands on more than one target, so
  each observation involving a spread-capable move must record whether it
  hit 1 or 2 targets that turn, not just the move name and damage%. Ally-
  side boosts the engine already models as side conditions (Battery, Power
  Spot, Steely Spirit) apply the same way they do in today's Calc tab.
- **No crit/multi-hit variance in v1 observations**: an observation assumes a
  non-crit, default-hit-count roll (matching the move's own base 85-100%
  damage-roll variance, which the heuristic must already tolerate as noise
  regardless). Multi-hit moves (Bullet Seed, etc.) and crits add extra
  unresolved variance on top of that - excluded from v1 rather than modeled.
- **HP/defensive-stat coupling not fully disentangled in v1**: a single
  observation's damage% depends on BOTH the defender's max HP (HP-stat SPs,
  unknown) and its relevant defensive stat (Def or SpD SPs, unknown)
  simultaneously - a pure per-stat heuristic can't cleanly separate the two
  from one data point alone. v1 accepts this as an approximation rather than
  blocking the whole feature on it; the specific tradeoff (bound the
  *combined* effective-stat ratio vs. hold HP at a documented default) is
  [Live Calc Engine - Leg 1](../../TODO.md)'s own design detail to settle
  while building, not resolved further here.
- **Move category picks the narrowed stat**: a physical move's observation
  narrows Def-side unknowns (Def SP + relevant item/ability); a special
  move's narrows SpD-side. An observation can't narrow the *other* side at
  all - accumulating both physical and special observations against the same
  defender narrows both sides independently, never jointly.

## Open follow-ups Leg 1 still has to settle while building

- Exact heuristic math: how a single damage% observation converts into a
  bound on the relevant unknown(s), and how multiple observations (same or
  different moves, against the same defender) intersect their bounds down
  over time.
- The curated damage-relevant-items list's actual content (which items to
  include/exclude) - needs the same research-and-cite treatment as existing
  `config/` tables (Bulbapedia/Showdown source, per root `CLAUDE.md`'s
  sourcing rules).
- Confidence/display shape: an exact range per stat vs. a ranked list of
  candidate SP values vs. a probability-weighted display - a UI-facing
  question, but constrained by what the engine can actually produce, so
  worth settling engine-side first.

## Prior art (surfaced before this pass, still relevant)

`_archived/battle-logger/utils/battleCalcReview.ts` reconstructs a Calc-page
payload from logged battle state (known state → damage estimate - the
*reverse* direction from what Live Calc needs, observed damage → inferred
state) but is useful reference for how field/side-condition state was
modeled against `@smogon/calc` in this codebase before.
