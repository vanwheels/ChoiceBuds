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

## Open follow-ups the build leg still has to settle

- **Exact turn-order math.** Given both combatants' known/candidate base
  Speed, nature candidates (already tracked for the defender via the
  existing Def/SpD inference — reuse `natureCandidates`), and the SP range
  scan (0-32, same `SP_MIN`/`SP_MAX` the existing engine uses), which SP
  values are consistent with "attacker moved first" vs. "defender moved
  first" this turn. Same per-observation intersection-of-bounds shape as
  `feasibleSpRange`, just comparing computed Speed stats instead of damage
  ranges.
- **Priority moves.** A priority move on either side decides turn order
  outright regardless of Speed — those observations narrow nothing about
  Speed and should be skipped/flagged, same treatment as an unusable
  observation in the existing `contradictions` list.
- **Speed ties.** Real Showdown/Champions resolves speed ties by a random
  per-turn coin flip, not a fixed order — a tied-speed observation is
  ambiguous evidence either direction and needs its own handling (most
  likely: don't let it narrow anything, since either outcome is
  consistent with a tie).
- **UI shape** — new observation type alongside or replacing the existing
  damage% list in `LiveCalcObservationList.tsx`/`LiveCalcResultPanel.tsx`.
  Not decided here; an implementation-shape call for the build leg like
  the original engine's own UI wiring was.
- **Leg 6's wiring mechanism** (shared hook state vs. an explicit "send to
  Speed Tiers" action) stays deferred until this leg actually produces a
  `speedBound` to wire — asking that question now, before the data exists
  to wire, would be premature the same way the original scoping doc left
  it for the tie-in leg itself.

## Prior art in-repo

- `utils/liveCalcEngine.ts` / `docs/investigations/live-calc-stat-inference-scope.md`
  — the Def/SpD inference engine this mirrors in shape (per-observation
  bound narrowing, SP 0-32 scan, `contradictions` list for unusable
  observations).
- `hooks/useLiveCalc.ts` — where the new turn-order observation list/state
  would plug in alongside the existing damage% `observations`.
