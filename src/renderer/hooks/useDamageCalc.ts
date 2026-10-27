/**
 * useDamageCalc Hook - Champions Damage Calculator Scratchpad State
 * Owns two Pokémon (each with its own 4-move set), shared field conditions
 * (each Pokémon has its own side), and a regulation toggle - and derives
 * @smogon/calc Results for both directions (P1's moves vs P2, P2's moves vs
 * P1) on every change. Purely in-memory (matches useGameData's
 * non-persisted pattern) - saving a calc setup into a team is a later
 * milestone, not handled here.
 *
 * Species/move/item/ability names are sourced from @smogon/calc's own
 * bundled Gen 9 data (not PokeAPI/useSpeciesRoster/useGameData) because
 * calculate() matches these strings against its own internal data layer -
 * feeding it PokeAPI-sourced names risks naming mismatches (aliases,
 * hyphenation). The species list is filtered down to what's legal for the
 * selected regulation via validateSpeciesLegality (utils/pokemonRules.ts) -
 * the same Reg M-A/M-B allowlists the Teams tab uses. Items/abilities/moves
 * are left unfiltered: per that file's own sourcing notes, the regulation
 * pages list no item/move bans, species legality is the only real
 * restriction. Like the real Showdown calculator, this is otherwise a
 * free-form sandbox - nothing here validates a moveset against a species.
 *
 * The actual calc engine (state factories, boost/stat-multiplier math,
 * buildPokemon/computeSideResults) lives in utils/damageCalcEngine.ts, kept
 * pure and React-free so it's independently unit-testable - this file only
 * owns the state and re-exports the engine's types/constants so existing
 * `from '../../hooks/useDamageCalc'` imports across the calc components
 * keep working unchanged.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Generations, toID } from '@smogon/calc';
import type { StatsTable, NatureName } from '@smogon/calc/dist/data/interface';
import {
  validateSpeciesLegality,
  ALL_REGULATION_IDS,
  type RegulationId,
} from '../utils/pokemonRules';
import { getFormeFamily, type FormeFamily } from '../utils/calcFormes';
import { resolveCalcSpecies } from '../utils/championsStats';
import { resolveAutoField } from '../utils/calcAutoField';
import { getMegaAbility } from '../config/megaAbilities';
import type { UseGameDataReturn } from './useGameData';
import {
  normalizeMoveSlug,
  getNatureStatEffect,
  getCalcMoveType,
  defaultPokemonState,
  defaultFieldState,
  computeBoostedStats,
  computeEffectiveSpeed,
  computeSideResults,
  type NatureStatEffect,
  type CalcMoveSlot,
  type CalcPokemonState,
  type CalcSideConditions,
  type CalcFieldState,
  type CalcMoveResultEntry,
} from '../utils/damageCalcEngine';

export {
  WEATHER_OPTIONS,
  TERRAIN_OPTIONS,
  STATUS_OPTIONS,
  STATUS_LABELS,
  GENDER_OPTIONS,
} from '../utils/damageCalcEngine';
export type {
  NatureStatEffect,
  CalcMoveSlot,
  CalcPokemonState,
  CalcSideConditions,
  CalcFieldState,
  CalcMoveResultEntry,
} from '../utils/damageCalcEngine';

const GEN_NUM = 9;

export interface SelectedResultRef {
  side: 'p1' | 'p2';
  index: number;
}

export interface UseDamageCalcReturn {
  regulationId: RegulationId;
  setRegulationId: (id: RegulationId) => void;
  pokemon1: CalcPokemonState;
  pokemon2: CalcPokemonState;
  setPokemon1: (updates: Partial<CalcPokemonState>) => void;
  setPokemon2: (updates: Partial<CalcPokemonState>) => void;
  setPokemon1Move: (index: number, updates: Partial<CalcMoveSlot>) => void;
  setPokemon2Move: (index: number, updates: Partial<CalcMoveSlot>) => void;
  field: CalcFieldState;
  setField: (updates: Partial<Pick<CalcFieldState, 'gameType' | 'weather' | 'terrain'>>) => void;
  setPokemon1Side: (updates: Partial<CalcSideConditions>) => void;
  setPokemon2Side: (updates: Partial<CalcSideConditions>) => void;
  speciesOptions: string[];
  itemOptions: string[];
  abilityOptions: string[];
  natureOptions: NatureName[];
  /** A move's calc type (e.g. "Fire"), or null if unknown - drives move-row type coloring. */
  getMoveType: (moveName: string) => string | null;
  pokemon1MoveOptions: string[];
  pokemon2MoveOptions: string[];
  pokemon1Formes: FormeFamily;
  pokemon2Formes: FormeFamily;
  pokemon1BaseStats: StatsTable | null;
  pokemon2BaseStats: StatsTable | null;
  pokemon1BoostedStats: StatsTable | null;
  pokemon2BoostedStats: StatsTable | null;
  pokemon1NatureEffect: NatureStatEffect;
  pokemon2NatureEffect: NatureStatEffect;
  pokemon1Speed: number | null;
  pokemon2Speed: number | null;
  p1Results: CalcMoveResultEntry[];
  p2Results: CalcMoveResultEntry[];
  selectedResult: SelectedResultRef | null;
  setSelectedResult: (ref: SelectedResultRef | null) => void;
  /** `selectedResult` once a move's been clicked, otherwise the faster side's
   * highest-damaging move (Calc Auto Damage-Roll Display) - what the move
   * grids/result panel should actually render as "selected", so a manual
   * click always wins over the auto pick without needing an effect to
   * reconcile the two. */
  effectiveSelectedResult: SelectedResultRef | null;
  selectedEntry: CalcMoveResultEntry | null;
}

