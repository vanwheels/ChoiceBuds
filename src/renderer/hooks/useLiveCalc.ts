/**
 * useLiveCalc Hook - Live Calc Tab Scratchpad State
 * Transient, non-persisted state for the "Live Calc" tab (Live Calc Tab
 * Shell - Leg 2, see TODO.md) - same in-memory-only pattern as
 * useDamageCalc, lost on tab switch/app restart per the milestone's own
 * scope doc (docs/investigations/live-calc-stat-inference-scope.md).
 *
 * Owns the attacker (a fully-known `CalcPokemonState`, same shape the
 * existing Calc tab's `CalcPokemonPanel` already edits - nothing new needed
 * there), the defender's known species+level+`defenderKnownAbility` (plus
 * derived-only `defenderFormes`/`defenderBaseStats`/`defenderAbilityOptions`,
 * same `getFormeFamily`/base-stats-lookup pattern as the attacker's own
 * `attackerFormes`/`attackerBaseStats` below - `defenderKnownAbility` is the
 * one piece of defender state that isn't purely "what the tab is solving
 * for": Live Calc Known-Ability Lock, an opt-in hard override for the
 * ability axis once it's confirmed in-battle rather than left for the engine
 * to scan/narrow - generalized to `defenderKnownItem`/`defenderKnownNature`
 * (Live Calc Page Layout & Function Rework - Leg 1), same opt-in-lock shape.
 * That leg also adds the 3 previously-untracked boost stages
 * (`defenderAtkBoost`/`defenderSpaBoost`/`defenderSpeBoost`, alongside the
 * existing Def/SpD ones) and a second, mirrored add/remove observation list
 * (`reverseObservations`, for "their move -> you") alongside the existing
 * damage-percent and turn-order lists. Every change re-derives
 * `utils/liveCalcEngine.ts`'s `inferDefenderStats()` inference, layers
 * `utils/liveCalcSpeedEngine.ts`'s `inferDefenderSpeed()` on top of it, then
 * layers `liveCalcEngine.ts`'s own `inferOpponentOffensiveStats()` (the
 * mirror direction) on top of THAT - this file is just the state/plumbing
 * around those three pure engine passes (Legs 1, 15, and Leg 1 of the
 * Layout & Function Rework), mirroring how useDamageCalc.ts is
 * state/plumbing around damageCalcEngine.ts. Leg 2 of the same rework is UI
 * wiring only (LiveCalcDefenderPanel's new fields, a second observation
 * list) - no new state or engine calls were needed here beyond exposing
 * `defenderMoveOptions` for that second list's move picker.
 *
 * The attacker's own `CalcPokemonState.moves` slots are never read by
 * `buildPokemon()` - each observation carries its own move name instead,
 * picked from `attackerMoveOptions`. That said, `attacker.moves` isn't
 * ignored entirely (Live Calc Observation Move Options: Actual Attacker
 * Moveset - Leg 1): when a real set has been loaded into the attacker panel
 * (a saved set, a usage auto-fill, a team-tray drag - anything that
 * populates `attacker.moves` with real move names), `attackerMoveOptions`
 * caps to just those, since the attacker in practice only ever knows 4
 * moves. Only once none of the 4 slots are filled does it fall back to the
 * attacker species' full learned moveset, the same way useDamageCalc.ts's
 * pokemon1MoveOptions is (via getEnrichedSpeciesOptions), itself falling
 * back further to the full move list until that resolves or if it's empty.
 *
 * Live Calc Page Layout & Function Rework (Leg 3, Layout & Live Range Grid
 * Rework): `attacker.moves` gains a real editor at last - the new "Yours ->
 * Them" move grid (`setAttackerMove`) - and its mirror, `defenderMoves`/
 * `setDefenderMove`, is a second, separate 4-slot array powering the "Theirs
 * -> You" grid (NOT a real known opponent moveset, just which 4 moves that
 * grid currently previews). Both grids' live results (`yourMoveRanges`/
 * `theirMoveRanges`) are computed the same way `inference` itself is -
 * re-derived from the current engine state on every change - via
 * `liveCalcEngine.ts`'s `computeYourMoveRanges()`/`computeTheirMoveRanges()`.
 */

