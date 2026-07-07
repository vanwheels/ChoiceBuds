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
 */

import { useEffect, useMemo, useState } from 'react';
import { calculate, Generations, Pokemon, Move, Field, toID } from '@smogon/calc';
import type {
  StatsTable,
  GameType,
  Weather,
  Terrain,
  NatureName,
  GenderName,
  StatusName,
  Generation,
} from '@smogon/calc/dist/data/interface';
import { validateSpeciesLegality, ALL_REGULATION_IDS, type RegulationId } from '../utils/pokemonRules';
import { getFormeFamily, type FormeFamily } from '../utils/calcFormes';
import { getChampionsCalcMoveOverride } from '../config/championsMoveOverrides';
import type { UseGameDataReturn } from './useGameData';

const GEN_NUM = 9;
const MOVE_SLOT_COUNT = 4;

const ZERO_STATS: StatsTable = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const MAX_IVS: StatsTable = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

// 'Hail' omitted - Gen 9 replaced it game-wide with 'Snow' (Ice Body/Snow
// Warning etc. key off Snow, not Hail), so it's never a real Gen 9 state.
export const WEATHER_OPTIONS: Weather[] = ['Sun', 'Rain', 'Sand', 'Snow', 'Harsh Sunshine', 'Heavy Rain', 'Strong Winds'];
export const TERRAIN_OPTIONS: Terrain[] = ['Electric', 'Grassy', 'Psychic', 'Misty'];
export const STATUS_OPTIONS: StatusName[] = ['slp', 'psn', 'brn', 'frz', 'par', 'tox'];
export const GENDER_OPTIONS: GenderName[] = ['M', 'F', 'N'];

/** Comparable form for matching PokeAPI's lowercase-hyphenated move slugs
 * (e.g. "flare-blitz") against @smogon/calc's Title Case names ("Flare Blitz"). */
function normalizeMoveSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Champions replaces traditional 0-252 EVs with 0-32 "Stat Points" (SPs) per
 * stat, 66 total across all six - confirmed twice over: against the real
 * calc.pokemonshowdown.com Champions tab, and directly in-game (max 32/stat,
 * max 66 total). @smogon/calc has no native SP concept, so this converts at
 * the boundary: the standard stat formula already computes floor(ev/4), so
 * SP is treated as directly supplying that pre-divided term (ev = sp*4).
 * See CalcStatRows.tsx for where the 0-32 per-stat and 66-total caps are
 * actually enforced/surfaced in the UI.
 */
function spToEv(sp: number): number {
  return sp * 4;
}
function spsToEvs(sps: StatsTable): StatsTable {
  return {
    hp: spToEv(sps.hp), atk: spToEv(sps.atk), def: spToEv(sps.def),
    spa: spToEv(sps.spa), spd: spToEv(sps.spd), spe: spToEv(sps.spe),
  };
}

export interface CalcMoveSlot {
  name: string;
  isCrit: boolean;
  /** Explicit hit count for multi-hit moves - undefined lets the engine use its own default (see getMultihitRange) */
  hits?: number;
}

function defaultMoves(): CalcMoveSlot[] {
  return Array.from({ length: MOVE_SLOT_COUNT }, () => ({ name: '', isCrit: false }));
}

export interface CalcPokemonState {
  species: string;
  gender: GenderName | '';
  level: number;
  item: string;
  ability: string;
  nature: NatureName;
  status: StatusName | '';
  sps: StatsTable;
  boosts: StatsTable;
  moves: CalcMoveSlot[];
}

function defaultPokemonState(): CalcPokemonState {
  return {
    species: '',
    gender: '',
    level: 50,
    item: '',
    ability: '',
    nature: 'Hardy',
    status: '',
    sps: { ...ZERO_STATS },
    boosts: { ...ZERO_STATS },
    moves: defaultMoves(),
  };
}

export interface CalcSideConditions {
  spikes: number;
  isReflect: boolean;
  isLightScreen: boolean;
  isAuroraVeil: boolean;
  isFriendGuard: boolean;
  isHelpingHand: boolean;
  isSR: boolean;
  isTailwind: boolean;
  isProtected: boolean;
  isSeeded: boolean;
  isSaltCured: boolean;
  isFlowerGift: boolean;
  isBattery: boolean;
  isPowerSpot: boolean;
  isSteelySpirit: boolean;
}

