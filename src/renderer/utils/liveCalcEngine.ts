/**
 * Live Calc Inference Engine - pure, React-free heuristic that narrows an
 * unknown defender's nature/SP-spread/ability/item from a list of observed
 * damage-percent readings against a fully-known attacker. See
 * docs/investigations/live-calc-stat-inference-scope.md for the resolved
 * design questions this implements, and TODO.md's "Live Calc Engine" entry
 * for the leg this belongs to. No UI/state here - `hooks/useLiveCalc.ts`
 * (a later leg) owns that.
 *
 * ## Method: per-variable heuristic narrowing, not brute-force
 * Per Vanny's call in the scope doc, this deliberately does NOT brute-force
 * the full joint cross-product of (nature x ability x item x all 6 SP
 * stats) against every observation - that's explicitly deferred to a later
 * hybrid pass if this proves insufficient live. Instead, each unknown axis
 * (nature, ability, item, and the one relevant defensive SP stat) is
 * evaluated independently per observation: for each candidate value on that
 * axis, scan the relevant stat's SP 0-32 with every OTHER axis held at a
 * neutral/no-effect default (nature=Hardy, no ability, no item), and check
 * whether any SP value's computed damage-percent range covers the observed
 * reading. A candidate survives if at least one SP value is feasible; the
 * observation's overall SP bound is the union of every surviving candidate's
 * feasible range across all three axes. This still reuses `@smogon/calc`'s
 * real `calculate()` for the actual damage math (not a hand-derived formula)
 * - only the axis/candidate iteration around it is the "heuristic" part.
 *
 * Known approximation this introduces: because axes are scanned
 * independently (not jointly), a true defender state that combines TWO
 * non-default axes at once (e.g. a Def-boosting nature AND a Def-relevant
 * berry together) can look infeasible on either axis alone even though the
 * combination would explain the observation - this can produce a false
 * "contradicts prior observations" verdict in that specific edge case. This
 * is the tradeoff Vanny's scope doc calls out as acceptable for a v1
 * starting point; the eventual hybrid brute-force pass (once the SP/
 * candidate ranges are already narrowed) is what would close this gap.
 *
 * ## Other v1 approximations (all flagged in the scope doc as Leg 1's own
 * design details to settle, or as stated assumptions):
 * - HP SPs are held at a fixed default (`HP_SP_DEFAULT`, chosen as the
 *   midpoint 16) rather than solved for jointly with the relevant defensive
 *   stat - the scope doc explicitly allows this HP/defense-stat coupling
 *   approximation rather than blocking on disentangling both unknowns from
 *   one data point.
 * - No crit, no multi-hit: multi-hit moves (Bullet Seed etc.) are rejected
 *   as unusable observations outright (recorded as a contradiction/warning)
 *   rather than modeled with their own extra variance.
 * - No field state (weather/terrain/screens/side conditions) - Leg 1's own
 *   TODO.md entry scopes the engine's inputs to attacker + defender
 *   species/level + observations only, nothing field-related. Every scan
 *   uses a bare neutral Field (`gameType` alone, switched to `'Singles'` for
 *   a single-target hit of a spread-capable move so `@smogon/calc` doesn't
 *   wrongly apply its automatic Doubles 0.75x spread modifier - see
 *   `isSpreadMove`/`effectiveGameType` below).
 * - Status condition and stat-stage boosts on the defender aren't tracked
 *   (not part of the resolved unknowns list - nature/SP-spread/ability/item
 *   only).
 */

import { calculate, Pokemon, Move, Field, toID } from '@smogon/calc';
import type { Generation, GameType, NatureName, StatsTable } from '@smogon/calc/dist/data/interface';
import { getChampionsCalcMoveOverride } from '../config/championsMoveOverrides';
import { getChampionsAbilityDamageEffect } from '../config/championsAbilityDamageEffects';
import { normalizeNameForAPI } from '../services/pokeapiService';
import { LIVE_CALC_DEFENSIVE_ITEMS } from '../config/liveCalcDefensiveItems';
import { MAX_IVS, spsToEvs, resolveCalcSpecies } from './championsStats';
import { buildPokemon, type CalcPokemonState } from './damageCalcEngine';

const SP_MIN = 0;
const SP_MAX = 32;
/** Documented midpoint default for the defender's unsolved HP SPs - see this
 * file's header for why HP/defense-stat coupling isn't fully disentangled. */
const HP_SP_DEFAULT = 16;
/** Extra slack beyond a move's own natural 85-100% roll window, to absorb a
 * health-bar-read observation's inherent imprecision and floor/round noise
 * at a candidate's range boundary. */
const PERCENT_TOLERANCE = 0.5;
const ZERO_SPS: StatsTable = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

/** Sentinel candidate value meaning "no held item" - not holding a
 * damage-relevant item is always a live possibility alongside the curated
 * shortlist, so it's included as a first-class candidate rather than
 * modeled as an absence. */