export function useDamageCalc(
  gameDataState: UseGameDataReturn,
  defaultRegulation: RegulationId,
): UseDamageCalcReturn {
  const [regulationId, setRegulationId] = useState<RegulationId>(defaultRegulation);
  const [pokemon1, setPokemon1State] = useState<CalcPokemonState>(defaultPokemonState);
  const [pokemon2, setPokemon2State] = useState<CalcPokemonState>(defaultPokemonState);
  const [field, setFieldState] = useState<CalcFieldState>(defaultFieldState);
  const [selectedResult, setSelectedResult] = useState<SelectedResultRef | null>(null);
  const [pokemon1LearnedSlugs, setPokemon1LearnedSlugs] = useState<Set<string> | null>(null);
  const [pokemon2LearnedSlugs, setPokemon2LearnedSlugs] = useState<Set<string> | null>(null);

  const gen = useMemo(() => Generations.get(GEN_NUM), []);
  const allSpecies = useMemo(
    () => [...gen.species].map((s) => ({ name: s.name, baseSpecies: s.baseSpecies })),
    [gen],
  );

  const speciesOptions = useMemo(
    () =>
      [...gen.species]
        .map((s) => s.name)
        .filter((name) => validateSpeciesLegality(name, regulationId))
        .sort(),
    [gen, regulationId],
  );
  const moveOptions = useMemo(() => [...gen.moves].map((m) => m.name).sort(), [gen]);
  const itemOptions = useMemo(() => [...gen.items].map((i) => i.name).sort(), [gen]);
  const abilityOptions = useMemo(() => [...gen.abilities].map((a) => a.name).sort(), [gen]);
  const getMoveType = useCallback((moveName: string) => getCalcMoveType(gen, moveName), [gen]);
  const natureOptions = useMemo(
    () => [...gen.natures].map((n) => n.name).sort() as NatureName[],
    [gen],
  );

  const pokemon1Formes = useMemo(
    () => getFormeFamily(allSpecies, pokemon1.species),
    [allSpecies, pokemon1.species],
  );
  const pokemon2Formes = useMemo(
    () => getFormeFamily(allSpecies, pokemon2.species),
    [allSpecies, pokemon2.species],
  );

  const pokemon1NatureEffect = useMemo(
    () => getNatureStatEffect(gen, pokemon1.nature),
    [gen, pokemon1.nature],
  );
  const pokemon2NatureEffect = useMemo(
    () => getNatureStatEffect(gen, pokemon2.nature),
    [gen, pokemon2.nature],
  );

  const pokemon1Speed = useMemo(
    () => computeEffectiveSpeed(gen, pokemon1, field.weather, field.terrain, field.pokemon1Side),
    [gen, pokemon1, field.weather, field.terrain, field.pokemon1Side],
  );
  const pokemon2Speed = useMemo(
    () => computeEffectiveSpeed(gen, pokemon2, field.weather, field.terrain, field.pokemon2Side),
    [gen, pokemon2, field.weather, field.terrain, field.pokemon2Side],
  );

  const pokemon1BoostedStats = useMemo(
    () => computeBoostedStats(gen, pokemon1, field.weather, field.terrain, field.pokemon1Side),
    [gen, pokemon1, field.weather, field.terrain, field.pokemon1Side],
  );
  const pokemon2BoostedStats = useMemo(
    () => computeBoostedStats(gen, pokemon2, field.weather, field.terrain, field.pokemon2Side),
    [gen, pokemon2, field.weather, field.terrain, field.pokemon2Side],
  );

  const pokemon1BaseStats = useMemo(
    () =>
      pokemon1.species
        ? (gen.species.get(toID(resolveCalcSpecies(pokemon1.species)))?.baseStats ?? null)
        : null,
    [gen, pokemon1.species],
  );
  const pokemon2BaseStats = useMemo(
    () =>
      pokemon2.species
        ? (gen.species.get(toID(resolveCalcSpecies(pokemon2.species)))?.baseStats ?? null)
        : null,
    [gen, pokemon2.species],
  );

  const { getEnrichedSpeciesOptions } = gameDataState;

  // Clears the stale learned-moves set the moment a species empties out (not
  // on every species/gender change - a change to a different species just
  // re-fetches below, matching the original effect's own guard) - set during
  // render rather than in an effect, see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [resolvedForSpecies1, setResolvedForSpecies1] = useState(pokemon1.species);
  if (pokemon1.species !== resolvedForSpecies1) {
    setResolvedForSpecies1(pokemon1.species);
    if (!pokemon1.species) setPokemon1LearnedSlugs(null);
  }

  useEffect(() => {
    if (!pokemon1.species) return;
    let cancelled = false;
    getEnrichedSpeciesOptions(pokemon1.species, pokemon1.gender || undefined)
      .then(({ moves }) => {
        if (!cancelled)
          setPokemon1LearnedSlugs(new Set(moves.map((m) => normalizeMoveSlug(m.name))));
      })
      .catch(() => {
        if (!cancelled) setPokemon1LearnedSlugs(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pokemon1.species, pokemon1.gender, getEnrichedSpeciesOptions]);

  const [resolvedForSpecies2, setResolvedForSpecies2] = useState(pokemon2.species);
  if (pokemon2.species !== resolvedForSpecies2) {
    setResolvedForSpecies2(pokemon2.species);
    if (!pokemon2.species) setPokemon2LearnedSlugs(null);
  }

  useEffect(() => {
    if (!pokemon2.species) return;
    let cancelled = false;
    getEnrichedSpeciesOptions(pokemon2.species, pokemon2.gender || undefined)
      .then(({ moves }) => {
        if (!cancelled)
          setPokemon2LearnedSlugs(new Set(moves.map((m) => normalizeMoveSlug(m.name))));
      })
      .catch(() => {
        if (!cancelled) setPokemon2LearnedSlugs(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pokemon2.species, pokemon2.gender, getEnrichedSpeciesOptions]);

  const pokemon1MoveOptions = useMemo(() => {
    if (!pokemon1LearnedSlugs) return moveOptions;
    const filtered = moveOptions.filter((name) =>
      pokemon1LearnedSlugs.has(normalizeMoveSlug(name)),
    );
    return filtered.length > 0 ? filtered : moveOptions;
  }, [moveOptions, pokemon1LearnedSlugs]);
  const pokemon2MoveOptions = useMemo(() => {
    if (!pokemon2LearnedSlugs) return moveOptions;
    const filtered = moveOptions.filter((name) =>
      pokemon2LearnedSlugs.has(normalizeMoveSlug(name)),
    );
    return filtered.length > 0 ? filtered : moveOptions;
  }, [moveOptions, pokemon2LearnedSlugs]);

  // A species/ability change re-applies the entering Pokemon's weather/terrain
  // (Calc Page Rework: Auto Weather & Terrain) as a one-shot write, so a later
  // manual chip click simply overrides it. Other edits never touch the field.
  const applyAutoField = (
    side: 'p1' | 'p2',
    prev: CalcPokemonState,
    updates: Partial<CalcPokemonState>,
  ) => {
    const next = { ...prev, ...updates };
    if (next.species === prev.species && next.ability === prev.ability) return;
    const [p1, p2] = side === 'p1' ? [next, pokemon2] : [pokemon1, next];
    const abilityOf = (p: CalcPokemonState) =>
      p.ability || getMegaAbility(p.species.toLowerCase()) || '';
    const fieldUpdates = resolveAutoField({
      changedSide: side,
      p1Ability: abilityOf(p1),
      p2Ability: abilityOf(p2),
      p1Speed: computeEffectiveSpeed(gen, p1, '', '', field.pokemon1Side),
      p2Speed: computeEffectiveSpeed(gen, p2, '', '', field.pokemon2Side),
      gameType: field.gameType,
    });
    if (Object.keys(fieldUpdates).length > 0) setFieldState((f) => ({ ...f, ...fieldUpdates }));
  };

  const setPokemon1 = (updates: Partial<CalcPokemonState>) => {
    applyAutoField('p1', pokemon1, updates);
    setPokemon1State((prev) => ({ ...prev, ...updates }));
  };
  const setPokemon2 = (updates: Partial<CalcPokemonState>) => {
    applyAutoField('p2', pokemon2, updates);
    setPokemon2State((prev) => ({ ...prev, ...updates }));
  };

  const setMoveAt = (side: 'p1' | 'p2', index: number, updates: Partial<CalcMoveSlot>) => {
    const setter = side === 'p1' ? setPokemon1State : setPokemon2State;
    setter((prev) => ({
      ...prev,
      moves: prev.moves.map((slot, i) => (i === index ? { ...slot, ...updates } : slot)),
    }));
  };
  const setPokemon1Move = (index: number, updates: Partial<CalcMoveSlot>) =>
    setMoveAt('p1', index, updates);
  const setPokemon2Move = (index: number, updates: Partial<CalcMoveSlot>) =>
    setMoveAt('p2', index, updates);

  const setField = (updates: Partial<Pick<CalcFieldState, 'gameType' | 'weather' | 'terrain'>>) =>
    setFieldState((prev) => ({ ...prev, ...updates }));
  const setPokemon1Side = (updates: Partial<CalcSideConditions>) =>
    setFieldState((prev) => ({ ...prev, pokemon1Side: { ...prev.pokemon1Side, ...updates } }));
  const setPokemon2Side = (updates: Partial<CalcSideConditions>) =>
    setFieldState((prev) => ({ ...prev, pokemon2Side: { ...prev.pokemon2Side, ...updates } }));

  const p1Results = useMemo(
    () =>
      computeSideResults(
        gen,
        pokemon1,
        pokemon2,
        field.pokemon1Side,
        field.pokemon2Side,
        field.gameType,
        field.weather,
        field.terrain,
      ),
    [gen, pokemon1, pokemon2, field],
  );
  const p2Results = useMemo(
    () =>
      computeSideResults(
        gen,
        pokemon2,
        pokemon1,
        field.pokemon2Side,
        field.pokemon1Side,
        field.gameType,
        field.weather,
        field.terrain,
      ),
    [gen, pokemon1, pokemon2, field],
  );

  // Default pick once both Pokemon are set up and neither move grid has been
  // clicked yet - the faster side's highest-average-damage move (average of
  // its range, matching the scalar the move grid itself already sorts
  // on-screen by). A speed tie favors p1; real Showdown ties resolve
  // randomly, so there's no single "correct" side to prefer here.
  const defaultBestResult = useMemo<SelectedResultRef | null>(() => {
    if (!pokemon1.species || !pokemon2.species) return null;
    if (pokemon1Speed === null || pokemon2Speed === null) return null;
    const side: 'p1' | 'p2' = pokemon1Speed >= pokemon2Speed ? 'p1' : 'p2';
    const results = side === 'p1' ? p1Results : p2Results;
    let bestIndex: number | null = null;
    let bestAvgDamage = -Infinity;
    results.forEach((entry, index) => {
      if (!entry.range || entry.errorMessage) return;
      const avgDamage = (entry.range[0] + entry.range[1]) / 2;
      if (avgDamage > bestAvgDamage) {
        bestAvgDamage = avgDamage;
        bestIndex = index;
      }
    });
    return bestIndex === null ? null : { side, index: bestIndex };
  }, [pokemon1.species, pokemon2.species, pokemon1Speed, pokemon2Speed, p1Results, p2Results]);

  const effectiveSelectedResult = selectedResult ?? defaultBestResult;

  const selectedEntry = useMemo(() => {
    if (!effectiveSelectedResult) return null;
    const list = effectiveSelectedResult.side === 'p1' ? p1Results : p2Results;
    return list[effectiveSelectedResult.index] ?? null;
  }, [effectiveSelectedResult, p1Results, p2Results]);

  return {
    regulationId,
    setRegulationId,
    pokemon1,
    pokemon2,
    setPokemon1,
    setPokemon2,
    setPokemon1Move,
    setPokemon2Move,
    field,
    setField,
    setPokemon1Side,
    setPokemon2Side,
    speciesOptions,
    itemOptions,
    abilityOptions,
    natureOptions,
    getMoveType,
    pokemon1MoveOptions,
    pokemon2MoveOptions,
    pokemon1Formes,
    pokemon2Formes,
    pokemon1BaseStats,
    pokemon2BaseStats,
    pokemon1BoostedStats,
    pokemon2BoostedStats,
    pokemon1NatureEffect,
    pokemon2NatureEffect,
    pokemon1Speed,
    pokemon2Speed,
    p1Results,
    p2Results,
    selectedResult,
    setSelectedResult,
    effectiveSelectedResult,
    selectedEntry,
  };
}

export { ALL_REGULATION_IDS };
export type { RegulationId };