function defaultSideConditions(): CalcSideConditions {
  return {
    spikes: 0,
    isReflect: false,
    isLightScreen: false,
    isAuroraVeil: false,
    isFriendGuard: false,
    isHelpingHand: false,
    isSR: false,
    isTailwind: false,
    isProtected: false,
    isSeeded: false,
    isSaltCured: false,
    isFlowerGift: false,
    isBattery: false,
    isPowerSpot: false,
    isSteelySpirit: false,
  };
}

export interface CalcFieldState {
  gameType: GameType;
  weather: Weather | '';
  terrain: Terrain | '';
  pokemon1Side: CalcSideConditions;
  pokemon2Side: CalcSideConditions;
}

function defaultFieldState(): CalcFieldState {
  return {
    gameType: 'Doubles',
    weather: '',
    terrain: '',
    pokemon1Side: defaultSideConditions(),
    pokemon2Side: defaultSideConditions(),
  };
}

export interface CalcMoveResultEntry {
  moveName: string;
  percent: string | null;
  desc: string | null;
  range: [number, number] | null;
  kochanceText: string | null;
  possibleDamages: number[];
  errorMessage: string | null;
  /** [min, max] selectable hit count if this move hits multiple times, else null */
  multihitRange: [number, number] | null;
  /** The hit count actually used for this result (engine default if the slot didn't set one) */
  effectiveHits: number | null;
}

function emptyEntry(moveName: string): CalcMoveResultEntry {
  return {
    moveName, percent: null, desc: null, range: null, kochanceText: null, possibleDamages: [],
    errorMessage: null, multihitRange: null, effectiveHits: null,
  };
}

function errorEntry(moveName: string, err: unknown): CalcMoveResultEntry {
  return {
    moveName, percent: null, desc: null, range: null, kochanceText: null, possibleDamages: [],
    errorMessage: err instanceof Error ? err.message : 'Unable to calculate damage for this matchup',
    multihitRange: null, effectiveHits: null,
  };
}

function flattenDamage(damage: number | number[] | number[][]): number[] {
  if (typeof damage === 'number') return [damage];
  if (damage.length > 0 && Array.isArray(damage[0])) return (damage as number[][]).flat();
  return damage as number[];
}

/**
 * A move's own base data (not the constructed Move instance, which always
 * resolves to a single concrete .hits) exposes "multihit" as: undefined (not
 * multi-hit), a plain number (a fixed hit count, e.g. Triple Axel/Population
 * Bomb - treated as a 1..N pick range so a partial connect can be modeled),
 * or a [min, max] tuple (e.g. Bullet Seed 2-5).
 */
function getMultihitRange(gen: Generation, moveName: string): [number, number] | null {
  const moveData = gen.moves.get(toID(moveName));
  const multihit = moveData?.multihit;
  if (multihit === undefined) return null;
  if (typeof multihit === 'number') return [1, multihit];
  return [multihit[0], multihit[1]];
}

function buildPokemon(gen: Generation, state: CalcPokemonState): InstanceType<typeof Pokemon> {
  return new Pokemon(gen, state.species, {
    level: state.level,
    gender: state.gender || undefined,
    item: state.item || undefined,
    ability: state.ability || undefined,
    nature: state.nature,
    status: state.status || undefined,
    evs: spsToEvs(state.sps),
    ivs: MAX_IVS,
    boosts: state.boosts,
  });
}

