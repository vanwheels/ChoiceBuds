# Live Calc Turn-Order Speed Stage Boosts — Scoping Session

Design-questions pass for [Live Calc Turn-Order Speed Stage Boosts](../../TODO.md)'s
own Leg 16, done 2026-09-10. Resolves the open design questions Leg 16's own
TODO body — and `utils/liveCalcSpeedEngine.ts`'s own header — left open when
Leg 15 shipped the base (unboosted-both-sides) turn-order engine. Same shape
as [live-calc-speed-inference-scope.md](live-calc-speed-inference-scope.md)
(Leg 15's own scope doc).

## The gap that triggered this doc

Leg 15's turn-order engine (`inferDefenderSpeed()`/`feasibleSpeedRange()`)
compares both sides' **unboosted** base Speed only — no Speed stage for
either side (a Speed Boost proc, an Icy Wind drop, a self-boost on a
Speed-relevant set). This was a deliberate v1 call documented in the engine's
own header ("both sides are compared on unboosted base Speed... for
symmetry"), not an oversight — but it means a turn observed after a boost/drop
misnarrows with nothing to flag it.

## Resolved (2026-09-10, Vanny's calls via `AskUserQuestion`)

- **Defender-side capture granularity: per-observation, not per-Pokémon.**
  A single global "assumed stage" can't represent a stage that changes
  partway through a logged battle (the TODO's own headline example — a
  Speed Boost proc after turn 2 but not before). Each turn-order row gets
  its own stage field, defaulting to 0/neutral, same per-row shape as
  `moveName` already has.
- **Defender-side mechanism: known/fixed input, not a scanned axis.** The
  user asserts the stage they believe is active for that turn; the engine
  applies it directly rather than treating it as an unknown to narrow
  alongside nature. Keeps observations single-unknown, consistent with Leg
  15's own precedent of rejecting Electro Ball/Gyro Ball inference for
  coupling two unknowns (defender Speed + SpD) into one observation — adding
  a scanned stage axis here would be the same kind of complexity jump.
- **Attacker side: honor the panel's live boosts + status, dropping the
  "unboosted both sides for symmetry" v1 call.** The attacker's boosts and
  status are already editable on the existing `CalcPokemonPanel` and already
  feed `computeBoostedStats()`/`computeEffectiveSpeed()` for that panel's own
  displayed stats — this is already-known data, not a new input. The
  "symmetry" rationale in Leg 15's header stops applying once the defender
  side gets its own explicit stage input (both sides now factor in what's
  actually known/asserted for that turn, rather than one side being honored
  and the other flattened for consistency).

## What Leg 16's build needs to touch (scope only — nothing below is built yet)

- `LiveCalcTurnOrderObservation` (`liveCalcSpeedEngine.ts`) gains
  `defenderSpeedStage: number` (-6..+6, default 0).
- `feasibleSpeedRange()` applies the same stage-boost multiplier to each
  candidate SP's computed `rawStats.spe` before comparing against the
  attacker — reuses the `boostMultiplier()` math `damageCalcEngine.ts`
  already has, which needs exporting (currently a local, unexported
  function there).
- `inferDefenderSpeed()` switches `attackerSpeed` from
  `buildPokemon(gen, attacker).rawStats.spe` to
  `computeEffectiveSpeed(gen, attacker, '')`. Weather stays `''` — Live Calc
  doesn't track field weather anywhere in `useLiveCalc.ts`, so this only
  picks up boosts + paralysis-halving, not weather-ability Speed doubling
  (Swift Swim/Chlorophyll/etc. stay out of scope, same as before).
- `LiveCalcTurnOrderList.tsx` gets a new per-row stage input, same -6..+6
  numeric shape/clamping as `CalcStatRows.tsx`'s existing boost inputs.
- `useLiveCalc.ts`'s `defaultTurnOrderObservation()` needs
  `defenderSpeedStage: 0` added to its default shape.
- `liveCalcSpeedEngine.ts`'s file header needs updating — the "both sides
  unboosted for symmetry" paragraph is being reversed, not just extended,
  so it can't just get a new bullet appended.

## Still open / explicitly out of scope for Leg 16

- Defender-side status (paralysis) and Tailwind/weather-ability Speed
  changes remain untracked — this leg is stage boosts only, matching its
  own title. Still a documented gap in the engine header, same as Leg 15
  left it (and as `docs/investigations/live-calc-speed-inference-scope.md`'s
  "neutral field" resolution already called out).
- Priority-move handling, Speed-tie handling, and the nature-axis scan
  mechanics are unchanged from Leg 15.
- Leg 6's wiring mechanism (shared hook state vs. an explicit "send to Speed
  Tiers" action) is still deferred to Leg 6's own build session per Leg 15's
  scope doc — untouched by this leg.

## Prior art in-repo

- `docs/investigations/live-calc-speed-inference-scope.md` — Leg 15's own
  scope doc, same shape as this one.
- `utils/damageCalcEngine.ts::computeBoostedStats`/`computeEffectiveSpeed` —
  already does exactly this boost+status(+weather) combination for the
  attacker panel's own displayed stats; this leg reuses it rather than
  reimplementing.
- `components/calc/CalcStatRows.tsx` — existing boost-stage input UI to
  mirror for the new per-observation defender field.
