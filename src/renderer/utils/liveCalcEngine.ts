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
 * - Live Calc Page Layout & Function Rework (Leg 1, Bidirectional Inference
 *   Engine): the known-fact-lock pattern above generalizes from ability-only
 *   to all three scanned axes - `LiveCalcDefenderInput.knownItem`/
 *   `knownNature` hard-lock the item/nature axes the same way `knownAbility`
 *   already did, and become the OTHER two axes' own neutral scan default in
 *   place of "no item"/`Hardy` once set (mirroring how a locked ability
 *   already became the nature/item axes' own default). The static boost
 *   input also grows from Def/SpD-only to all five combat stats (`atkBoost`/
 *   `spaBoost`/`speBoost` alongside the existing `defBoost`/`spdBoost`) -
 *   the same opponent Pokémon's own stat stages (a seen Swords Dance/Dragon
 *   Dance) affect damage it DEALS the same as damage it takes, which matters
 *   now that `inferOpponentOffensiveStats()` (below) models that direction
 *   too. That function is the actual mirror of `inferDefenderStats()`: it
 *   infers the opponent's Atk/SpA Stat Points from "their move did X% to
 *   you" observations (`LiveCalcReverseObservation`) against the one
 *   fully-known Pokémon (now playing the DEFENDER role for this direction),
 *   reusing the exact same per-axis heuristic-narrowing shape and the same
 *   running `LiveCalcInference` - it further narrows whatever nature/
 *   ability/item candidates `inferDefenderStats()`/`inferDefenderSpeed()`
 *   already narrowed, same layering relationship Speed's own engine already
 *   has to this one, rather than producing a second, disconnected inference
 *   result. There is still exactly one unknown Pokémon in singles, just
 *   narrowed from two directions of combat evidence now instead of one.
 *   Contact-damage-taken ability effects (Aura Guard etc.) flip sides
 *   accordingly: the forward direction reads the effect off the scanned
 *   defender candidate, this direction reads it off the known Pokémon's own
 *   real (fixed) ability instead, since the known Pokémon is the one taking
 *   the hit in this direction.
 */

