# Live Calc Speed Inference — Scoping Session

Design-questions pass surfaced while scoping [Live Calc → Speed Tiers
Tie-in](../../TODO.md)'s own Leg 6, done 2026-09-09. Leg 6's premise
("wire an inferred SP-Speed range from a Live Calc session") turned out not
to be buildable against the actual `liveCalcEngine.ts` — this doc scopes
the missing prerequisite capability.

## The gap that triggered this doc

`utils/liveCalcEngine.ts`'s `LiveCalcInference` narrows **only** `defBound`
and `spdBound` from damage-percent observations — there is no speed field
at all, and this isn't an oversight: a damage-percent observation (a known
attacker's move vs. a defender, read as % of the defender's max HP) is
structurally incapable of revealing the defender's Speed. Speed doesn't
factor into ordinary damage output. `COMPLETED.md`'s Live Calc Engine —
Leg 1 entry confirms this was a deliberate build-time scope (HP held at a
fixed default, only Def/SpD solved for), not a gap that slipped through.
[speed-calc-scope.md](speed-calc-scope.md)'s original "Live stat-inference
tie-in" pillar assumed an inferred Speed range would already exist by the
time Leg 6 got built — it doesn't, so Leg 6 can't be built as originally
imagined without this new capability first.

## Resolved (2026-09-09, Vanny's calls via AskUserQuestion)

- **Build real Speed inference first, as its own leg** — not a Leg 6
  descope to a manual pin, not dropping the tie-in outright. Leg 6 stays
  scoped as originally imagined; this leg is its prerequisite.
- **Observation mechanism: turn-order only.** Per observation: did the
  attacker (the user's own Pokémon) or the defender act first this turn,
  given the move/priority already known. Mirrors the existing damage%
  observation list UI/pattern in `components/livecalc/`. Electro
  Ball/Gyro Ball damage-based inference (their BP is speed-ratio-derived)
  was considered and explicitly **not** chosen for v1 — it would couple
  defender Speed and SpD as two unknowns in a single observation, real
  added engine complexity beyond what a v1 heuristic should take on.
- **Field effects: neutral only for v1.** No Tailwind/Trick
  Room/paralysis state tracked per observation — the turn-order comparison
  assumes a neutral field on every observed turn. Matches the existing
  engine's own precedent for deferring complexity (multi-hit/crit variance
  was cut the same way in Live Calc Engine — Leg 1). Documented gap, not a
  silent one — an observation entered from a turn where one of these was
  actually active will produce a wrong/misleading narrowing with nothing
  to flag it, until a later leg adds that state.

## Resolved during the build (2026-09-09, Leg 15)

- **Exact turn-order math.** Implemented in `utils/liveCalcSpeedEngine.ts::
  inferDefenderSpeed()`: for each defender nature candidate (reused from
  `inferDefenderStats()`'s already-narrowed `natureCandidates`, not the
  full gen nature list), scans Speed SP 0-32 and keeps the sub-range whose
  computed Speed is consistent with the observed order against the
  attacker's fixed Speed — same per-observation intersection-of-bounds
  shape as `feasibleSpRange`, comparing computed Speed stats instead of
  damage ranges. Only the nature axis is scanned (not ability/item, unlike
  the damage engine's three-axis scan) — ability/item aren't Speed-relevant
  in v1, per this doc's own Resolved section above.
- **Base vs. effective Speed, and which side.** Both sides are compared on
  unboosted base Speed (level+nature+SP+IVs only) — no stage boosts,
  status, or weather speed-abilities for the attacker either, not just the
  defender. The scope doc's "given both combatants' known/candidate base
  Speed" wording already implied this; going further and honoring the
  attacker's own boosts/status/weather (all already-known, unlike the
  defender's) was considered and rejected for v1 consistency — asymmetric
  treatment would make a boosted or paralyzed attacker's turn-order
  observations misnarrow in a way that'd look like an engine bug rather
  than a documented limitation. Same "real gap, not a silent one" shape as
  the neutral-field call above.
- **Priority moves.** A priority attacker move decides turn order outright
  regardless of Speed — such an observation is skipped/flagged into
  `contradictions`, same treatment as an unrecognized move. The defender's
  own move that turn is never known to this engine (only species/level/
  candidates are), so a defender priority move remains an undetectable
  confound — documented in the engine file's header, not solved.
- **Speed ties.** Handled inline in the per-SP scan rather than as a
  separate observation type: a computed tie at a given candidate SP counts
  as consistent with either observed order, so it's never eliminated by a
  turn-order observation in either direction — falls out naturally from
  the `defenderSpeed === attackerSpeed` branch in `feasibleSpeedRange()`
  rather than needing a "tied" answer the UI would have had to expose.
- **UI shape.** A new `LiveCalcTurnOrderList.tsx` component alongside the
  existing damage% `LiveCalcObservationList.tsx` (not merged into it — the
  two observation shapes don't share fields), plus a third `StatBoundBar`
  in `LiveCalcResultPanel.tsx` for Speed SP alongside the existing Def/SpD
  bars.

## Still open

- **Leg 6's wiring mechanism** (shared hook state vs. an explicit "send to
  Speed Tiers" action) stays deferred until Leg 6's own build session, now
  that `inference.speedBound` actually exists to wire — not resolved by
  this leg, which only produces the data.

## Prior art in-repo

- `utils/liveCalcEngine.ts` / `docs/investigations/live-calc-stat-inference-scope.md`
  — the Def/SpD inference engine this mirrors in shape (per-observation
  bound narrowing, SP 0-32 scan, `contradictions` list for unusable
  observations).
- `hooks/useLiveCalc.ts` — where the new turn-order observation list/state
  would plug in alongside the existing damage% `observations`.