export const NO_ITEM = 'None';

export interface LiveCalcObservation {
  moveName: string;
  /** Damage dealt by this move as a percent (0-100) of the defender's max HP - a health-bar read, not exact HP. */
  damagePercent: number;
  /** How many targets this hit actually landed on that turn - only meaningful for spread-capable moves in Doubles (see `isSpreadMove`). */
  targetsHit: 1 | 2;
}

export interface LiveCalcDefenderInput {
  species: string;
  level: number;
}

export interface LiveCalcStatBound {
  min: number;
  max: number;
}

export interface LiveCalcInference {
  /** Physical defensive Stat Points (0-32), narrowed by physical-move observations only. */
  defBound: LiveCalcStatBound;
  /** Special defensive Stat Points (0-32), narrowed by special-move observations only. */
  spdBound: LiveCalcStatBound;
  natureCandidates: NatureName[];
  /** Starts as the defender species' own real ability pool (@smogon/calc gen data). */
  abilityCandidates: string[];
  /** Starts as `NO_ITEM` plus the curated damage-relevant items shortlist. */
  itemCandidates: string[];
  physicalObservationCount: number;
  specialObservationCount: number;
  /** Human-readable notes for observations that were skipped or that
   * contradicted everything narrowed so far - surfaced so a later UI leg can
   * show why an entry didn't move the result, rather than failing silently. */
  contradictions: string[];
}

function dedupeStrings(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))];
}

