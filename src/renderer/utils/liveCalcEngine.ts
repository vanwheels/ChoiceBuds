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
 * combination would explain the observation. This is the tradeoff Vanny's
 * scope doc calls out as acceptable for a v1 starting point; the eventual
 * hybrid brute-force pass (once the SP/candidate ranges are already
 * narrowed) is what would close this gap entirely.
 * Live Calc Feedback Pass 2 - Leg 2 fixed the part of this approximation that
 * was an outright bug rather than an accepted tradeoff: an observation used
 * to be rejected as a full contradiction (and its accepted axes wiped back
 * to nothing) whenever ANY ONE of the three axes came back empty in
 * isolation, even if another axis independently proved the observation WAS
 * explainable. `inferDefenderStats()`/`inferOpponentOffensiveStats()` now
 * only reject outright when NONE of the three axes found anything on their
 * own, and only narrow an axis's own candidate list using the axes that
 * actually produced a result - the genuinely-unresolvable "combines two
 * non-default axes" case above (nothing works alone) is the only remaining
 * false-contradiction shape.
 *
 * ## Other v1 approximations (all flagged in the scope doc as Leg 1's own
 * design details to settle, or as stated assumptions):
 * - HP SPs are held at a fixed 0 (`ZERO_SPS.hp`, per Vanny's call in Live
 *   Calc Player/Opponent Card Redesign - see that leg's scope doc) rather
 *   than solved for jointly with the relevant defensive stat. This used to
 *   default to the midpoint 16 (`HP_SP_DEFAULT`) as a deliberate v1
 *   approximation rather than blocking on disentangling both unknowns from
 *   one data point - Vanny's later call was to never assume a nonzero HP
 *   default anywhere, so this file's own internal scans now just use 0 like
 *   every other unscanned stat (`ZERO_SPS`), same HP/defense-stat coupling
 *   approximation as before, just without the nonzero assumption.
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
 * - Status condition on the opponent (`LiveCalcDefenderInput.status`, Live
 *   Calc Player/Opponent Card Redesign) IS tracked now, wired the same way
 *   `CalcPokemonPanel`'s own Status field already feeds `buildPokemon()` -
 *   set directly on whichever `Pokemon` object the opponent is built as
 *   (defender in `feasibleSpRange()`/`yourMoveRangeEntry()`, attacker in
 *   `feasibleOffensiveSpRange()`/`theirMoveRangeEntry()`) and left to
 *   `@smogon/calc`'s own bundled mechanics (`applyBurn`, `hasStatus('par')`
 *   doubling, Facade/Hex's own status checks, etc.) to apply - no hand-rolled
 *   status math here. Like the boost stages below, it's one static value
 *   applied identically to every observation, not a per-observation field -
 *   a real opponent's status can change mid-battle (a Toxic Spikes poison
 *   cured by a Pecha Berry, a burn from a Will-O-Wisp mid-fight) and this
 *   won't retroactively re-score earlier observations against the state they
 *   were actually logged under, same simpler-model tradeoff Def/SpD boosts
 *   below already accept.
 * - Def/Sp. Def (and now all five combat stats') stat-stage boosts ARE
 *   tracked (Live Calc Defender Panel Parity - Leg 1 follow-up, generalized
 *   to Atk/SpA/Speed in Live Calc Page Layout & Function Rework - Leg 1) -
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
import type { Generation, GameType, NatureName, StatsTable, StatusName, StatID } from '@smogon/calc/dist/data/interface';
import { getChampionsCalcMoveOverride } from '../config/championsMoveOverrides';
import { getChampionsAbilityDamageEffect } from '../config/championsAbilityDamageEffects';
import { normalizeNameForAPI } from '../services/pokeapiService';
import { LIVE_CALC_DEFENSIVE_ITEMS } from '../config/liveCalcDefensiveItems';
import { LIVE_CALC_OFFENSIVE_ITEMS } from '../config/liveCalcOffensiveItems';
import { getMegaAbility } from '../config/megaAbilities';
import { MAX_IVS, spsToEvs, resolveCalcSpecies } from './championsStats';
import { buildPokemon, boostMultiplier, type CalcPokemonState, type CalcMoveSlot } from './damageCalcEngine';

const SP_MIN = 0;
const SP_MAX = 32;
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
  /** A status condition confirmed in-battle (a burn/paralysis animation, a
   * Toxic counter, etc.) - NOT a locked scan axis like the three above (it
   * doesn't narrow anything), just a directly-known fact wired straight into
   * every `Pokemon` object the opponent is built as, same shape as
   * `CalcPokemonPanel`'s own Status field feeding `buildPokemon()`. See this
   * file's header for the real damage/speed effects this unlocks (Hex,
   * Facade, burn's Attack halving, etc.) via `@smogon/calc`'s own mechanics.
   * Undefined/empty means healthy. */
  status?: StatusName;
}