import { useEffect, useMemo, useState } from 'react';
import { Generations, toID } from '@smogon/calc';
import type { Generation, NatureName, StatsTable } from '@smogon/calc/dist/data/interface';
import { validateSpeciesLegality, type RegulationId } from '../utils/pokemonRules';
import { getFormeFamily, type FormeFamily } from '../utils/calcFormes';
import { getMegaAbility } from '../config/megaAbilities';
import type { UseGameDataReturn } from './useGameData';
import {
  normalizeMoveSlug,
  getNatureStatEffect,
  defaultPokemonState,
  defaultMoveSlots,
  computeBoostedStats,
  type NatureStatEffect,
  type CalcPokemonState,
  type CalcMoveSlot,
} from '../utils/damageCalcEngine';
import {
  defaultInference,
  inferDefenderStats,
  inferOpponentOffensiveStats,
  computeYourMoveRanges,
  computeTheirMoveRanges,
  type LiveCalcObservation,
  type LiveCalcReverseObservation,
  type LiveCalcInference,
  type LiveCalcMoveRangeEntry,
} from '../utils/liveCalcEngine';
import {
  inferDefenderSpeed,
  type LiveCalcTurnOrderObservation,
} from '../utils/liveCalcSpeedEngine';

const GEN_NUM = 9;
const DEFAULT_DEFENDER_LEVEL = 50;

let nextObservationId = 0;
function makeObservationId(): string {
  nextObservationId += 1;
  return `obs-${nextObservationId}`;
}

export interface LiveCalcObservationEntry extends LiveCalcObservation {
  id: string;
}

function defaultObservation(): LiveCalcObservationEntry {
  return { id: makeObservationId(), moveName: '', damagePercent: 0, targetsHit: 2, isCrit: false, outcome: 'survived' };
}

export interface LiveCalcTurnOrderObservationEntry extends LiveCalcTurnOrderObservation {
  id: string;
}

function defaultTurnOrderObservation(): LiveCalcTurnOrderObservationEntry {
  return { id: makeObservationId(), moveName: '', wentFirst: 'attacker', defenderSpeedStage: 0 };
}

export interface LiveCalcReverseObservationEntry extends LiveCalcReverseObservation {
  id: string;
}

function defaultReverseObservation(): LiveCalcReverseObservationEntry {
  return { id: makeObservationId(), moveName: '', damagePercent: 0, targetsHit: 2, isCrit: false, outcome: 'survived' };
}

/** Live Calc Feedback Pass 2 - Leg 1: logging a reverse observation for a
 * move that isn't already showing in the "Theirs -> You" grid auto-fills it
 * into that grid's first empty slot, so the grid reflects it the same way
 * the "Yours -> Them" grid already reflects the attacker's own moves (there,
 * `attackerMoveOptions` is already constrained to `attacker.moves` once a
 * real set is loaded, so whatever's logged is already in the grid - the
 * reverse direction has no such backing moveset, so nothing did this for
 * `defenderMoves` until now). No-ops if the move's already present, or if
 * all 4 slots are already taken (a real Pokemon has at most 4 moves, so a
 * 5th distinct one isn't given a slot to bump). */
function syncMoveIntoSlots(slots: CalcMoveSlot[], moveName: string): CalcMoveSlot[] {
  if (slots.some(slot => slot.name === moveName)) return slots;
  const emptyIndex = slots.findIndex(slot => slot.name === '');
  if (emptyIndex === -1) return slots;
  return slots.map((slot, i) => (i === emptyIndex ? { ...slot, name: moveName } : slot));
}

