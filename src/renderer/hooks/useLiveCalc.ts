/**
 * useLiveCalc Hook - Live Calc Tab Scratchpad State
 * Transient, non-persisted state for the "Live Calc" tab (Live Calc Tab
 * Shell - Leg 2, see TODO.md) - same in-memory-only pattern as
 * useDamageCalc, lost on tab switch/app restart per the milestone's own
 * scope doc (docs/investigations/live-calc-stat-inference-scope.md).
 *
 * Owns four things: the attacker (a fully-known `CalcPokemonState`, same
 * shape the existing Calc tab's `CalcPokemonPanel` already edits - nothing
 * new needed there), the defender's known species+level, an add/remove list
 * of damage-percent observations, and an add/remove list of turn-order
 * observations (Leg 15). Every change re-derives `utils/liveCalcEngine.ts`'s
 * `inferDefenderStats()` inference and then layers
 * `utils/liveCalcSpeedEngine.ts`'s `inferDefenderSpeed()` on top of it -
 * this file is just the state/plumbing around those two pure engines (Legs
 * 1 and 15), mirroring how useDamageCalc.ts is state/plumbing around
 * damageCalcEngine.ts.
 *
 * The attacker's own `CalcPokemonState.moves` slots are deliberately left
 * unused here (always the default 4 empty slots) - `buildPokemon()` never
 * reads them, and each observation carries its own move name instead. That
 * move name is picked from `attackerMoveOptions`, filtered down to the
 * attacker species' actual learned moveset the same way
 * useDamageCalc.ts's pokemon1MoveOptions is (via getEnrichedSpeciesOptions),
 * falling back to the full move list until that resolves or if it's empty.
 */

import { useEffect, useMemo, useState } from 'react';
import { Generations, toID } from '@smogon/calc';
import type { Generation, NatureName, StatsTable } from '@smogon/calc/dist/data/interface';
import { validateSpeciesLegality, type RegulationId } from '../utils/pokemonRules';
import { getFormeFamily, type FormeFamily } from '../utils/calcFormes';
import type { UseGameDataReturn } from './useGameData';
import {
  normalizeMoveSlug,
  getNatureStatEffect,
  defaultPokemonState,
  computeBoostedStats,
  type NatureStatEffect,
  type CalcPokemonState,
} from '../utils/damageCalcEngine';
import {
  inferDefenderStats,
  type LiveCalcObservation,
  type LiveCalcInference,
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
  return { id: makeObservationId(), moveName: '', damagePercent: 0, targetsHit: 2 };
}

export interface LiveCalcTurnOrderObservationEntry extends LiveCalcTurnOrderObservation {
  id: string;
}

function defaultTurnOrderObservation(): LiveCalcTurnOrderObservationEntry {
  return { id: makeObservationId(), moveName: '', wentFirst: 'attacker' };
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
  defenderSpecies: string;
  defenderLevel: number;
  setDefenderSpecies: (species: string) => void;
  setDefenderLevel: (level: number) => void;
  observations: LiveCalcObservationEntry[];
  addObservation: () => void;
  updateObservation: (id: string, updates: Partial<LiveCalcObservation>) => void;
  removeObservation: (id: string) => void;
  turnOrderObservations: LiveCalcTurnOrderObservationEntry[];
  addTurnOrderObservation: () => void;
  updateTurnOrderObservation: (id: string, updates: Partial<LiveCalcTurnOrderObservation>) => void;
  removeTurnOrderObservation: (id: string) => void;
  inference: LiveCalcInference;
}

export function useLiveCalc(gameDataState: UseGameDataReturn, defaultRegulation: RegulationId): UseLiveCalcReturn {
  const [regulationId] = useState<RegulationId>(defaultRegulation);
  const [attacker, setAttackerState] = useState<CalcPokemonState>(defaultPokemonState);
  const [defenderSpecies, setDefenderSpecies] = useState('');
  const [defenderLevel, setDefenderLevel] = useState(DEFAULT_DEFENDER_LEVEL);
  const [observations, setObservations] = useState<LiveCalcObservationEntry[]>([]);
  const [turnOrderObservations, setTurnOrderObservations] = useState<LiveCalcTurnOrderObservationEntry[]>([]);
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

  useEffect(() => {
    if (!attacker.species) return;
    let cancelled = false;
    getEnrichedSpeciesOptions(attacker.species, attacker.gender || undefined)
      .then(({ moves }) => { if (!cancelled) setAttackerLearnedSlugs(new Set(moves.map(m => normalizeMoveSlug(m.name)))); })
      .catch(() => { if (!cancelled) setAttackerLearnedSlugs(null); });
    return () => { cancelled = true; };
  }, [attacker.species, attacker.gender, getEnrichedSpeciesOptions]);

  const attackerMoveOptions = useMemo(() => {
    if (!attackerLearnedSlugs) return moveOptions;
    const filtered = moveOptions.filter(name => attackerLearnedSlugs.has(normalizeMoveSlug(name)));
    return filtered.length > 0 ? filtered : moveOptions;
  }, [moveOptions, attackerLearnedSlugs]);

  const setAttacker = (updates: Partial<CalcPokemonState>) => setAttackerState(prev => ({ ...prev, ...updates }));

  const addObservation = () => setObservations(prev => [...prev, defaultObservation()]);
  const updateObservation = (id: string, updates: Partial<LiveCalcObservation>) =>
    setObservations(prev => prev.map(o => (o.id === id ? { ...o, ...updates } : o)));
  const removeObservation = (id: string) => setObservations(prev => prev.filter(o => o.id !== id));

  const addTurnOrderObservation = () => setTurnOrderObservations(prev => [...prev, defaultTurnOrderObservation()]);
  const updateTurnOrderObservation = (id: string, updates: Partial<LiveCalcTurnOrderObservation>) =>
    setTurnOrderObservations(prev => prev.map(o => (o.id === id ? { ...o, ...updates } : o)));
  const removeTurnOrderObservation = (id: string) => setTurnOrderObservations(prev => prev.filter(o => o.id !== id));

  const damageInference = useMemo(
    () => inferDefenderStats(gen, attacker, { species: defenderSpecies, level: defenderLevel }, observations),
    [gen, attacker, defenderSpecies, defenderLevel, observations]
  );
  // Speed narrowing (Leg 15) runs as a second pass over the damage-based
  // inference above - see liveCalcSpeedEngine.ts's header for why it's
  // layered on top rather than folded into inferDefenderStats() itself.
  const inference = useMemo(
    () => inferDefenderSpeed(gen, attacker, { species: defenderSpecies, level: defenderLevel }, damageInference, turnOrderObservations),
    [gen, attacker, defenderSpecies, defenderLevel, damageInference, turnOrderObservations]
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
    defenderSpecies,
    defenderLevel,
    setDefenderSpecies,
    setDefenderLevel,
    observations,
    addObservation,
    updateObservation,
    removeObservation,
    turnOrderObservations,
    addTurnOrderObservation,
    updateTurnOrderObservation,
    removeTurnOrderObservation,
    inference,
  };
}

export type { RegulationId };
