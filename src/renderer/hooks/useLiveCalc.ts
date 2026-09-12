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
 * to scan/narrow), an add/remove list of damage-percent observations, and an
 * add/remove list of turn-order observations (Leg 15). Every change
 * re-derives
 * `utils/liveCalcEngine.ts`'s `inferDefenderStats()` inference and then
 * layers `utils/liveCalcSpeedEngine.ts`'s `inferDefenderSpeed()` on top of
 * it - this file is just the state/plumbing around those two pure engines
 * (Legs 1 and 15), mirroring how useDamageCalc.ts is state/plumbing around
 * damageCalcEngine.ts.
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
  defaultInference,
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
  return { id: makeObservationId(), moveName: '', damagePercent: 0, targetsHit: 2, isCrit: false, outcome: 'survived' };
}

export interface LiveCalcTurnOrderObservationEntry extends LiveCalcTurnOrderObservation {
  id: string;
}

function defaultTurnOrderObservation(): LiveCalcTurnOrderObservationEntry {
  return { id: makeObservationId(), moveName: '', wentFirst: 'attacker', defenderSpeedStage: 0 };
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
  defenderFormes: FormeFamily;
  defenderBaseStats: StatsTable | null;
  defenderDefBoost: number;
  defenderSpdBoost: number;
  setDefenderDefBoost: (stage: number) => void;
  setDefenderSpdBoost: (stage: number) => void;
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
  const [defenderDefBoost, setDefenderDefBoost] = useState(0);
  const [defenderSpdBoost, setDefenderSpdBoost] = useState(0);
  const [defenderKnownAbility, setDefenderKnownAbility] = useState('');
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
  // misattribute to whatever species gets swapped in next.
  const [defenderResolvedForSpecies, setDefenderResolvedForSpecies] = useState(defenderSpecies);
  if (defenderSpecies !== defenderResolvedForSpecies) {
    setDefenderResolvedForSpecies(defenderSpecies);
    setDefenderDefBoost(0);
    setDefenderSpdBoost(0);
    setDefenderKnownAbility('');
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

  const addObservation = () => setObservations(prev => [...prev, defaultObservation()]);
  const updateObservation = (id: string, updates: Partial<LiveCalcObservation>) =>
    setObservations(prev => prev.map(o => (o.id === id ? { ...o, ...updates } : o)));
  const removeObservation = (id: string) => setObservations(prev => prev.filter(o => o.id !== id));

  const addTurnOrderObservation = () => setTurnOrderObservations(prev => [...prev, defaultTurnOrderObservation()]);
  const updateTurnOrderObservation = (id: string, updates: Partial<LiveCalcTurnOrderObservation>) =>
    setTurnOrderObservations(prev => prev.map(o => (o.id === id ? { ...o, ...updates } : o)));
  const removeTurnOrderObservation = (id: string) => setTurnOrderObservations(prev => prev.filter(o => o.id !== id));

  const defenderInput = useMemo(
    () => ({
      species: defenderSpecies,
      level: defenderLevel,
      defBoost: defenderDefBoost,
      spdBoost: defenderSpdBoost,
      knownAbility: defenderKnownAbility || undefined,
    }),
    [defenderSpecies, defenderLevel, defenderDefBoost, defenderSpdBoost, defenderKnownAbility]
  );

  const damageInference = useMemo(
    () => inferDefenderStats(gen, attacker, defenderInput, observations),
    [gen, attacker, defenderInput, observations]
  );
  // Speed narrowing (Leg 15) runs as a second pass over the damage-based
  // inference above - see liveCalcSpeedEngine.ts's header for why it's
  // layered on top rather than folded into inferDefenderStats() itself.
  const inference = useMemo(
    () => inferDefenderSpeed(gen, attacker, defenderInput, damageInference, turnOrderObservations),
    [gen, attacker, defenderInput, damageInference, turnOrderObservations]
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
    defenderFormes,
    defenderBaseStats,
    defenderDefBoost,
    defenderSpdBoost,
    setDefenderDefBoost,
    setDefenderSpdBoost,
    defenderAbilityOptions,
    defenderKnownAbility,
    setDefenderKnownAbility,
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