function computeSideResults(
  gen: Generation,
  attacker: CalcPokemonState,
  defender: CalcPokemonState,
  attackerSide: CalcSideConditions,
  defenderSide: CalcSideConditions,
  gameType: GameType,
  weather: Weather | '',
  terrain: Terrain | '',
): CalcMoveResultEntry[] {
  if (!attacker.species || !defender.species) {
    return attacker.moves.map(m => emptyEntry(m.name));
  }

  let atkPokemon: InstanceType<typeof Pokemon>;
  let defPokemon: InstanceType<typeof Pokemon>;
  try {
    atkPokemon = buildPokemon(gen, attacker);
    defPokemon = buildPokemon(gen, defender);
  } catch (err) {
    return attacker.moves.map(m => errorEntry(m.name, err));
  }

  const field = new Field({
    gameType,
    weather: weather || undefined,
    terrain: terrain || undefined,
    attackerSide,
    defenderSide,
  });

  return attacker.moves.map(slot => {
    if (!slot.name) return emptyEntry('');
    const multihitRange = getMultihitRange(gen, slot.name);
    try {
      const move = new Move(gen, slot.name, {
        ability: attacker.ability || undefined,
        item: attacker.item || undefined,
        species: attacker.species,
        isCrit: slot.isCrit,
        hits: slot.hits,
        overrides: getChampionsCalcMoveOverride(slot.name),
      });
      const result = calculate(gen, atkPokemon, defPokemon, move, field);
      const range = result.range();
      const maxHP = defPokemon.maxHP();
      const percent = `${((range[0] / maxHP) * 100).toFixed(1)} - ${((range[1] / maxHP) * 100).toFixed(1)}%`;
      return {
        moveName: slot.name,
        percent,
        desc: result.desc(),
        range,
        kochanceText: result.kochance().text,
        possibleDamages: [...new Set(flattenDamage(result.damage))].sort((a, b) => a - b),
        errorMessage: null,
        multihitRange,
        effectiveHits: multihitRange ? move.hits : null,
      };
    } catch (err) {
      return errorEntry(slot.name, err);
    }
  });
}

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
  pokemon1MoveOptions: string[];
  pokemon2MoveOptions: string[];
  pokemon1Formes: FormeFamily;
  pokemon2Formes: FormeFamily;
  pokemon1BaseStats: StatsTable | null;
  pokemon2BaseStats: StatsTable | null;
  p1Results: CalcMoveResultEntry[];
  p2Results: CalcMoveResultEntry[];
  selectedResult: SelectedResultRef | null;
  setSelectedResult: (ref: SelectedResultRef | null) => void;
  selectedEntry: CalcMoveResultEntry | null;
}

