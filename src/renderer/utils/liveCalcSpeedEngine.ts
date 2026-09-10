/**
 * Live Calc Speed Inference Engine - narrows a defender's unknown Speed SP
 * range (and further trims its nature candidates) from a list of turn-order
 * observations against a fully-known attacker. See docs/investigations/
 * live-calc-speed-inference-scope.md for the resolved design questions this
 * implements (Leg 15, the prerequisite [Live Calc → Speed Tiers Tie-in]
 * surfaced in TODO.md) and liveCalcEngine.ts's own header for the damage%
 * engine this mirrors in shape (SP 0-32 scan, per-observation
 * intersection-of-bounds). Takes an already-computed `LiveCalcInference`
 * (from `inferDefenderStats()`) and returns an updated copy with
 * `speedBound`/`speedObservationCount` narrowed and `natureCandidates`
 * possibly further trimmed - doesn't touch defBound/spdBound/
 * abilityCandidates/itemCandidates, since ability/item aren't Speed-relevant
 * in v1 (per the scope doc's resolved call to scan only the nature axis).
 *
 * ## What a turn-order observation means
 * Each observation records which side (the user's own Pokémon, or the
 * defender) acted first on an observed turn, plus the attacker's own move
 * that turn (needed for its priority - see below) and the defender's own
 * Speed stage for that turn, under these v2 assumptions (Leg 16 - see
 * docs/investigations/live-calc-turn-order-speed-stage-boosts-scope.md):
 * - **The attacker's Speed honors the existing panel's live boosts +
 *   status**, via `computeEffectiveSpeed()` (weather always passed as `''`
 *   - Live Calc tracks no field weather anywhere, so this only picks up
 *   stage boosts + paralysis-halving, not weather-ability Speed doubling).
 *   This is already-known/editable data on `CalcPokemonPanel`, not a new
 *   input. **The defender's Speed stage is a per-observation, user-asserted
 *   field** (`defenderSpeedStage`, -6..+6, default 0) applied directly to
 *   each scanned SP candidate's computed `rawStats.spe` - a known/fixed
 *   input the engine applies, not a second unknown scanned alongside
 *   nature (that would couple two unknowns into one observation, the same
 *   complexity jump Leg 15 already rejected for Electro Ball/Gyro Ball).
 *   Leg 15's original "both sides unboosted for symmetry" v1 call is
 *   reversed by this: the defender no longer needs to be left neutral for
 *   consistency with the attacker, since it now gets its own explicit
 *   stage input. Defender status (paralysis) and Tailwind/weather-ability
 *   Speed changes remain untracked - still a documented gap, just a
 *   narrower one than before.
 * - **The defender's own move that turn had no priority.** Only the
 *   attacker's move (fully known) can be checked for priority; the
 *   defender's move that turn is never known to this engine (only its
 *   species/level/candidates are), so a defender priority move is an
 *   unmodeled confound this engine can't detect or flag.
 * - **Speed ties are ambiguous, not contradictory.** A tied computed Speed
 *   is consistent with either observed order (real Showdown/Champions
 *   coin-flips a tie), so a candidate SP/nature pair at an exact tie is
 *   never eliminated by a turn-order observation either direction - it's
 *   simply not evidence either way at that value.
 *
 * A priority attacker move decides the turn outright regardless of Speed,
 * so those observations are unusable for narrowing and are skipped/flagged
 * into `contradictions`, same treatment as an unrecognized/multi-hit move in
 * `inferDefenderStats()`.
 */

import { Pokemon, toID } from '@smogon/calc';
import type { Generation, NatureName, StatsTable } from '@smogon/calc/dist/data/interface';
import { boostMultiplier, computeEffectiveSpeed, type CalcPokemonState } from './damageCalcEngine';
import { MAX_IVS, spsToEvs, resolveCalcSpecies } from './championsStats';
import type { LiveCalcInference, LiveCalcStatBound, LiveCalcDefenderInput } from './liveCalcEngine';

const SP_MIN = 0;
const SP_MAX = 32;
const ZERO_SPS: StatsTable = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

export type TurnOrderResult = 'attacker' | 'defender';

export interface LiveCalcTurnOrderObservation {
  /** The attacker's move used that turn - only its priority matters here (see file header). */
  moveName: string;
  /** Which side acted first this turn. */
  wentFirst: TurnOrderResult;
  /** The defender's asserted Speed stage for this turn (-6..+6, default 0) - a known/fixed
   * input applied directly to each scanned SP candidate, not a second scanned unknown (see file header). */
  defenderSpeedStage: number;
}

function intersectBounds(a: LiveCalcStatBound, b: LiveCalcStatBound): LiveCalcStatBound | null {
  const min = Math.max(a.min, b.min);
  const max = Math.min(a.max, b.max);
  return min <= max ? { min, max } : null;
}