export interface LiveCalcStatBound {
  min: number;
  max: number;
}

/** One usage-ranked candidate on a scanned axis (Live Calc Usage-Data-Backed
 * Inference - Leg 1): `value` is the same candidate string already present in
 * `natureCandidates`/`abilityCandidates`/`itemCandidates`, `percentage` is its
 * Champions ranked-ladder usage share (0-100) for the opponent's own species
 * - see `utils/liveCalcUsageWeighting.ts` for how `LiveCalcInference`'s own
 * `*UsageCandidates` fields actually get computed. */
export interface LiveCalcUsageRankedCandidate<T extends string = string> {
  value: T;
  percentage: number;
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
  /** Starts as the defender species' own real ability pool (see
   * `defaultInference()`'s `resolveAbilityCandidates()` for where this
   * actually comes from), or the single locked value once
   * `LiveCalcDefenderInput.knownAbility` is set - see that field's own
   * comment. */
  abilityCandidates: string[];
  /** Starts as `NO_ITEM` plus the curated damage-relevant items shortlist. */
  itemCandidates: string[];
  /** Usage-ranked/filtered view of `natureCandidates`/`abilityCandidates`/
   * `itemCandidates` respectively (Live Calc Usage-Data-Backed Inference -
   * Leg 1): computed by `utils/liveCalcUsageWeighting.ts`'s
   * `applyUsageWeighting()` as a post-processing pass layered over this
   * inference the same way `inferDefenderSpeed()`/
   * `inferOpponentOffensiveStats()` already layer over it - never touched by
   * this file's own `inferDefenderStats()`/`inferOpponentOffensiveStats()`,
   * which is why `defaultInference()` below seeds these as an unranked
   * mirror of their own base candidates (percentage 0) rather than leaving
   * them empty, so nothing renders an empty/undefined list before that later
   * pass has actually run. Always a subset (or unranked full copy, when
   * there's no usage data to rank by) of the matching base field above,
   * never a separate universe of values - a UI leg renders these by default
   * and falls back to the base field via its own reveal-all toggle. */
  natureUsageCandidates: LiveCalcUsageRankedCandidate<NatureName>[];
  abilityUsageCandidates: LiveCalcUsageRankedCandidate[];
  itemUsageCandidates: LiveCalcUsageRankedCandidate[];
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

/**
 * Resolves a species' real ability pool for `defaultInference()`'s
 * `abilityCandidates` seed, in priority order:
 * 1. A Mega form's config/megaAbilities.ts override (see that comment below).
 * 2. `realAbilitySlugs` - the app's own PokeAPI-backed pipeline
 *    (`useGameData`'s cached species learnset, threaded in by the caller),
 *    each slug resolved to `@smogon/calc`'s own display-name string via
 *    `gen.abilities.get()` so it stays a valid `Pokemon`/`Move` `ability`
 *    option. Live Calc Feedback Pass 2 - Leg 5: this is the fix for
 *    `@smogon/calc`'s bundled Gen 9 species data being stale/incomplete for
 *    some species (confirmed live for Farigiraf - its bundled entry only
 *    lists Cud Chew, missing the real Armor Tail) - the rest of the app
 *    already treats PokeAPI + config/championsAbilityOverrides.ts (via
 *    useGameData) as the real source of truth for per-species ability
 *    pools, not `@smogon/calc`'s own data, so this brings the engine in
 *    line with that rather than trusting the bundled data.
 * 3. The raw `@smogon/calc` bundled species data, same as before - the
 *    fallback whenever `realAbilitySlugs` isn't available yet (species not
 *    synced, hook not wired, or a test calling this directly with no 3rd
 *    arg) so this function never regresses to an empty candidate list.
 */
function resolveAbilityCandidates(
  gen: Generation,
  species: string,
  speciesData: ReturnType<Generation['species']['get']>,
  realAbilitySlugs: string[] | undefined,
): string[] {
  const megaAbility = species ? getMegaAbility(species.toLowerCase()) : undefined;
  if (megaAbility) return [megaAbility];
  if (realAbilitySlugs && realAbilitySlugs.length > 0) {
    const resolved = dedupeStrings(realAbilitySlugs.map(slug => gen.abilities.get(toID(slug))?.name));
    if (resolved.length > 0) return resolved;
  }
  return dedupeStrings(Object.values(speciesData?.abilities ?? {}));
}

/** Exported for Live Calc Results Display (Leg 3): the UI needs this same
 * "everything still possible" baseline to compute how much an observation
 * has actually narrowed things (e.g. "3 of 11 abilities remain"), not just
 * the post-narrowing candidate lists on their own.
 *
 * `realAbilitySlugs` (Live Calc Feedback Pass 2 - Leg 5) is an optional list
 * of lowercase PokeAPI ability slugs for `species` (e.g. `useGameData`'s
 * cached species learnset's own `abilities` field) - see
 * `resolveAbilityCandidates()`'s own comment for why this takes priority
 * over `@smogon/calc`'s bundled species data. */
export function defaultInference(gen: Generation, species: string, realAbilitySlugs?: string[]): LiveCalcInference {
  const speciesData = species ? gen.species.get(toID(species)) : undefined;
  const natureCandidates = [...gen.natures].map(n => n.name) as NatureName[];
  const abilityCandidates = resolveAbilityCandidates(gen, species, speciesData, realAbilitySlugs);
  // Live Calc Feedback Pass 2 - Leg 2: this single shared axis is scanned
  // from BOTH directions (the defender taking damage AND the opponent
  // dealing it - see `liveCalcOffensiveItems.ts`'s own header for why they
  // must be unioned rather than picking one list per call site.
  const itemCandidates = dedupeStrings([NO_ITEM, ...LIVE_CALC_DEFENSIVE_ITEMS, ...LIVE_CALC_OFFENSIVE_ITEMS]);
  return {
    defBound: { min: SP_MIN, max: SP_MAX },
    spdBound: { min: SP_MIN, max: SP_MAX },
    atkBound: { min: SP_MIN, max: SP_MAX },
    spaBound: { min: SP_MIN, max: SP_MAX },
    speedBound: { min: SP_MIN, max: SP_MAX },
    natureCandidates,
    abilityCandidates,
    itemCandidates,
    // Unranked mirror of the base lists above (percentage 0) - see this
    // field's own comment on LiveCalcInference for why applyUsageWeighting()
    // is what actually ranks these, not this function.
    natureUsageCandidates: natureCandidates.map(value => ({ value, percentage: 0 })),
    abilityUsageCandidates: abilityCandidates.map(value => ({ value, percentage: 0 })),
    itemUsageCandidates: itemCandidates.map(value => ({ value, percentage: 0 })),
    physicalObservationCount: 0,
    specialObservationCount: 0,
    theirPhysicalObservationCount: 0,
    theirSpecialObservationCount: 0,
    speedObservationCount: 0,
    contradictions: [],
  };
}

/** A stat's Base+SP+nature+boost "Total" as a min-max span rather than one
 * fixed number - see `computeDefenderTotalRanges()`'s own header. Structurally
 * identical to `LiveCalcStatBound` (also a plain {min,max}) but kept as its
 * own named type since it measures a displayed stat value, not a Stat Point
 * count - the two are never interchangeable even though they share a shape. */
export interface LiveCalcTotalRange {
  min: number;
  max: number;
}

/** One throwaway-nature name per stat whose `plus`/`minus` is that stat -
 * memoized per `Generation` (there's only ever one, gen 9) since
 * `computeDefenderTotalRanges()` needs one for every non-HP stat on every
 * call. Built once by scanning `gen.natures` rather than hardcoding specific
 * nature names, so it stays correct if `@smogon/calc`'s own nature table ever
 * changes. Any nature that plus/minuses a given stat produces the identical
 * +10%/-10% multiplier, so which specific one is picked doesn't matter. */
let cachedNatureLookup: { gen: Generation; plus: Partial<Record<StatID, NatureName>>; minus: Partial<Record<StatID, NatureName>> } | null = null;

function natureLookup(gen: Generation): { plus: Partial<Record<StatID, NatureName>>; minus: Partial<Record<StatID, NatureName>> } {
  if (cachedNatureLookup?.gen === gen) return cachedNatureLookup;
  const plus: Partial<Record<StatID, NatureName>> = {};
  const minus: Partial<Record<StatID, NatureName>> = {};
  for (const nature of gen.natures) {
    if (nature.plus && nature.plus !== nature.minus && !plus[nature.plus]) plus[nature.plus] = nature.name as NatureName;
    if (nature.minus && nature.minus !== nature.plus && !minus[nature.minus]) minus[nature.minus] = nature.name as NatureName;
  }
  cachedNatureLookup = { gen, plus, minus };
  return cachedNatureLookup;
}

const HARDY: NatureName = 'Hardy' as NatureName;

/**
 * Opponent stat-table Total range per stat (Live Calc Player/Opponent Card
 * Redesign): the Base+SP+nature+stage-boost number a single known Pokémon
 * would show on `CalcStatRows.tsx` (`damageCalcEngine.ts::computeBoostedStats()`),
 * but as a min-max span since the opponent's own nature/SP-spread aren't
 * fully known. Reuses `@smogon/calc`'s real `Pokemon` class to read
 * `rawStats` (same as `computeBoostedStats()` does) rather than
 * hand-deriving the stat formula, so nature's exact floor/round behavior
 * matches everywhere else in the app.
 *
 * HP never narrows (no HP-based observation mechanism, and always assumed 0
 * SP internally - see this file's header) - its row always spans the full
 * SP 0-32 range as a theoretical ceiling for context, and nature never
 * affects HP. Every other stat spans whatever `inference` has currently
 * narrowed its SP bound to, plus - while `LiveCalcDefenderInput.knownNature`
 * is still unset - the -10%/+10% nature extremes too (min endpoint uses the
 * stat's own lowering nature at the bound's min SP, max endpoint uses its
 * boosting nature at the bound's max SP). Once a nature IS locked in, both
 * endpoints use that one real multiplier instead of continuing to span both.
 * A known stage boost is applied to both endpoints uniformly, same
 * "Base + SP + nature + stage boost" formula `computeBoostedStats()` already
 * uses for a single known Pokémon.
 */
export function computeDefenderTotalRanges(
  gen: Generation,
  defender: LiveCalcDefenderInput,
  inference: LiveCalcInference,
): Record<keyof StatsTable, LiveCalcTotalRange> | null {
  if (!defender.species) return null;
  const { plus, minus } = natureLookup(gen);
  const boosts: StatsTable = {
    ...ZERO_SPS,
    atk: defender.atkBoost, def: defender.defBoost, spa: defender.spaBoost, spd: defender.spdBoost, spe: defender.speBoost,
  };

  const boundFor = (key: 'atk' | 'def' | 'spa' | 'spd' | 'spe'): LiveCalcStatBound => {
    if (key === 'atk') return inference.atkBound;
    if (key === 'def') return inference.defBound;
    if (key === 'spa') return inference.spaBound;
    if (key === 'spd') return inference.spdBound;
    return inference.speedBound;
  };

  const rawStatAt = (key: keyof StatsTable, sp: number, nature: NatureName): number | null => {
    try {
      const pokemon = new Pokemon(gen, resolveCalcSpecies(defender.species), {
        level: defender.level,
        nature,
        evs: spsToEvs({ ...ZERO_SPS, [key]: sp }),
        ivs: MAX_IVS,
      });
      return pokemon.rawStats[key];
    } catch {
      return null;
    }
  };

  const result = {} as Record<keyof StatsTable, LiveCalcTotalRange>;

  const hpLo = rawStatAt('hp', SP_MIN, HARDY);
  const hpHi = rawStatAt('hp', SP_MAX, HARDY);
  result.hp = { min: hpLo ?? 0, max: hpHi ?? 0 };

  for (const key of ['atk', 'def', 'spa', 'spd', 'spe'] as const) {
    const bound = boundFor(key);
    const minNature = defender.knownNature ?? minus[key] ?? HARDY;
    const maxNature = defender.knownNature ?? plus[key] ?? HARDY;
    const rawMin = rawStatAt(key, bound.min, minNature) ?? 0;
    const rawMax = rawStatAt(key, bound.max, maxNature) ?? 0;
    const multiplier = boostMultiplier(boosts[key]);
    result[key] = { min: Math.floor(rawMin * multiplier), max: Math.floor(rawMax * multiplier) };
  }

  return result;
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
 * defensive stat's SP 0-32 (every other stat, including HP, left at 0),
 * builds a defender with this candidate's nature/ability/item/status (plus
 * the panel's known, fixed `defenderBoosts` -
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
  status: StatusName | undefined,
): LiveCalcStatBound | null {
  const defenderEffect = candidate.ability ? getChampionsAbilityDamageEffect(normalizeNameForAPI(candidate.ability)) : undefined;
  const contactMultiplier = isContactMove && defenderEffect?.contactDamageTakenMultiplier != null ? defenderEffect.contactDamageTakenMultiplier : 1;

  let feasibleMin: number | null = null;
  let feasibleMax: number | null = null;
  for (let sp = SP_MIN; sp <= SP_MAX; sp++) {
    const sps: StatsTable = { ...ZERO_SPS, [relevantStat]: sp };
    try {
      const defenderPokemon = new Pokemon(gen, resolveCalcSpecies(defenderSpecies), {
        level,
        nature: candidate.nature,
        ability: candidate.ability,
        item: candidate.item,
        status,
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
  realAbilitySlugs?: string[],
): LiveCalcInference {
  const inference = defaultInference(gen, defender.species, realAbilitySlugs);
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
      feasibleSpRange(gen, attackerPokemon, move, field, defender.species, defender.level, relevantStat, candidate, obs.damagePercent, obs.outcome, isContactMove, defenderBoosts, defender.status);

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

    // Live Calc Feedback Pass 2 - Leg 2: this used to require ALL THREE axes
    // to independently explain the observation (holding the other two at
    // neutral) before accepting it at all - but that's stricter than the
    // "per-axis, union across axes" method this file's header actually
    // describes. An axis coming back empty only means "this observation
    // needs help from a non-default value on another axis to explain it",
    // which is exactly the documented axes-scanned-independently
    // approximation, not proof the true value is impossible - the real bug
    // this fixes: e.g. a hit whose damage only makes sense with a specific
    // nature isn't a contradiction just because ability/item ALONE (with
    // nature held at Hardy) can't also reach it. Only reject outright when
    // NONE of the three axes found anything, i.e. even one non-default value
    // at a time can't get there.
    if (feasibleNatures.length === 0 && feasibleAbilities.length === 0 && feasibleItems.length === 0) {
      const statLabel = relevantStat === 'def' ? 'Defense' : 'Sp. Def';
      // A locked ability is applied as every other axis's own fixed default
      // (see the comment above), so if the lock itself is what's breaking
      // every axis, naming it is the actionable diagnosis, not "nature,
      // ability, and item all failed" (misleadingly implying three
      // independent causes).
      if (knownAbility) {
        inference.contradictions.push(
          `"${obs.moveName}" (${obs.damagePercent}%) doesn't fit the locked ability (${knownAbility}) at any ${statLabel} SP value - check the Known Ability lock or this observation.`
        );
      } else {
        inference.contradictions.push(
          `"${obs.moveName}" (${obs.damagePercent}%) doesn't fit any ${statLabel} SP value under the narrowed nature, ability, or item candidates - observation ignored.`
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
    // Only narrow an axis's candidate list using THIS observation's results
    // when that axis alone found at least one feasible candidate - an axis
    // that came back empty didn't prove every one of its candidates
    // impossible (see the comment above), so leave it as the prior
    // observations left it rather than wiping it to nothing.
    if (feasibleNatures.length > 0) inference.natureCandidates = feasibleNatures.map(r => r.value);
    if (feasibleAbilities.length > 0) inference.abilityCandidates = feasibleAbilities.map(r => r.value);
    if (feasibleItems.length > 0) inference.itemCandidates = feasibleItems.map(r => r.value);
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
  status: StatusName | undefined,
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
    const sps: StatsTable = { ...ZERO_SPS, [relevantStat]: sp };
    try {
      const attackerPokemon = new Pokemon(gen, resolveCalcSpecies(opponentSpecies), {
        level,
        nature: candidate.nature,
        ability: candidate.ability,
        item: candidate.item,
        status,
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
      feasibleOffensiveSpRange(gen, knownDefenderPokemon, field, obs.moveName, obs.isCrit, moveOverrides, opponent.species, opponent.level, relevantStat, candidate, obs.damagePercent, obs.outcome, contactMultiplier, opponentBoosts, maxHP, opponent.status);

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

    // Live Calc Feedback Pass 2 - Leg 2: same fix as `inferDefenderStats()` -
    // an axis coming back empty only means this observation needs help from
    // a non-default value on another axis, not that every candidate on that
    // axis is impossible. Only reject outright when NONE of the three axes
    // found anything on their own.
    if (feasibleNatures.length === 0 && feasibleAbilities.length === 0 && feasibleItems.length === 0) {
      const statLabel = relevantStat === 'atk' ? 'Attack' : 'Sp. Atk';
      if (knownAbility) {
        result.contradictions.push(
          `"${obs.moveName}" (${obs.damagePercent}%) doesn't fit the locked ability (${knownAbility}) at any ${statLabel} SP value - check the Known Ability lock or this observation.`
        );
      } else {
        result.contradictions.push(
          `"${obs.moveName}" (${obs.damagePercent}%) doesn't fit any ${statLabel} SP value under the narrowed nature, ability, or item candidates - observation ignored.`
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
    // Only narrow an axis using this observation when it alone found a
    // feasible candidate - see `inferDefenderStats()`'s matching comment.
    if (feasibleNatures.length > 0) result.natureCandidates = feasibleNatures.map(r => r.value);
    if (feasibleAbilities.length > 0) result.abilityCandidates = feasibleAbilities.map(r => r.value);
    if (feasibleItems.length > 0) result.itemCandidates = feasibleItems.map(r => r.value);
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
      const sps: StatsTable = { ...ZERO_SPS, [relevantStat]: sp };
      try {
        const defenderPokemon = new Pokemon(gen, resolveCalcSpecies(defender.species), {
          level: defender.level,
          nature: candidate.nature,
          ability: candidate.ability,
          item: candidate.item,
          status: defender.status,
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
      const sps: StatsTable = { ...ZERO_SPS, [relevantStat]: sp };
      try {
        const opponentPokemon = new Pokemon(gen, resolveCalcSpecies(opponent.species), {
          level: opponent.level,
          nature: candidate.nature,
          ability: candidate.ability,
          item: candidate.item,
          status: opponent.status,
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