import { calculate, Pokemon, Move, Field, toID } from '@smogon/calc';
import type { Generation, GameType, NatureName, StatsTable } from '@smogon/calc/dist/data/interface';
import { getChampionsCalcMoveOverride } from '../config/championsMoveOverrides';
import { getChampionsAbilityDamageEffect } from '../config/championsAbilityDamageEffects';
import { normalizeNameForAPI } from '../services/pokeapiService';
import { LIVE_CALC_DEFENSIVE_ITEMS } from '../config/liveCalcDefensiveItems';
import { getMegaAbility } from '../config/megaAbilities';
import { MAX_IVS, spsToEvs, resolveCalcSpecies } from './championsStats';
import { buildPokemon, type CalcPokemonState, type CalcMoveSlot } from './damageCalcEngine';

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
  /** Known stage boosts (-6..+6, default 0) for all five combat stats - see
   * this file's header for why these are static values rather than a
   * per-observation field like Speed's own `defenderSpeedStage`. */
  defBoost: number;
  spdBoost: number;
  atkBoost: number;
  spaBoost: number;
  speBoost: number;
  /** A defender ability confirmed in-battle (an Intimidate trigger, an
   * ability-activation message, etc.) - Live Calc Known-Ability Lock: pins
   * the ability axis to this one value as a hard filter instead of scanning
   * the species' full ability pool per observation, and becomes the
   * nature/item axes' own neutral default (in place of "no ability") so
   * those scans stay physically consistent with the real, confirmed ability
   * rather than assuming none. Undefined/empty means still unknown - the
   * pre-existing full-pool scan. */
  knownAbility?: string;
  /** Same lock shape as `knownAbility`, for a held item confirmed in-battle
   * (a Sitrus Berry heal, a Choice-item lock message, etc.) - pins the item
   * axis and becomes the ability/nature axes' own neutral default (in place
   * of "no item"). Undefined/empty means still unknown. */
  knownItem?: string;
  /** Same lock shape as `knownAbility`, for a nature confirmed via revealed
   * stat experience or an explicit read - pins the nature axis and becomes
   * the ability/item axes' own neutral default (in place of `Hardy`).
   * Undefined/empty means still unknown. */
  knownNature?: NatureName;
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
  /** Physical offensive Stat Points (0-32), narrowed by `inferOpponentOffensiveStats()`
   * from "their move -> you" physical-move observations only. Untouched by
   * `inferDefenderStats()` itself, same layering relationship `speedBound` has to it. */
  atkBound: LiveCalcStatBound;
  /** Special offensive Stat Points (0-32), same as `atkBound` but for special-move observations. */
  spaBound: LiveCalcStatBound;
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
  /** Same as physical/specialObservationCount but for the mirror "their move
   * -> you" direction's own observations (see `atkBound`/`spaBound`'s own
   * comments above) - kept as separate counts rather than merged into
   * physical/specialObservationCount since those two only ever counted the
   * original "your move -> them" direction and existing UI already reads
   * them that way. */
  theirPhysicalObservationCount: number;
  theirSpecialObservationCount: number;
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
  // Live Calc Feedback Pass 2 - Leg 1: a Mega form's guaranteed ability comes
  // from config/megaAbilities.ts, not @smogon/calc's own bundled species data
  // directly - that data is stale placeholder for a few Champions-invented
  // Mega forms (most visibly the 3 Reg M-C "Mega Z" forms, whose raw
  // `abilities.0` just duplicates the species' ORDINARY Mega ability rather
  // than the real, distinct Mega-Z one) - see that config's own header for
  // the full provenance. Falls back to the raw species data for any
  // non-Mega species (or a Mega form with no override needed).
  const megaAbility = species ? getMegaAbility(species.toLowerCase()) : undefined;
  return {
    defBound: { min: SP_MIN, max: SP_MAX },
    spdBound: { min: SP_MIN, max: SP_MAX },
    atkBound: { min: SP_MIN, max: SP_MAX },
    spaBound: { min: SP_MIN, max: SP_MAX },
    speedBound: { min: SP_MIN, max: SP_MAX },
    natureCandidates: [...gen.natures].map(n => n.name) as NatureName[],
    abilityCandidates: megaAbility ? [megaAbility] : dedupeStrings(Object.values(speciesData?.abilities ?? {})),
    itemCandidates: [NO_ITEM, ...LIVE_CALC_DEFENSIVE_ITEMS],
    physicalObservationCount: 0,
    specialObservationCount: 0,
    theirPhysicalObservationCount: 0,
    theirSpecialObservationCount: 0,
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

  // Full five-stat boost table even though only def/spd are ever read while
  // this Pokémon plays the defending role here - atk/spa/spe are inert on
  // this side of calculate() but it's the same physical Pokémon's state, so
  // one shared table (also passed to `inferOpponentOffensiveStats()` for the
  // mirror direction, where atk/spa DO matter) beats keeping two partial ones in sync.
  const defenderBoosts: StatsTable = {
    ...ZERO_SPS,
    atk: defender.atkBoost,
    def: defender.defBoost,
    spa: defender.spaBoost,
    spd: defender.spdBoost,
    spe: defender.speBoost,
  };

  const knownAbility = defender.knownAbility || undefined;
  const knownItem = defender.knownItem || undefined;
  const knownNature = defender.knownNature || undefined;
  if (knownAbility) inference.abilityCandidates = [knownAbility];
  if (knownItem) inference.itemCandidates = [knownItem];
  if (knownNature) inference.natureCandidates = [knownNature];
  const defaultNature: NatureName = knownNature ?? ('Hardy' as NatureName);

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

    // Once ability/item/nature are known, each becomes the neutral default
    // the OTHER two axes scan against too (in place of "no ability"/"no
    // item"/`Hardy`) - see `LiveCalcDefenderInput.knownAbility`'s own comment
    // for why. A locked axis itself collapses to a single candidate (already
    // done above) rather than its full pool/species pool.
    const natureResults = inference.natureCandidates.map(nature => ({ value: nature, bound: scan({ nature, ability: knownAbility, item: knownItem }) }));
    const abilityResults = knownAbility
      ? [{ value: knownAbility, bound: scan({ nature: defaultNature, ability: knownAbility, item: knownItem }) }]
      : inference.abilityCandidates.map(ability => ({ value: ability, bound: scan({ nature: defaultNature, ability, item: knownItem }) }));
    const itemResults = inference.itemCandidates.map(item => ({
      value: item,
      bound: scan({ nature: defaultNature, ability: knownAbility, item: item === NO_ITEM ? undefined : item }),
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

/** Observation for the mirror "their move -> you" direction (Live Calc Page
 * Layout & Function Rework - Leg 1): structurally identical to
 * `LiveCalcObservation` (moveName/damagePercent/targetsHit/isCrit/outcome)
 * but consumed by `inferOpponentOffensiveStats()` instead, where the
 * opponent is the one attacking and `damagePercent` is a percent of the
 * KNOWN Pokémon's own max HP, not the opponent's. Kept as its own named type
 * rather than a plain alias so call sites stay unambiguous about which
 * direction an observation belongs to. */
export interface LiveCalcReverseObservation {
  moveName: string;
  damagePercent: number;
  targetsHit: 1 | 2;
  isCrit: boolean;
  outcome: LiveCalcObservationOutcome;
}

/**
 * Mirror of `feasibleSpRange()` for the reverse direction: the unknown
 * opponent plays ATTACKER here (its candidate nature/ability/item and the
 * scanned Atk/SpA SP value), the known Pokémon (`defenderPokemon`, already
 * built once by the caller - its stats don't change per candidate/SP) plays
 * DEFENDER. `contactMultiplier` is passed in already resolved from the known
 * Pokémon's own real ability (see `inferOpponentOffensiveStats()`), unlike
 * `feasibleSpRange()` which resolves it per-candidate since ITS defender is
 * the unknown side. The Move itself still depends on the candidate's
 * ability/item (an attacker-side move-power modifier like Technician), so
 * it's rebuilt once per candidate here rather than once per observation.
 */
function feasibleOffensiveSpRange(
  gen: Generation,
  defenderPokemon: InstanceType<typeof Pokemon>,
  field: InstanceType<typeof Field>,
  moveName: string,
  isCrit: boolean,
  moveOverrides: ReturnType<typeof getChampionsCalcMoveOverride>,
  opponentSpecies: string,
  level: number,
  relevantStat: 'atk' | 'spa',
  candidate: DefenderCandidateSpec,
  observedPercent: number,
  outcome: LiveCalcObservationOutcome,
  contactMultiplier: number,
  opponentBoosts: StatsTable,
  maxHP: number,
): LiveCalcStatBound | null {
  let move: InstanceType<typeof Move>;
  try {
    move = new Move(gen, moveName, {
      ability: candidate.ability,
      item: candidate.item,
      species: opponentSpecies,
      isCrit,
      overrides: moveOverrides,
    });
  } catch {
    return null;
  }

  let feasibleMin: number | null = null;
  let feasibleMax: number | null = null;
  for (let sp = SP_MIN; sp <= SP_MAX; sp++) {
    const sps: StatsTable = { ...ZERO_SPS, hp: HP_SP_DEFAULT, [relevantStat]: sp };
    try {
      const attackerPokemon = new Pokemon(gen, resolveCalcSpecies(opponentSpecies), {
        level,
        nature: candidate.nature,
        ability: candidate.ability,
        item: candidate.item,
        evs: spsToEvs(sps),
        ivs: MAX_IVS,
        boosts: opponentBoosts,
      });
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
 * Narrows the opponent's unknown Atk/SpA Stat Points (and further trims
 * whatever nature/ability/item candidates are already running) from a list
 * of "their move -> you" observations against the one fully-known Pokémon -
 * the actual mirror of `inferDefenderStats()`, same file-header design this
 * shares with `liveCalcSpeedEngine.ts`'s own Speed pass: takes the inference
 * already produced upstream and returns an updated copy, touching only
 * atkBound/spaBound/theirPhysicalObservationCount/
 * theirSpecialObservationCount plus whatever narrowing falls out of the
 * shared nature/ability/item axes - never defBound/spdBound/speedBound,
 * which belong to the other two passes. Locks (`knownAbility`/`knownItem`/
 * `knownNature`) are re-applied defensively at the top rather than assumed
 * already-collapsed by an earlier pass, so this function stays correct on
 * its own (e.g. in isolation in a test) regardless of call order.
 */
export function inferOpponentOffensiveStats(
  gen: Generation,
  knownPokemon: CalcPokemonState,
  opponent: LiveCalcDefenderInput,
  inference: LiveCalcInference,
  observations: LiveCalcReverseObservation[],
): LiveCalcInference {
  const result: LiveCalcInference = { ...inference, contradictions: [...inference.contradictions] };
  if (!knownPokemon.species || !opponent.species) return result;

  let knownDefenderPokemon: InstanceType<typeof Pokemon>;
  try {
    knownDefenderPokemon = buildPokemon(gen, knownPokemon);
  } catch {
    result.contradictions.push('Your Pokémon could not be built - check its species/stats.');
    return result;
  }
  const maxHP = knownDefenderPokemon.maxHP();
  if (maxHP <= 0) return result;

  const opponentBoosts: StatsTable = {
    ...ZERO_SPS,
    atk: opponent.atkBoost,
    def: opponent.defBoost,
    spa: opponent.spaBoost,
    spd: opponent.spdBoost,
    spe: opponent.speBoost,
  };

  const knownAbility = opponent.knownAbility || undefined;
  const knownItem = opponent.knownItem || undefined;
  const knownNature = opponent.knownNature || undefined;
  if (knownAbility) result.abilityCandidates = [knownAbility];
  if (knownItem) result.itemCandidates = [knownItem];
  if (knownNature) result.natureCandidates = [knownNature];
  const defaultNature: NatureName = knownNature ?? ('Hardy' as NatureName);

  // Unlike `feasibleSpRange()` (where the scanned candidate plays defender),
  // the known Pokémon is the one taking the hit in this direction, so its
  // OWN real, fixed ability is what a Champions-invented contact-damage
  // effect (Aura Guard etc.) reads off - resolved once here, not per candidate.
  const knownAbilityEffect = knownPokemon.ability ? getChampionsAbilityDamageEffect(normalizeNameForAPI(knownPokemon.ability)) : undefined;

  for (const obs of observations) {
    const moveData = gen.moves.get(toID(obs.moveName));
    if (!moveData || moveData.category === 'Status') {
      result.contradictions.push(`"${obs.moveName}" isn't a usable damaging move - observation skipped.`);
      continue;
    }
    if (moveData.multihit !== undefined) {
      result.contradictions.push(`"${obs.moveName}" is a multi-hit move - not modeled in v1, observation skipped.`);
      continue;
    }

    const relevantStat: 'atk' | 'spa' = moveData.category === 'Physical' ? 'atk' : 'spa';
    const isSpreadMove = ['allAdjacent', 'allAdjacentFoes'].includes(moveData.target ?? '');
    const effectiveGameType: GameType = isSpreadMove && obs.targetsHit === 1 ? 'Singles' : 'Doubles';
    const isContactMove = !!moveData.flags?.contact;
    const contactMultiplier = isContactMove && knownAbilityEffect?.contactDamageTakenMultiplier != null ? knownAbilityEffect.contactDamageTakenMultiplier : 1;
    const moveOverrides = getChampionsCalcMoveOverride(obs.moveName);

    try {
      // Validates the move name/species combo builds at all before scanning any candidate.
      new Move(gen, obs.moveName, { species: opponent.species, isCrit: obs.isCrit, overrides: moveOverrides });
    } catch {
      result.contradictions.push(`Could not build move "${obs.moveName}" - observation skipped.`);
      continue;
    }
    const field = new Field({ gameType: effectiveGameType });

    const scan = (candidate: DefenderCandidateSpec) =>
      feasibleOffensiveSpRange(gen, knownDefenderPokemon, field, obs.moveName, obs.isCrit, moveOverrides, opponent.species, opponent.level, relevantStat, candidate, obs.damagePercent, obs.outcome, contactMultiplier, opponentBoosts, maxHP);

    const natureResults = result.natureCandidates.map(nature => ({ value: nature, bound: scan({ nature, ability: knownAbility, item: knownItem }) }));
    const abilityResults = knownAbility
      ? [{ value: knownAbility, bound: scan({ nature: defaultNature, ability: knownAbility, item: knownItem }) }]
      : result.abilityCandidates.map(ability => ({ value: ability, bound: scan({ nature: defaultNature, ability, item: knownItem }) }));
    const itemResults = result.itemCandidates.map(item => ({
      value: item,
      bound: scan({ nature: defaultNature, ability: knownAbility, item: item === NO_ITEM ? undefined : item }),
    }));

    const feasibleNatures = natureResults.filter(r => r.bound !== null);
    const feasibleAbilities = abilityResults.filter(r => r.bound !== null);
    const feasibleItems = itemResults.filter(r => r.bound !== null);

    if (feasibleNatures.length === 0 || feasibleAbilities.length === 0 || feasibleItems.length === 0) {
      const statLabel = relevantStat === 'atk' ? 'Attack' : 'Sp. Atk';
      if (knownAbility && feasibleAbilities.length === 0) {
        result.contradictions.push(
          `"${obs.moveName}" (${obs.damagePercent}%) doesn't fit the locked ability (${knownAbility}) at any ${statLabel} SP value - check the Known Ability lock or this observation.`
        );
      } else {
        const failingAxes: string[] = [];
        if (feasibleNatures.length === 0) failingAxes.push('nature');
        if (feasibleAbilities.length === 0) failingAxes.push('ability');
        if (feasibleItems.length === 0) failingAxes.push('item');
        result.contradictions.push(
          `"${obs.moveName}" (${obs.damagePercent}%) doesn't fit any ${statLabel} SP value under the narrowed ${joinWithAnd(failingAxes)} candidates - observation ignored.`
        );
      }
      continue;
    }

    const observationBound = unionBounds([...feasibleNatures, ...feasibleAbilities, ...feasibleItems].map(r => r.bound));
    const prevBound = relevantStat === 'atk' ? result.atkBound : result.spaBound;
    const newBound = observationBound ? intersectBounds(prevBound, observationBound) : null;
    if (!newBound) {
      const statLabel = relevantStat === 'atk' ? 'Attack' : 'Sp. Atk';
      result.contradictions.push(`"${obs.moveName}" (${obs.damagePercent}%) contradicts earlier ${statLabel} observations - ignored.`);
      continue;
    }

    if (relevantStat === 'atk') {
      result.atkBound = newBound;
      result.theirPhysicalObservationCount++;
    } else {
      result.spaBound = newBound;
      result.theirSpecialObservationCount++;
    }
    result.natureCandidates = feasibleNatures.map(r => r.value);
    result.abilityCandidates = feasibleAbilities.map(r => r.value);
    result.itemCandidates = feasibleItems.map(r => r.value);
  }

  return result;
}

/** One move-grid row's result (Live Calc Page Layout & Function Rework - Leg
 * 3): a min-max % span across every SP/nature/ability/item combination the
 * CURRENT `LiveCalcInference` still considers possible, rather than
 * `CalcMoveResultEntry`'s single fixed-defender roll-variance range - there's
 * no one concrete opponent build to run `result.desc()`/`result.kochance()`
 * against, so this only carries what the grid actually renders (a formatted
 * percent span, or an error/skip reason) instead of reusing that richer type. */
export interface LiveCalcMoveRangeEntry {
  moveName: string;
  percent: string | null;
  errorMessage: string | null;
}

function emptyRangeEntry(moveName: string): LiveCalcMoveRangeEntry {
  return { moveName, percent: null, errorMessage: null };
}

function rangeErrorEntry(moveName: string, message: string): LiveCalcMoveRangeEntry {
  return { moveName, percent: null, errorMessage: message };
}

/**
 * Shared move-level rejection checks for both range functions below - same
 * "not a usable move" reasons `inferDefenderStats()`/
 * `inferOpponentOffensiveStats()` already reject observations for (a Status
 * move, an unrecognized name, a multi-hit move - still not modeled in v1, see
 * this file's header), surfaced as a grid row instead of a contradiction note
 * since there's no observation here to skip.
 */
function rejectUnusableMove(gen: Generation, moveName: string): LiveCalcMoveRangeEntry | null {
  const moveData = gen.moves.get(toID(moveName));
  if (!moveData || moveData.category === 'Status') {
    return rangeErrorEntry(moveName, `"${moveName}" isn't a usable damaging move.`);
  }
  if (moveData.multihit !== undefined) {
    return rangeErrorEntry(moveName, `"${moveName}" is a multi-hit move - not modeled in v1.`);
  }
  return null;
}

/**
 * Every combination this grid scans is built from `inference`'s own
 * already-narrowed nature/ability/item candidates, one axis varied at a time
 * against the OTHER two axes' shared neutral/known default - same per-axis
 * shape (and same reasoning for why: no full joint cross-product) as
 * `feasibleSpRange()`/`feasibleOffensiveSpRange()` above, just producing a
 * candidate list to fold a range over instead of one candidate to test
 * feasibility for.
 */
function buildCandidateSets(
  inference: LiveCalcInference,
  knownAbility: string | undefined,
  knownItem: string | undefined,
  knownNature: NatureName | undefined,
): DefenderCandidateSpec[] {
  const defaultNature: NatureName = knownNature ?? ('Hardy' as NatureName);
  return [
    ...inference.natureCandidates.map(nature => ({ nature, ability: knownAbility, item: knownItem })),
    ...inference.abilityCandidates.map(ability => ({ nature: defaultNature, ability, item: knownItem })),
    ...inference.itemCandidates.map(item => ({ nature: defaultNature, ability: knownAbility, item: item === NO_ITEM ? undefined : item })),
  ];
}

/** Both SP-bound endpoints, deduped to one entry when the bound is already
 * fully narrowed to a single value - the SP-to-stat mapping is monotonic, so
 * (unlike `feasibleSpRange()`'s exhaustive per-SP scan, which has to find
 * which values satisfy one specific observed reading) the endpoints alone
 * are enough to find the overall min/max % an axis can produce across the
 * whole bound. */
function spBoundEndpoints(bound: LiveCalcStatBound): number[] {
  return bound.min === bound.max ? [bound.min] : [bound.min, bound.max];
}

/**
 * `computeYourMoveRanges()`'s per-move-slot work: builds the Move once (the
 * attacker side is fully known, so unlike the reverse direction below the
 * Move doesn't depend on the scanned candidate) and folds every candidate x
 * SP-endpoint combination's resulting damage-percent range into one overall
 * span.
 */
function yourMoveRangeEntry(
  gen: Generation,
  attackerPokemon: InstanceType<typeof Pokemon>,
  attacker: CalcPokemonState,
  defender: LiveCalcDefenderInput,
  inference: LiveCalcInference,
  defenderBoosts: StatsTable,
  slot: CalcMoveSlot,
): LiveCalcMoveRangeEntry {
  if (!slot.name) return emptyRangeEntry('');
  const rejected = rejectUnusableMove(gen, slot.name);
  if (rejected) return rejected;
  const moveData = gen.moves.get(toID(slot.name))!;

  const relevantStat: 'def' | 'spd' = moveData.category === 'Physical' ? 'def' : 'spd';
  const bound = relevantStat === 'def' ? inference.defBound : inference.spdBound;
  const isContactMove = !!moveData.flags?.contact;
  // Assumes a 2-target hit same as `defaultObservation()`'s own
  // `targetsHit: 2` default - the grid has no per-move targets-hit input of
  // its own the way an observation row does.
  const field = new Field({ gameType: 'Doubles' });

  let move: InstanceType<typeof Move>;
  try {
    move = new Move(gen, slot.name, {
      ability: attacker.ability || undefined,
      item: attacker.item || undefined,
      species: attacker.species,
      isCrit: slot.isCrit,
      overrides: getChampionsCalcMoveOverride(slot.name),
    });
  } catch {
    return rangeErrorEntry(slot.name, `Could not build move "${slot.name}".`);
  }

  const candidateSets = buildCandidateSets(inference, defender.knownAbility || undefined, defender.knownItem || undefined, defender.knownNature || undefined);
  const spSteps = spBoundEndpoints(bound);

  let globalMin: number | null = null;
  let globalMax: number | null = null;
  for (const candidate of candidateSets) {
    const defenderEffect = candidate.ability ? getChampionsAbilityDamageEffect(normalizeNameForAPI(candidate.ability)) : undefined;
    const contactMultiplier = isContactMove && defenderEffect?.contactDamageTakenMultiplier != null ? defenderEffect.contactDamageTakenMultiplier : 1;
    for (const sp of spSteps) {
      const sps: StatsTable = { ...ZERO_SPS, hp: HP_SP_DEFAULT, [relevantStat]: sp };
      try {
        const defenderPokemon = new Pokemon(gen, resolveCalcSpecies(defender.species), {
          level: defender.level,
          nature: candidate.nature,
          ability: candidate.ability,
          item: candidate.item,
          evs: spsToEvs(sps),
          ivs: MAX_IVS,
          boosts: defenderBoosts,
        });
        const maxHP = defenderPokemon.maxHP();
        if (maxHP <= 0) continue;
        const range = calculate(gen, attackerPokemon, defenderPokemon, move, field).range();
        const lo = ((range[0] / maxHP) * 100) * contactMultiplier;
        const hi = ((range[1] / maxHP) * 100) * contactMultiplier;
        globalMin = globalMin === null ? lo : Math.min(globalMin, lo);
        globalMax = globalMax === null ? hi : Math.max(globalMax, hi);
      } catch {
        continue; // an invalid/blocked combo at this SP value just isn't feasible - not a hard failure
      }
    }
  }

  if (globalMin === null || globalMax === null) {
    return rangeErrorEntry(slot.name, `"${slot.name}" has no feasible damage range for the currently narrowed candidates.`);
  }
  return { moveName: slot.name, percent: `${globalMin.toFixed(1)} - ${globalMax.toFixed(1)}%`, errorMessage: null };
}

/**
 * The "Yours -> Them" move grid's live results (Live Calc Page Layout &
 * Function Rework - Leg 3): one `LiveCalcMoveRangeEntry` per attacker move
 * slot, each a min-max % span over however far `inference` has (or hasn't
 * yet) narrowed the defender's Def/SpD SP and nature/ability/item candidates
 * - the actual mirror of `CalcMoveGrid`'s fixed-defender results for a
 * still-unknown opponent. `attacker.moves` IS the same 4-slot array this
 * grid edits directly (unlike the observation lists' own free-typed move
 * name per entry) - see `useLiveCalc.ts`'s `setAttackerMove`.
 */
export function computeYourMoveRanges(
  gen: Generation,
  attacker: CalcPokemonState,
  defender: LiveCalcDefenderInput,
  inference: LiveCalcInference,
  moves: CalcMoveSlot[],
): LiveCalcMoveRangeEntry[] {
  if (!attacker.species || !defender.species) return moves.map(m => emptyRangeEntry(m.name));

  let attackerPokemon: InstanceType<typeof Pokemon>;
  try {
    attackerPokemon = buildPokemon(gen, attacker);
  } catch {
    return moves.map(m => rangeErrorEntry(m.name, 'Attacker Pokémon could not be built - check its species/moves.'));
  }

  const defenderBoosts: StatsTable = {
    ...ZERO_SPS,
    atk: defender.atkBoost,
    def: defender.defBoost,
    spa: defender.spaBoost,
    spd: defender.spdBoost,
    spe: defender.speBoost,
  };

  return moves.map(slot => yourMoveRangeEntry(gen, attackerPokemon, attacker, defender, inference, defenderBoosts, slot));
}

/**
 * `computeTheirMoveRanges()`'s per-move-slot work - mirror of
 * `yourMoveRangeEntry()` above, same relationship `feasibleOffensiveSpRange()`
 * has to `feasibleSpRange()`: the unknown opponent plays ATTACKER here (its
 * candidate nature/ability/item and the scanned Atk/SpA SP endpoint), the
 * known Pokémon (already built once by the caller) plays DEFENDER, so the
 * Move itself depends on the scanned candidate's ability/item and gets
 * rebuilt per candidate rather than once per slot.
 */
function theirMoveRangeEntry(
  gen: Generation,
  knownDefenderPokemon: InstanceType<typeof Pokemon>,
  maxHP: number,
  opponent: LiveCalcDefenderInput,
  inference: LiveCalcInference,
  opponentBoosts: StatsTable,
  contactMultiplierFor: (isContactMove: boolean) => number,
  slot: CalcMoveSlot,
): LiveCalcMoveRangeEntry {
  if (!slot.name) return emptyRangeEntry('');
  const rejected = rejectUnusableMove(gen, slot.name);
  if (rejected) return rejected;
  const moveData = gen.moves.get(toID(slot.name))!;

  const relevantStat: 'atk' | 'spa' = moveData.category === 'Physical' ? 'atk' : 'spa';
  const bound = relevantStat === 'atk' ? inference.atkBound : inference.spaBound;
  const contactMultiplier = contactMultiplierFor(!!moveData.flags?.contact);
  const moveOverrides = getChampionsCalcMoveOverride(slot.name);
  // Same 2-target-hit default assumption as `yourMoveRangeEntry()` above.
  const field = new Field({ gameType: 'Doubles' });

  const candidateSets = buildCandidateSets(inference, opponent.knownAbility || undefined, opponent.knownItem || undefined, opponent.knownNature || undefined);
  const spSteps = spBoundEndpoints(bound);

  let globalMin: number | null = null;
  let globalMax: number | null = null;
  for (const candidate of candidateSets) {
    let move: InstanceType<typeof Move>;
    try {
      move = new Move(gen, slot.name, {
        ability: candidate.ability,
        item: candidate.item,
        species: opponent.species,
        isCrit: slot.isCrit,
        overrides: moveOverrides,
      });
    } catch {
      continue;
    }
    for (const sp of spSteps) {
      const sps: StatsTable = { ...ZERO_SPS, hp: HP_SP_DEFAULT, [relevantStat]: sp };
      try {
        const opponentPokemon = new Pokemon(gen, resolveCalcSpecies(opponent.species), {
          level: opponent.level,
          nature: candidate.nature,
          ability: candidate.ability,
          item: candidate.item,
          evs: spsToEvs(sps),
          ivs: MAX_IVS,
          boosts: opponentBoosts,
        });
        const range = calculate(gen, opponentPokemon, knownDefenderPokemon, move, field).range();
        const lo = ((range[0] / maxHP) * 100) * contactMultiplier;
        const hi = ((range[1] / maxHP) * 100) * contactMultiplier;
        globalMin = globalMin === null ? lo : Math.min(globalMin, lo);
        globalMax = globalMax === null ? hi : Math.max(globalMax, hi);
      } catch {
        continue; // an invalid/blocked combo at this SP value just isn't feasible - not a hard failure
      }
    }
  }

  if (globalMin === null || globalMax === null) {
    return rangeErrorEntry(slot.name, `"${slot.name}" has no feasible damage range for the currently narrowed candidates.`);
  }
  return { moveName: slot.name, percent: `${globalMin.toFixed(1)} - ${globalMax.toFixed(1)}%`, errorMessage: null };
}

/**
 * The "Theirs -> You" move grid's live results (Live Calc Page Layout &
 * Function Rework - Leg 3): the actual mirror of `computeYourMoveRanges()`,
 * one `LiveCalcMoveRangeEntry` per opponent move slot (`useLiveCalc.ts`'s own
 * `defenderMoves`/`setDefenderMove` - a new, separate 4-slot array from the
 * reverse observation list's free-typed per-entry move name, since this grid
 * needs fixed slots to render live rather than a running log) against the
 * one known Pokémon, spanning however far `inference` has narrowed the
 * opponent's Atk/SpA SP and nature/ability/item candidates.
 */
export function computeTheirMoveRanges(
  gen: Generation,
  knownPokemon: CalcPokemonState,
  opponent: LiveCalcDefenderInput,
  inference: LiveCalcInference,
  moves: CalcMoveSlot[],
): LiveCalcMoveRangeEntry[] {
  if (!knownPokemon.species || !opponent.species) return moves.map(m => emptyRangeEntry(m.name));

  let knownDefenderPokemon: InstanceType<typeof Pokemon>;
  try {
    knownDefenderPokemon = buildPokemon(gen, knownPokemon);
  } catch {
    return moves.map(m => rangeErrorEntry(m.name, 'Your Pokémon could not be built - check its species/stats.'));
  }
  const maxHP = knownDefenderPokemon.maxHP();
  if (maxHP <= 0) return moves.map(m => rangeErrorEntry(m.name, "Your Pokémon's max HP couldn't be computed."));

  const opponentBoosts: StatsTable = {
    ...ZERO_SPS,
    atk: opponent.atkBoost,
    def: opponent.defBoost,
    spa: opponent.spaBoost,
    spd: opponent.spdBoost,
    spe: opponent.speBoost,
  };
  // Same fixed-real-ability read as `inferOpponentOffensiveStats()` above -
  // the known Pokémon is the one taking the hit in this direction.
  const knownAbilityEffect = knownPokemon.ability ? getChampionsAbilityDamageEffect(normalizeNameForAPI(knownPokemon.ability)) : undefined;
  const contactMultiplierFor = (isContactMove: boolean) =>
    isContactMove && knownAbilityEffect?.contactDamageTakenMultiplier != null ? knownAbilityEffect.contactDamageTakenMultiplier : 1;

  return moves.map(slot => theirMoveRangeEntry(gen, knownDefenderPokemon, maxHP, opponent, inference, opponentBoosts, contactMultiplierFor, slot));
}