export interface UseLiveCalcReturn {
  /** Exposed for Live Calc Results Display (Leg 3), which needs to compute
   * `inferDefenderStats()`'s own pre-narrowing baseline (via the engine's
   * exported `defaultInference()`) to show how much an observation has
   * actually narrowed things - not something this hook's plumbing itself needs. */
  gen: Generation;
  attacker: CalcPokemonState;
  setAttacker: (updates: Partial<CalcPokemonState>) => void;
  speciesOptions: string[];
  itemOptions: string[];
  abilityOptions: string[];
  natureOptions: NatureName[];
  attackerFormes: FormeFamily;
  attackerBaseStats: StatsTable | null;
  attackerBoostedStats: StatsTable | null;
  attackerNatureEffect: NatureStatEffect;
  attackerMoveOptions: string[];
  /** Live Calc Page Layout & Function Rework - Leg 2: move options for the
   * new "their move -> you" reverse observation list. Unlike
   * `attackerMoveOptions`, this never narrows to a "real loaded set" - the
   * opponent's actual moveset is exactly what the tab doesn't track, so it's
   * always the full legal move list (the same unfiltered pool
   * `attackerMoveOptions` itself falls back to before a real attacker set is
   * loaded). */
  defenderMoveOptions: string[];
  defenderSpecies: string;
  defenderLevel: number;
  setDefenderSpecies: (species: string) => void;
  setDefenderLevel: (level: number) => void;
  defenderFormes: FormeFamily;
  defenderBaseStats: StatsTable | null;
  defenderDefBoost: number;
  defenderSpdBoost: number;
  setDefenderDefBoost: (stage: number) => void;
  setDefenderSpdBoost: (stage: number) => void;
  /** The 3 previously-untracked combat-stat boost stages (Live Calc Page
   * Layout & Function Rework - Leg 1) - see `liveCalcEngine.ts`'s
   * `LiveCalcDefenderInput.atkBoost`/`spaBoost`/`speBoost` for why these
   * matter once the opponent's own offense (not just its defense) is
   * modeled via `inferOpponentOffensiveStats()`. */
  defenderAtkBoost: number;
  defenderSpaBoost: number;
  defenderSpeBoost: number;
  setDefenderAtkBoost: (stage: number) => void;
  setDefenderSpaBoost: (stage: number) => void;
  setDefenderSpeBoost: (stage: number) => void;
  /** The defender species' own real ability pool - options for the Known
   * Ability lock below, independent of any narrowing observations have
   * already done. Empty until a species is picked. */
  defenderAbilityOptions: string[];
  /** Live Calc Known-Ability Lock: empty string means still unknown (the
   * engine's default full-pool scan); a real ability name hard-locks
   * `inferDefenderStats()`'s ability axis to it - see
   * `liveCalcEngine.ts`'s `LiveCalcDefenderInput.knownAbility`. */
  defenderKnownAbility: string;
  setDefenderKnownAbility: (ability: string) => void;
  /** Same lock shape as `defenderKnownAbility`, generalized to item/nature
   * (Live Calc Page Layout & Function Rework - Leg 1) - see
   * `liveCalcEngine.ts`'s `LiveCalcDefenderInput.knownItem`/`knownNature`.
   * Empty string means still unknown for both. */
  defenderKnownItem: string;
  setDefenderKnownItem: (item: string) => void;
  defenderKnownNature: NatureName | '';
  setDefenderKnownNature: (nature: NatureName | '') => void;
  observations: LiveCalcObservationEntry[];
  addObservation: () => void;
  updateObservation: (id: string, updates: Partial<LiveCalcObservation>) => void;
  removeObservation: (id: string) => void;
  turnOrderObservations: LiveCalcTurnOrderObservationEntry[];
  addTurnOrderObservation: () => void;
  updateTurnOrderObservation: (id: string, updates: Partial<LiveCalcTurnOrderObservation>) => void;
  removeTurnOrderObservation: (id: string) => void;
  /** Live Calc Page Layout & Function Rework - Leg 1: the mirror "their move
   * -> you" observation list, consumed by `inferOpponentOffensiveStats()`.
   * Same add/update/remove shape as `observations` above. */
  reverseObservations: LiveCalcReverseObservationEntry[];
  addReverseObservation: () => void;
  updateReverseObservation: (id: string, updates: Partial<LiveCalcReverseObservation>) => void;
  removeReverseObservation: (id: string) => void;
  inference: LiveCalcInference;
  /** Live Calc Page Layout & Function Rework - Leg 3: the attacker's own
   * 4-move-slot array, now directly editable via the new "Yours -> Them"
   * range grid (previously only settable in bulk via a saved-set/team-tray
   * load - see this file's own header). Same shape/setter pattern as
   * `useDamageCalc.ts`'s `setPokemon1Move`. */
  setAttackerMove: (index: number, updates: Partial<CalcMoveSlot>) => void;
  /** The "Theirs -> You" grid's own 4-move-slot array - unlike
   * `attacker.moves`, this doesn't track a real known moveset (the opponent's
   * actual moves are exactly what the tab doesn't know), it's just which 4
   * moves this grid currently previews a live range for. */
  defenderMoves: CalcMoveSlot[];
  setDefenderMove: (index: number, updates: Partial<CalcMoveSlot>) => void;
  /** The two move grids' own live results - one `LiveCalcMoveRangeEntry` per
   * slot in `attacker.moves`/`defenderMoves` respectively, each a min-max %
   * span over the current `inference`'s narrowed candidates rather than one
   * fixed number. See `utils/liveCalcEngine.ts`'s `computeYourMoveRanges`/
   * `computeTheirMoveRanges`. */
  yourMoveRanges: LiveCalcMoveRangeEntry[];
  theirMoveRanges: LiveCalcMoveRangeEntry[];
}

