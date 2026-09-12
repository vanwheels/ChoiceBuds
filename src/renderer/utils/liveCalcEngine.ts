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
 * - No multi-hit: multi-hit moves (Bullet Seed etc.) are rejected as unusable
 *   observations outright (recorded as a contradiction/warning) rather than
 *   modeled with their own extra variance. Crit IS modeled (Live Calc
 *   Observation Inputs: Crit + Fainted/Survived - Leg 1) via each
 *   observation's own `isCrit` flag, fed straight into `Move`'s own
 *   constructor option of the same name - `@smogon/calc`'s `calculate()`
 *   already knows how to apply the crit multiplier (and, in later gens,
 *   ignore negative defensive stat stages) once told a hit was a crit; nothing
 *   else in this file's own SP-scanning logic needed to change for it.
 * - Each observation also carries its own `outcome` ('survived' or
 *   'fainted', default 'survived') rather than every reading being treated
 *   as an exact health-bar percent. 'survived' keeps the original exact-ish
 *   comparison (`observedPercent` within `PERCENT_TOLERANCE` of the
 *   candidate's computed range). 'fainted' relaxes this to a lower bound
 *   only - a fainting hit proves the true damage was AT LEAST the reported
 *   percent (the remaining-HP health-bar read right before the KO), never
 *   that it was exactly that percent, since a fainted defender's actual
 *   damage roll could have overkilled well past 0. See `feasibleSpRange`'s
 *   own comment for the exact comparison this becomes.
 * - No field state (weather/terrain/screens/side conditions) - Leg 1's own
 *   TODO.md entry scopes the engine's inputs to attacker + defender
 *   species/level + observations only, nothing field-related. Every scan
 *   uses a bare neutral Field (`gameType` alone, switched to `'Singles'` for
 *   a single-target hit of a spread-capable move so `@smogon/calc` doesn't
 *   wrongly apply its automatic Doubles 0.75x spread modifier - see
 *   `isSpreadMove`/`effectiveGameType` below).
 * - A confirmed ability (Live Calc Known-Ability Lock) is an optional input
 *   (`LiveCalcDefenderInput.knownAbility`) rather than something this file
 *   infers on its own - the UI is the one place a real in-battle reveal
 *   (an Intimidate trigger, an ability-activation message) gets typed in.
 *   Once set, it hard-locks `abilityCandidates` to that single value and
 *   becomes the nature/item axes' own neutral default - see that field's
 *   own doc comment.
 * - Status condition on the defender isn't tracked. Def/Sp. Def stat-stage
 *   boosts ARE tracked (Live Calc Defender Panel Parity - Leg 1 follow-up) -
 *   but as one static value on `LiveCalcDefenderPanel`, applied identically
 *   to every damage observation, unlike Speed's own `defenderSpeedStage`
 *   (`liveCalcSpeedEngine.ts`'s per-turn-order-observation field, since a
 *   defender's boost state can change mid-battle). A deliberate
 *   simpler-model call for this axis, not an oversight - it won't correctly
 *   model a defender whose Def/SpD boost changes partway through the
 *   observation list.
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

/** Whether the reported `damagePercent` should be read as an exact-ish
 * health-bar percent ('survived', the default/original behavior) or as a
 * lower bound only ('fainted' - see this file's header for why a KO reading
 * can't be trusted as an exact percent). */
export type LiveCalcObservationOutcome = 'survived' | 'fainted';

export interface LiveCalcObservation {
  moveName: string;
  /** Damage dealt by this move as a percent (0-100) of the defender's max HP - a health-bar read, not exact HP. */
  damagePercent: number;
  /** How many targets this hit actually landed on that turn - only meaningful for spread-capable moves in Doubles (see `isSpreadMove`). */
  targetsHit: 1 | 2;
  /** Whether this hit was a critical hit - fed straight into `Move`'s own `isCrit` option. */
  isCrit: boolean;
  /** Whether the defender survived or fainted from this hit - see `LiveCalcObservationOutcome`. */
  outcome: LiveCalcObservationOutcome;
}

export interface LiveCalcDefenderInput {
  species: string;
  level: number;
  /** Known Def/Sp. Def stage boosts (-6..+6, default 0) - see this file's
   * header for why this is one static value rather than a per-observation
   * field like Speed's own `defenderSpeedStage`. */
  defBoost: number;
  spdBoost: number;
  /** A defender ability confirmed in-battle (an Intimidate trigger, an
   * ability-activation message, etc.) - Live Calc Known-Ability Lock: pins
   * the ability axis to this one value as a hard filter instead of scanning
   * the species' full ability pool per observation, and becomes the
   * nature/item axes' own neutral default (in place of "no ability") so
   * those scans stay physically consistent with the real, confirmed ability
   * rather than assuming none. Undefined/empty means still unknown - the
   * pre-existing full-pool scan. */
  knownAbility?: string;
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
  /** Speed Stat Points (0-32). Untouched by this file - narrowed by
   * `utils/liveCalcSpeedEngine.ts::inferDefenderSpeed()` (Leg 15), which
   * takes this inference as input and returns an updated copy. Lives on
   * this same interface (rather than a separate result type) so the two
   * engines' outputs merge into one `LiveCalcInference` the UI renders,
   * same as defBound/spdBound already do for their own axis. */
  speedBound: LiveCalcStatBound;
  natureCandidates: NatureName[];
  /** Starts as the defender species' own real ability pool (@smogon/calc gen
   * data), or the single locked value once `LiveCalcDefenderInput.knownAbility`
   * is set - see that field's own comment. */
  abilityCandidates: string[];
  /** Starts as `NO_ITEM` plus the curated damage-relevant items shortlist. */
  itemCandidates: string[];
  physicalObservationCount: number;
  specialObservationCount: number;
  /** Same as physical/specialObservationCount but for turn-order
   * observations - see `speedBound`'s own comment above. */
  speedObservationCount: number;
  /** Human-readable notes for observations that were skipped or that
   * contradicted everything narrowed so far - surfaced so a later UI leg can
   * show why an entry didn't move the result, rather than failing silently. */
  contradictions: string[];
}

function dedupeStrings(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))];
}