function unionBounds(bounds: (LiveCalcStatBound | null)[]): LiveCalcStatBound | null {
  const feasible = bounds.filter((b): b is LiveCalcStatBound => b !== null);
  if (feasible.length === 0) return null;
  return {
    min: Math.min(...feasible.map(b => b.min)),
    max: Math.max(...feasible.map(b => b.max)),
  };
}

/**
 * For one nature candidate, scans Speed SP 0-32 and returns the sub-range
 * consistent with the observed turn order against the attacker's effective
 * Speed - a tie at any SP counts as consistent with either order (see file
 * header). Each candidate's raw Speed is stage-boosted by the observation's
 * asserted `defenderSpeedStage` before comparing, same `boostMultiplier()`
 * math `computeEffectiveSpeed()` applies to the attacker side. Returns null
 * if no SP value is consistent at all.
 */
function feasibleSpeedRange(
  gen: Generation,
  defenderSpecies: string,
  level: number,
  nature: NatureName,
  attackerSpeed: number,
  wentFirst: TurnOrderResult,
  defenderSpeedStage: number,
): LiveCalcStatBound | null {
  let feasibleMin: number | null = null;
  let feasibleMax: number | null = null;
  for (let sp = SP_MIN; sp <= SP_MAX; sp++) {
    const sps: StatsTable = { ...ZERO_SPS, spe: sp };
    try {
      const defenderPokemon = new Pokemon(gen, resolveCalcSpecies(defenderSpecies), {
        level,
        nature,
        evs: spsToEvs(sps),
        ivs: MAX_IVS,
      });
      const defenderSpeed = Math.floor(defenderPokemon.rawStats.spe * boostMultiplier(defenderSpeedStage));
      const consistent =
        defenderSpeed === attackerSpeed ||
        (wentFirst === 'attacker' && attackerSpeed > defenderSpeed) ||
        (wentFirst === 'defender' && defenderSpeed > attackerSpeed);
      if (consistent) {
        feasibleMin = feasibleMin === null ? sp : Math.min(feasibleMin, sp);
        feasibleMax = feasibleMax === null ? sp : Math.max(feasibleMax, sp);
      }
    } catch {
      continue; // an invalid combo at this SP value just isn't feasible - not a hard failure
    }
  }
  return feasibleMin === null ? null : { min: feasibleMin, max: feasibleMax! };
}

/**
 * Narrows `inference.speedBound` (and, where a nature turns out infeasible
 * under every scanned Speed SP, `inference.natureCandidates` too) from a
 * list of turn-order observations, processed in order same as
 * `inferDefenderStats()`. Takes the inference already produced by that
 * function and returns an updated copy - doesn't touch
 * defBound/spdBound/abilityCandidates/itemCandidates.
 */
export function inferDefenderSpeed(
  gen: Generation,
  attacker: CalcPokemonState,
  defender: LiveCalcDefenderInput,
  inference: LiveCalcInference,
  observations: LiveCalcTurnOrderObservation[],
): LiveCalcInference {
  const result: LiveCalcInference = { ...inference, contradictions: [...inference.contradictions] };
  if (!attacker.species || !defender.species) return result;

  const effectiveAttackerSpeed = computeEffectiveSpeed(gen, attacker, '');
  if (effectiveAttackerSpeed === null) {
    result.contradictions.push('Attacker Pokémon could not be built - check its species/stats.');
    return result;
  }
  const attackerSpeed = effectiveAttackerSpeed;

  for (const obs of observations) {
    const moveData = gen.moves.get(toID(obs.moveName));
    if (!moveData) {
      result.contradictions.push(`"${obs.moveName}" isn't a recognized move - turn-order observation skipped.`);
      continue;
    }
    if ((moveData.priority ?? 0) !== 0) {
      result.contradictions.push(`"${obs.moveName}" has priority - turn order isn't Speed-based, observation skipped.`);
      continue;
    }

    const natureResults = result.natureCandidates.map(nature => ({
      nature,
      bound: feasibleSpeedRange(gen, defender.species, defender.level, nature, attackerSpeed, obs.wentFirst, obs.defenderSpeedStage),
    }));
    const feasibleNatures = natureResults.filter(r => r.bound !== null);

    const orderText = obs.wentFirst === 'attacker' ? 'you went first' : 'the defender went first';
    if (feasibleNatures.length === 0) {
      result.contradictions.push(`Turn order for "${obs.moveName}" (${orderText}) contradicts every narrowed nature so far - ignored.`);
      continue;
    }

    const observationBound = unionBounds(feasibleNatures.map(r => r.bound));
    const newBound = observationBound ? intersectBounds(result.speedBound, observationBound) : null;
    if (!newBound) {
      result.contradictions.push(`Turn order for "${obs.moveName}" (${orderText}) contradicts earlier Speed observations - ignored.`);
      continue;
    }

    result.speedBound = newBound;
    result.speedObservationCount++;
    result.natureCandidates = feasibleNatures.map(r => r.nature);
  }

  return result;
}