export function useLiveCalc(gameDataState: UseGameDataReturn, defaultRegulation: RegulationId): UseLiveCalcReturn {
  const [regulationId] = useState<RegulationId>(defaultRegulation);
  const [attacker, setAttackerState] = useState<CalcPokemonState>(defaultPokemonState);
  const [defenderSpecies, setDefenderSpecies] = useState('');
  const [defenderLevel, setDefenderLevel] = useState(DEFAULT_DEFENDER_LEVEL);
  const [defenderDefBoost, setDefenderDefBoost] = useState(0);
  const [defenderSpdBoost, setDefenderSpdBoost] = useState(0);
  const [defenderAtkBoost, setDefenderAtkBoost] = useState(0);
  const [defenderSpaBoost, setDefenderSpaBoost] = useState(0);
  const [defenderSpeBoost, setDefenderSpeBoost] = useState(0);
  const [defenderKnownAbility, setDefenderKnownAbility] = useState('');
  const [defenderKnownItem, setDefenderKnownItem] = useState('');
  const [defenderKnownNature, setDefenderKnownNature] = useState<NatureName | ''>('');
  const [observations, setObservations] = useState<LiveCalcObservationEntry[]>([]);
  const [turnOrderObservations, setTurnOrderObservations] = useState<LiveCalcTurnOrderObservationEntry[]>([]);
  const [reverseObservations, setReverseObservations] = useState<LiveCalcReverseObservationEntry[]>([]);
  const [defenderMoves, setDefenderMovesState] = useState<CalcMoveSlot[]>(defaultMoveSlots);
  const [attackerLearnedSlugs, setAttackerLearnedSlugs] = useState<Set<string> | null>(null);

  const gen = useMemo(() => Generations.get(GEN_NUM), []);
  const allSpecies = useMemo(() => [...gen.species].map(s => ({ name: s.name, baseSpecies: s.baseSpecies })), [gen]);

  const speciesOptions = useMemo(
    () => [...gen.species].map(s => s.name).filter(name => validateSpeciesLegality(name, regulationId)).sort(),
    [gen, regulationId]
  );
  const moveOptions = useMemo(() => [...gen.moves].map(m => m.name).sort(), [gen]);
  const itemOptions = useMemo(() => [...gen.items].map(i => i.name).sort(), [gen]);
  const abilityOptions = useMemo(() => [...gen.abilities].map(a => a.name).sort(), [gen]);
  const natureOptions = useMemo(() => [...gen.natures].map(n => n.name).sort() as NatureName[], [gen]);

  const attackerFormes = useMemo(() => getFormeFamily(allSpecies, attacker.species), [allSpecies, attacker.species]);
  const defenderFormes = useMemo(() => getFormeFamily(allSpecies, defenderSpecies), [allSpecies, defenderSpecies]);
  const defenderBaseStats = useMemo(
    () => (defenderSpecies ? gen.species.get(toID(defenderSpecies))?.baseStats ?? null : null),
    [gen, defenderSpecies]
  );
  const attackerNatureEffect = useMemo(() => getNatureStatEffect(gen, attacker.nature), [gen, attacker.nature]);
  const attackerBoostedStats = useMemo(() => computeBoostedStats(gen, attacker, ''), [gen, attacker]);
  const attackerBaseStats = useMemo(
    () => (attacker.species ? gen.species.get(toID(attacker.species))?.baseStats ?? null : null),
    [gen, attacker.species]
  );

  const { getEnrichedSpeciesOptions } = gameDataState;

  // Clears the stale learned-moves set the moment the attacker's species
  // empties out - set during render rather than in an effect, matching
  // useDamageCalc.ts's own identical guard (see its header comment for the
  // React docs link this pattern follows).
  const [resolvedForSpecies, setResolvedForSpecies] = useState(attacker.species);
  if (attacker.species !== resolvedForSpecies) {
    setResolvedForSpecies(attacker.species);
    if (!attacker.species) setAttackerLearnedSlugs(null);
  }

  // Same render-time-guard pattern as above: a Def/SpD boost (or a locked
  // ability) asserted for one defender shouldn't silently carry over and
  // misattribute to whatever species gets swapped in next. Live Calc
  // Feedback Pass 2 - Leg 1: when the new species IS a Mega form, known
  // ability auto-fills to that Mega's guaranteed ability (config/
  // megaAbilities.ts) instead of resetting to Unknown - the opponent panel
  // otherwise had no way to lock this in at all (LiveCalcDefenderPanel's own
  // FormeToggle just swaps species, unlike CalcPokemonPanel's attacker-side
  // Mega toggle which already does this) - and every other axis resets the
  // same as before.
  const [defenderResolvedForSpecies, setDefenderResolvedForSpecies] = useState(defenderSpecies);
  if (defenderSpecies !== defenderResolvedForSpecies) {
    setDefenderResolvedForSpecies(defenderSpecies);
    setDefenderDefBoost(0);
    setDefenderSpdBoost(0);
    setDefenderAtkBoost(0);
    setDefenderSpaBoost(0);
    setDefenderSpeBoost(0);
    setDefenderKnownAbility(getMegaAbility(defenderSpecies.toLowerCase()) ?? '');
    setDefenderKnownItem('');
    setDefenderKnownNature('');
  }

  const defenderAbilityOptions = useMemo(
    () => (defenderSpecies ? defaultInference(gen, defenderSpecies).abilityCandidates : []),
    [gen, defenderSpecies]
  );

  useEffect(() => {
    if (!attacker.species) return;
    let cancelled = false;
    getEnrichedSpeciesOptions(attacker.species, attacker.gender || undefined)
      .then(({ moves }) => { if (!cancelled) setAttackerLearnedSlugs(new Set(moves.map(m => normalizeMoveSlug(m.name)))); })
      .catch(() => { if (!cancelled) setAttackerLearnedSlugs(null); });
    return () => { cancelled = true; };
  }, [attacker.species, attacker.gender, getEnrichedSpeciesOptions]);

  const attackerMoveOptions = useMemo(() => {
    const realMoves = attacker.moves.map(m => m.name).filter(name => name !== '');
    if (realMoves.length > 0) return realMoves;
    if (!attackerLearnedSlugs) return moveOptions;
    const filtered = moveOptions.filter(name => attackerLearnedSlugs.has(normalizeMoveSlug(name)));
    return filtered.length > 0 ? filtered : moveOptions;
  }, [moveOptions, attackerLearnedSlugs, attacker.moves]);

  const setAttacker = (updates: Partial<CalcPokemonState>) => setAttackerState(prev => ({ ...prev, ...updates }));
  const setAttackerMove = (index: number, updates: Partial<CalcMoveSlot>) =>
    setAttackerState(prev => ({ ...prev, moves: prev.moves.map((slot, i) => (i === index ? { ...slot, ...updates } : slot)) }));
  const setDefenderMove = (index: number, updates: Partial<CalcMoveSlot>) =>
    setDefenderMovesState(prev => prev.map((slot, i) => (i === index ? { ...slot, ...updates } : slot)));

  const addObservation = () => setObservations(prev => [...prev, defaultObservation()]);
  const updateObservation = (id: string, updates: Partial<LiveCalcObservation>) =>
    setObservations(prev => prev.map(o => (o.id === id ? { ...o, ...updates } : o)));
  const removeObservation = (id: string) => setObservations(prev => prev.filter(o => o.id !== id));

  const addTurnOrderObservation = () => setTurnOrderObservations(prev => [...prev, defaultTurnOrderObservation()]);
  const updateTurnOrderObservation = (id: string, updates: Partial<LiveCalcTurnOrderObservation>) =>
    setTurnOrderObservations(prev => prev.map(o => (o.id === id ? { ...o, ...updates } : o)));
  const removeTurnOrderObservation = (id: string) => setTurnOrderObservations(prev => prev.filter(o => o.id !== id));

  const addReverseObservation = () => setReverseObservations(prev => [...prev, defaultReverseObservation()]);
  const updateReverseObservation = (id: string, updates: Partial<LiveCalcReverseObservation>) => {
    setReverseObservations(prev => prev.map(o => (o.id === id ? { ...o, ...updates } : o)));
    if (updates.moveName) setDefenderMovesState(prev => syncMoveIntoSlots(prev, updates.moveName!));
  };
  const removeReverseObservation = (id: string) => setReverseObservations(prev => prev.filter(o => o.id !== id));

  const defenderInput = useMemo(
    () => ({
      species: defenderSpecies,
      level: defenderLevel,
      defBoost: defenderDefBoost,
      spdBoost: defenderSpdBoost,
      atkBoost: defenderAtkBoost,
      spaBoost: defenderSpaBoost,
      speBoost: defenderSpeBoost,
      knownAbility: defenderKnownAbility || undefined,
      knownItem: defenderKnownItem || undefined,
      knownNature: defenderKnownNature || undefined,
    }),
    [defenderSpecies, defenderLevel, defenderDefBoost, defenderSpdBoost, defenderAtkBoost, defenderSpaBoost, defenderSpeBoost, defenderKnownAbility, defenderKnownItem, defenderKnownNature]
  );

  const damageInference = useMemo(
    () => inferDefenderStats(gen, attacker, defenderInput, observations),
    [gen, attacker, defenderInput, observations]
  );
  // Speed narrowing (Leg 15) runs as a second pass over the damage-based
  // inference above - see liveCalcSpeedEngine.ts's header for why it's
  // layered on top rather than folded into inferDefenderStats() itself.
  const speedInference = useMemo(
    () => inferDefenderSpeed(gen, attacker, defenderInput, damageInference, turnOrderObservations),
    [gen, attacker, defenderInput, damageInference, turnOrderObservations]
  );
  // Reverse-direction narrowing (Live Calc Page Layout & Function Rework -
  // Leg 1) runs as a third pass, same layering shape as Speed above - see
  // liveCalcEngine.ts's inferOpponentOffensiveStats() header.
  const inference = useMemo(
    () => inferOpponentOffensiveStats(gen, attacker, defenderInput, speedInference, reverseObservations),
    [gen, attacker, defenderInput, speedInference, reverseObservations]
  );

  // The two move grids' own live results (Live Calc Page Layout & Function
  // Rework - Leg 3) - re-derived from the same running `inference` above,
  // same "every change re-derives the engine passes" pattern this whole hook
  // already follows.
  const yourMoveRanges = useMemo(
    () => computeYourMoveRanges(gen, attacker, defenderInput, inference, attacker.moves),
    [gen, attacker, defenderInput, inference]
  );
  const theirMoveRanges = useMemo(
    () => computeTheirMoveRanges(gen, attacker, defenderInput, inference, defenderMoves),
    [gen, attacker, defenderInput, inference, defenderMoves]
  );

  return {
    gen,
    attacker,
    setAttacker,
    speciesOptions,
    itemOptions,
    abilityOptions,
    natureOptions,
    attackerFormes,
    attackerBaseStats,
    attackerBoostedStats,
    attackerNatureEffect,
    attackerMoveOptions,
    defenderMoveOptions: moveOptions,
    defenderSpecies,
    defenderLevel,
    setDefenderSpecies,
    setDefenderLevel,
    defenderFormes,
    defenderBaseStats,
    defenderDefBoost,
    defenderSpdBoost,
    setDefenderDefBoost,
    setDefenderSpdBoost,
    defenderAtkBoost,
    defenderSpaBoost,
    defenderSpeBoost,
    setDefenderAtkBoost,
    setDefenderSpaBoost,
    setDefenderSpeBoost,
    defenderAbilityOptions,
    defenderKnownAbility,
    setDefenderKnownAbility,
    defenderKnownItem,
    setDefenderKnownItem,
    defenderKnownNature,
    setDefenderKnownNature,
    observations,
    addObservation,
    updateObservation,
    removeObservation,
    turnOrderObservations,
    addTurnOrderObservation,
    updateTurnOrderObservation,
    removeTurnOrderObservation,
    reverseObservations,
    addReverseObservation,
    updateReverseObservation,
    removeReverseObservation,
    inference,
    setAttackerMove,
    defenderMoves,
    setDefenderMove,
    yourMoveRanges,
    theirMoveRanges,
  };
}

export type { RegulationId };