/** "a", "a and b", "a, b, and c" - used to list which axis/axes an
 * observation contradicted, for `inferDefenderStats()`'s own diagnostic
 * contradiction message (Live Calc Result Clarity Pass). */
function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/** Exported for Live Calc Results Display (Leg 3): the UI needs this same
 * "everything still possible" baseline to compute how much an observation
 * has actually narrowed things (e.g. "3 of 11 abilities remain"), not just
 * the post-narrowing candidate lists on their own. */
export function defaultInference(gen: Generation, species: string): LiveCalcInference {
  const speciesData = species ? gen.species.get(toID(species)) : undefined;
  return {
    defBound: { min: SP_MIN, max: SP_MAX },
    spdBound: { min: SP_MIN, max: SP_MAX },
    speedBound: { min: SP_MIN, max: SP_MAX },
    natureCandidates: [...gen.natures].map(n => n.name) as NatureName[],
    abilityCandidates: dedupeStrings(Object.values(speciesData?.abilities ?? {})),
    itemCandidates: [NO_ITEM, ...LIVE_CALC_DEFENSIVE_ITEMS],
    physicalObservationCount: 0,
    specialObservationCount: 0,
    speedObservationCount: 0,
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
 * nature/ability/item (plus the panel's known, fixed `defenderBoosts` -
 * `@smogon/calc`'s own `calculate()` applies the relevant stage multiplier
 * internally, same as it would for a real Pokemon instance) and checks
 * whether `calculate()`'s resulting damage-percent range could plausibly
 * have produced `observedPercent` - for outcome 'survived', that means
 * `observedPercent` falling within the candidate's computed range (plus
 * `PERCENT_TOLERANCE` slack on both ends, same as always); for 'fainted', it
 * means only that the candidate's range could reach AT LEAST
 * `observedPercent` (a fainted read is a lower bound, not an exact value -
 * see this file's header), so only the range's upper end needs to clear it.
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
  outcome: LiveCalcObservationOutcome,
  isContactMove: boolean,
  defenderBoosts: StatsTable,
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
        boosts: defenderBoosts,
      });
      const maxHP = defenderPokemon.maxHP();
      if (maxHP <= 0) continue;
      const result = calculate(gen, attackerPokemon, defenderPokemon, move, field);
      const range = result.range();
      const lo = ((range[0] / maxHP) * 100) * contactMultiplier;
      const hi = ((range[1] / maxHP) * 100) * contactMultiplier;
      const feasible = outcome === 'fainted'
        ? hi + PERCENT_TOLERANCE >= observedPercent
        : observedPercent >= lo - PERCENT_TOLERANCE && observedPercent <= hi + PERCENT_TOLERANCE;
      if (feasible) {
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

  const defenderBoosts: StatsTable = { ...ZERO_SPS, def: defender.defBoost, spd: defender.spdBoost };

  const knownAbility = defender.knownAbility || undefined;
  if (knownAbility) inference.abilityCandidates = [knownAbility];

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
        isCrit: obs.isCrit,
        overrides: getChampionsCalcMoveOverride(obs.moveName),
      });
    } catch {
      inference.contradictions.push(`Could not build move "${obs.moveName}" - observation skipped.`);
      continue;
    }
    const field = new Field({ gameType: effectiveGameType });

    const scan = (candidate: DefenderCandidateSpec) =>
      feasibleSpRange(gen, attackerPokemon, move, field, defender.species, defender.level, relevantStat, candidate, obs.damagePercent, obs.outcome, isContactMove, defenderBoosts);

    // Once the ability is known, it's the neutral default the OTHER axes
    // scan against too (in place of "no ability") - see
    // `LiveCalcDefenderInput.knownAbility`'s own comment for why. The
    // ability axis itself collapses to a single locked candidate rather than
    // the species' full pool.
    const natureResults = inference.natureCandidates.map(nature => ({ value: nature, bound: scan({ nature, ability: knownAbility, item: undefined }) }));
    const abilityResults = knownAbility
      ? [{ value: knownAbility, bound: scan({ nature: 'Hardy' as NatureName, ability: knownAbility, item: undefined }) }]
      : inference.abilityCandidates.map(ability => ({ value: ability, bound: scan({ nature: 'Hardy' as NatureName, ability, item: undefined }) }));
    const itemResults = inference.itemCandidates.map(item => ({
      value: item,
      bound: scan({ nature: 'Hardy' as NatureName, ability: knownAbility, item: item === NO_ITEM ? undefined : item }),
    }));

    const feasibleNatures = natureResults.filter(r => r.bound !== null);
    const feasibleAbilities = abilityResults.filter(r => r.bound !== null);
    const feasibleItems = itemResults.filter(r => r.bound !== null);

    if (feasibleNatures.length === 0 || feasibleAbilities.length === 0 || feasibleItems.length === 0) {
      const statLabel = relevantStat === 'def' ? 'Defense' : 'Sp. Def';
      // A locked ability is applied as every other axis's own fixed default
      // (see the comment above), so if IT'S the one with zero feasible
      // options, nature/item usually come back empty too - naming the lock
      // itself is the actionable diagnosis in that case, not "nature, ability,
      // and item all failed" (misleadingly implying three independent causes).
      if (knownAbility && feasibleAbilities.length === 0) {
        inference.contradictions.push(
          `"${obs.moveName}" (${obs.damagePercent}%) doesn't fit the locked ability (${knownAbility}) at any ${statLabel} SP value - check the Known Ability lock or this observation.`
        );
      } else {
        const failingAxes: string[] = [];
        if (feasibleNatures.length === 0) failingAxes.push('nature');
        if (feasibleAbilities.length === 0) failingAxes.push('ability');
        if (feasibleItems.length === 0) failingAxes.push('item');
        inference.contradictions.push(
          `"${obs.moveName}" (${obs.damagePercent}%) doesn't fit any ${statLabel} SP value under the narrowed ${joinWithAnd(failingAxes)} candidates - observation ignored.`
        );
      }
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