export function useDamageCalc(gameDataState: UseGameDataReturn): UseDamageCalcReturn {
  const [regulationId, setRegulationId] = useState<RegulationId>('REG-MA');
  const [pokemon1, setPokemon1State] = useState<CalcPokemonState>(defaultPokemonState);
  const [pokemon2, setPokemon2State] = useState<CalcPokemonState>(defaultPokemonState);
  const [field, setFieldState] = useState<CalcFieldState>(defaultFieldState);
  const [selectedResult, setSelectedResult] = useState<SelectedResultRef | null>(null);
  const [pokemon1LearnedSlugs, setPokemon1LearnedSlugs] = useState<Set<string> | null>(null);
  const [pokemon2LearnedSlugs, setPokemon2LearnedSlugs] = useState<Set<string> | null>(null);

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

  const pokemon1Formes = useMemo(() => getFormeFamily(allSpecies, pokemon1.species), [allSpecies, pokemon1.species]);
  const pokemon2Formes = useMemo(() => getFormeFamily(allSpecies, pokemon2.species), [allSpecies, pokemon2.species]);

  const pokemon1BaseStats = useMemo(
    () => (pokemon1.species ? gen.species.get(toID(pokemon1.species))?.baseStats ?? null : null),
    [gen, pokemon1.species]
  );
  const pokemon2BaseStats = useMemo(
    () => (pokemon2.species ? gen.species.get(toID(pokemon2.species))?.baseStats ?? null : null),
    [gen, pokemon2.species]
  );

  const { getEnrichedSpeciesOptions } = gameDataState;

  useEffect(() => {
    let cancelled = false;
    if (!pokemon1.species) { setPokemon1LearnedSlugs(null); return; }
    getEnrichedSpeciesOptions(pokemon1.species, pokemon1.gender || undefined)
      .then(({ moves }) => { if (!cancelled) setPokemon1LearnedSlugs(new Set(moves.map(m => normalizeMoveSlug(m.name)))); })
      .catch(() => { if (!cancelled) setPokemon1LearnedSlugs(null); });
    return () => { cancelled = true; };
  }, [pokemon1.species, pokemon1.gender, getEnrichedSpeciesOptions]);

  useEffect(() => {
    let cancelled = false;
    if (!pokemon2.species) { setPokemon2LearnedSlugs(null); return; }
    getEnrichedSpeciesOptions(pokemon2.species, pokemon2.gender || undefined)
      .then(({ moves }) => { if (!cancelled) setPokemon2LearnedSlugs(new Set(moves.map(m => normalizeMoveSlug(m.name)))); })
      .catch(() => { if (!cancelled) setPokemon2LearnedSlugs(null); });
    return () => { cancelled = true; };
  }, [pokemon2.species, pokemon2.gender, getEnrichedSpeciesOptions]);

  const pokemon1MoveOptions = useMemo(() => {
    if (!pokemon1LearnedSlugs) return moveOptions;
    const filtered = moveOptions.filter(name => pokemon1LearnedSlugs.has(normalizeMoveSlug(name)));
    return filtered.length > 0 ? filtered : moveOptions;
  }, [moveOptions, pokemon1LearnedSlugs]);
  const pokemon2MoveOptions = useMemo(() => {
    if (!pokemon2LearnedSlugs) return moveOptions;
    const filtered = moveOptions.filter(name => pokemon2LearnedSlugs.has(normalizeMoveSlug(name)));
    return filtered.length > 0 ? filtered : moveOptions;
  }, [moveOptions, pokemon2LearnedSlugs]);

  const setPokemon1 = (updates: Partial<CalcPokemonState>) => setPokemon1State(prev => ({ ...prev, ...updates }));
  const setPokemon2 = (updates: Partial<CalcPokemonState>) => setPokemon2State(prev => ({ ...prev, ...updates }));

  const setMoveAt = (side: 'p1' | 'p2', index: number, updates: Partial<CalcMoveSlot>) => {
    const setter = side === 'p1' ? setPokemon1State : setPokemon2State;
    setter(prev => ({
      ...prev,
      moves: prev.moves.map((slot, i) => (i === index ? { ...slot, ...updates } : slot)),
    }));
  };
  const setPokemon1Move = (index: number, updates: Partial<CalcMoveSlot>) => setMoveAt('p1', index, updates);
  const setPokemon2Move = (index: number, updates: Partial<CalcMoveSlot>) => setMoveAt('p2', index, updates);

  const setField = (updates: Partial<Pick<CalcFieldState, 'gameType' | 'weather' | 'terrain'>>) =>
    setFieldState(prev => ({ ...prev, ...updates }));
  const setPokemon1Side = (updates: Partial<CalcSideConditions>) =>
    setFieldState(prev => ({ ...prev, pokemon1Side: { ...prev.pokemon1Side, ...updates } }));
  const setPokemon2Side = (updates: Partial<CalcSideConditions>) =>
    setFieldState(prev => ({ ...prev, pokemon2Side: { ...prev.pokemon2Side, ...updates } }));

  const p1Results = useMemo(
    () => computeSideResults(gen, pokemon1, pokemon2, field.pokemon1Side, field.pokemon2Side, field.gameType, field.weather, field.terrain),
    [gen, pokemon1, pokemon2, field]
  );
  const p2Results = useMemo(
    () => computeSideResults(gen, pokemon2, pokemon1, field.pokemon2Side, field.pokemon1Side, field.gameType, field.weather, field.terrain),
    [gen, pokemon1, pokemon2, field]
  );

  const selectedEntry = useMemo(() => {
    if (!selectedResult) return null;
    const list = selectedResult.side === 'p1' ? p1Results : p2Results;
    return list[selectedResult.index] ?? null;
  }, [selectedResult, p1Results, p2Results]);

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
    pokemon1MoveOptions,
    pokemon2MoveOptions,
    pokemon1Formes,
    pokemon2Formes,
    pokemon1BaseStats,
    pokemon2BaseStats,
    p1Results,
    p2Results,
    selectedResult,
    setSelectedResult,
    selectedEntry,
  };
}

export { ALL_REGULATION_IDS };
export type { RegulationId };