function defaultInference(gen: Generation, species: string): LiveCalcInference {
  const speciesData = species ? gen.species.get(toID(species)) : undefined;
  return {
    defBound: { min: SP_MIN, max: SP_MAX },
    spdBound: { min: SP_MIN, max: SP_MAX },
    natureCandidates: [...gen.natures].map(n => n.name) as NatureName[],
    abilityCandidates: dedupeStrings(Object.values(speciesData?.abilities ?? {})),
    itemCandidates: [NO_ITEM, ...LIVE_CALC_DEFENSIVE_ITEMS],
    physicalObservationCount: 0,
    specialObservationCount: 0,
    contradictions: [],
  };
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

interface DefenderCandidateSpec {
  nature: NatureName;
  ability: string | undefined;
  item: string | undefined;
}

/**
 * Scans a single unknown axis's one candidate value: for the relevant
 * defensive stat's SP 0-32 (every other stat left at 0, HP at
 * `HP_SP_DEFAULT`), builds a defender with this candidate's
 * nature/ability/item and checks whether `calculate()`'s resulting
 * damage-percent range could plausibly have produced `observedPercent`.
 * Returns the feasible SP sub-range, or null if no SP value works at all
 * (this candidate is infeasible given this one observation).
 */
function feasibleSpRange(
  gen: Generation,
  attackerPokemon: InstanceType<typeof Pokemon>,
  move: InstanceType<typeof Move>,
  field: InstanceType<typeof Field>,
  defenderSpecies: string,
  level: number,
  relevantStat: 'def' | 'spd',
  candidate: DefenderCandidateSpec,
  observedPercent: number,
  isContactMove: boolean,
): LiveCalcStatBound | null {
  const defenderEffect = candidate.ability ? getChampionsAbilityDamageEffect(normalizeNameForAPI(candidate.ability)) : undefined;
  const contactMultiplier = isContactMove && defenderEffect?.contactDamageTakenMultiplier != null ? defenderEffect.contactDamageTakenMultiplier : 1;

  let feasibleMin: number | null = null;
  let feasibleMax: number | null = null;
  for (let sp = SP_MIN; sp <= SP_MAX; sp++) {
    const sps: StatsTable = { ...ZERO_SPS, hp: HP_SP_DEFAULT, [relevantStat]: sp };
    try {
      const defenderPokemon = new Pokemon(gen, resolveCalcSpecies(defenderSpecies), {
        level,
        nature: candidate.nature,
        ability: candidate.ability,
        item: candidate.item,
        evs: spsToEvs(sps),
        ivs: MAX_IVS,
      });
      const maxHP = defenderPokemon.maxHP();
      if (maxHP <= 0) continue;
      const result = calculate(gen, attackerPokemon, defenderPokemon, move, field);
      const range = result.range();
      const lo = ((range[0] / maxHP) * 100) * contactMultiplier;
      const hi = ((range[1] / maxHP) * 100) * contactMultiplier;
      if (observedPercent >= lo - PERCENT_TOLERANCE && observedPercent <= hi + PERCENT_TOLERANCE) {
        feasibleMin = feasibleMin === null ? sp : Math.min(feasibleMin, sp);
        feasibleMax = feasibleMax === null ? sp : Math.max(feasibleMax, sp);
      }
    } catch {
      continue; // an invalid/blocked combo at this SP value just isn't feasible - not a hard failure
    }
  }
  return feasibleMin === null ? null : { min: feasibleMin, max: feasibleMax! };
}

/**
 * Narrows a defender's unknown nature/SP-spread/ability/item from a list of
 * observations against a fully-known attacker. Processes observations in
 * order, intersecting each one's implied bound/candidates into the running
 * result - an observation that contradicts everything narrowed so far (or
 * that isn't usable at all - an unrecognized move, a Status move, a
 * multi-hit move) is recorded in `contradictions` and otherwise ignored
 * rather than corrupting the running result.
 */
export function inferDefenderStats(
  gen: Generation,
  attacker: CalcPokemonState,
  defender: LiveCalcDefenderInput,
  observations: LiveCalcObservation[],
): LiveCalcInference {
  const inference = defaultInference(gen, defender.species);
  if (!attacker.species || !defender.species) return inference;

  let attackerPokemon: InstanceType<typeof Pokemon>;
  try {
    attackerPokemon = buildPokemon(gen, attacker);
  } catch {
    inference.contradictions.push('Attacker Pokémon could not be built - check its species/moves.');
    return inference;
  }

  for (const obs of observations) {
    const moveData = gen.moves.get(toID(obs.moveName));
    if (!moveData || moveData.category === 'Status') {
      inference.contradictions.push(`"${obs.moveName}" isn't a usable damaging move - observation skipped.`);
      continue;
    }
    if (moveData.multihit !== undefined) {
      inference.contradictions.push(`"${obs.moveName}" is a multi-hit move - not modeled in v1, observation skipped.`);
      continue;
    }

    const relevantStat: 'def' | 'spd' = moveData.category === 'Physical' ? 'def' : 'spd';
    const isSpreadMove = ['allAdjacent', 'allAdjacentFoes'].includes(moveData.target ?? '');
    const effectiveGameType: GameType = isSpreadMove && obs.targetsHit === 1 ? 'Singles' : 'Doubles';
    const isContactMove = !!moveData.flags?.contact;

    let move: InstanceType<typeof Move>;
    try {
      move = new Move(gen, obs.moveName, {
        ability: attacker.ability || undefined,
        item: attacker.item || undefined,
        species: attacker.species,
        isCrit: false,
        overrides: getChampionsCalcMoveOverride(obs.moveName),
      });
    } catch {
      inference.contradictions.push(`Could not build move "${obs.moveName}" - observation skipped.`);
      continue;
    }
    const field = new Field({ gameType: effectiveGameType });

    const scan = (candidate: DefenderCandidateSpec) =>
      feasibleSpRange(gen, attackerPokemon, move, field, defender.species, defender.level, relevantStat, candidate, obs.damagePercent, isContactMove);

    const natureResults = inference.natureCandidates.map(nature => ({ value: nature, bound: scan({ nature, ability: undefined, item: undefined }) }));
    const abilityResults = inference.abilityCandidates.map(ability => ({ value: ability, bound: scan({ nature: 'Hardy' as NatureName, ability, item: undefined }) }));
    const itemResults = inference.itemCandidates.map(item => ({
      value: item,
      bound: scan({ nature: 'Hardy' as NatureName, ability: undefined, item: item === NO_ITEM ? undefined : item }),
    }));

    const feasibleNatures = natureResults.filter(r => r.bound !== null);
    const feasibleAbilities = abilityResults.filter(r => r.bound !== null);
    const feasibleItems = itemResults.filter(r => r.bound !== null);

    if (feasibleNatures.length === 0 || feasibleAbilities.length === 0 || feasibleItems.length === 0) {
      inference.contradictions.push(`"${obs.moveName}" (${obs.damagePercent}%) is inconsistent with every narrowed candidate so far - observation ignored.`);
      continue;
    }

    const observationBound = unionBounds([...feasibleNatures, ...feasibleAbilities, ...feasibleItems].map(r => r.bound));
    const prevBound = relevantStat === 'def' ? inference.defBound : inference.spdBound;
    const newBound = observationBound ? intersectBounds(prevBound, observationBound) : null;
    if (!newBound) {
      const statLabel = relevantStat === 'def' ? 'Defense' : 'Sp. Def';
      inference.contradictions.push(`"${obs.moveName}" (${obs.damagePercent}%) contradicts earlier ${statLabel} observations - ignored.`);
      continue;
    }

    if (relevantStat === 'def') {
      inference.defBound = newBound;
      inference.physicalObservationCount++;
    } else {
      inference.spdBound = newBound;
      inference.specialObservationCount++;
    }
    inference.natureCandidates = feasibleNatures.map(r => r.value);
    inference.abilityCandidates = feasibleAbilities.map(r => r.value);
    inference.itemCandidates = feasibleItems.map(r => r.value);
  }

  return inference;
}
