import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLiveCalc } from './useLiveCalc';
import type { UseGameDataReturn } from './useGameData';
import type { RegulationId } from '../utils/pokemonRules';

const ZERO_STATS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

function setup(
  overrides: { getEnrichedSpeciesOptions?: UseGameDataReturn['getEnrichedSpeciesOptions'] } = {},
  defaultRegulation: RegulationId = 'REG-MB'
) {
  const getEnrichedSpeciesOptions = overrides.getEnrichedSpeciesOptions
    ?? vi.fn().mockResolvedValue({ moves: [], abilities: [] });
  const gameDataState: UseGameDataReturn = {
    cache: null,
    isInitialized: true,
    isLoading: false,
    error: null,
    items: [],
    getMoveData: vi.fn(),
    getCachedMove: vi.fn(),
    getItemData: vi.fn(),
    getCachedItem: vi.fn(),
    getAbilityData: vi.fn(),
    getCachedAbility: vi.fn(),
    getSpeciesLearnset: vi.fn(),
    getEnrichedSpeciesOptions,
    getChampionsUsage: vi.fn(),
    getCachedChampionsUsage: vi.fn(),
    clearCache: vi.fn(),
    getUnsyncedSpecies: vi.fn(),
    markSpeciesSynced: vi.fn(),
  };

  const { result } = renderHook(() => useLiveCalc(gameDataState, defaultRegulation));
  return { result, getEnrichedSpeciesOptions };
}

describe('useLiveCalc', () => {
  it('initializes the attacker to its default state, the defender to empty species/level 50, and no observations', () => {
    const { result } = setup({}, 'REG-MA');

    expect(result.current.attacker).toEqual({
      species: '', gender: '', level: 50, item: '', ability: '', nature: 'Hardy', status: '',
      sps: ZERO_STATS, boosts: ZERO_STATS,
      moves: [{ name: '', isCrit: false }, { name: '', isCrit: false }, { name: '', isCrit: false }, { name: '', isCrit: false }],
    });
    expect(result.current.defenderSpecies).toBe('');
    expect(result.current.defenderLevel).toBe(50);
    expect(result.current.observations).toEqual([]);
  });

  it('speciesOptions is filtered to the given default regulation\'s legal roster', () => {
    const { result } = setup({}, 'REG-MA');

    expect(result.current.speciesOptions).toContain('Gengar');
    expect(result.current.speciesOptions).not.toContain('Swampert');
  });

  it('setAttacker merges a partial update without disturbing other fields', () => {
    const { result } = setup();

    act(() => result.current.setAttacker({ species: 'Gengar', level: 100 }));

    expect(result.current.attacker.species).toBe('Gengar');
    expect(result.current.attacker.level).toBe(100);
    expect(result.current.attacker.nature).toBe('Hardy');
  });

  it('setDefenderSpecies/setDefenderLevel update independently of the attacker', () => {
    const { result } = setup();

    act(() => {
      result.current.setDefenderSpecies('Garchomp');
      result.current.setDefenderLevel(75);
    });

    expect(result.current.defenderSpecies).toBe('Garchomp');
    expect(result.current.defenderLevel).toBe(75);
    expect(result.current.attacker.species).toBe('');
  });

  it('addObservation appends a default row with a stable unique id', () => {
    const { result } = setup();

    act(() => result.current.addObservation());
    act(() => result.current.addObservation());

    expect(result.current.observations).toHaveLength(2);
    expect(result.current.observations[0].id).not.toBe(result.current.observations[1].id);
    expect(result.current.observations[0]).toMatchObject({ moveName: '', damagePercent: 0, targetsHit: 2 });
  });

  it('updateObservation merges into only the targeted row', () => {
    const { result } = setup();
    act(() => result.current.addObservation());
    act(() => result.current.addObservation());
    const [first, second] = result.current.observations;

    act(() => result.current.updateObservation(first.id, { moveName: 'Shadow Ball', damagePercent: 42 }));

    expect(result.current.observations[0]).toMatchObject({ moveName: 'Shadow Ball', damagePercent: 42 });
    expect(result.current.observations[1]).toEqual(second);
  });

  it('removeObservation drops only the targeted row', () => {
    const { result } = setup();
    act(() => result.current.addObservation());
    act(() => result.current.addObservation());
    const [first, second] = result.current.observations;

    act(() => result.current.removeObservation(first.id));

    expect(result.current.observations).toEqual([second]);
  });

  it('inference stays at the full 0-32 default bound with no observations', () => {
    const { result } = setup();
    act(() => {
      result.current.setAttacker({ species: 'Gengar' });
      result.current.setDefenderSpecies('Garchomp');
    });

    expect(result.current.inference.defBound).toEqual({ min: 0, max: 32 });
    expect(result.current.inference.spdBound).toEqual({ min: 0, max: 32 });
  });

  it('flows a real observation end-to-end into Leg 1\'s engine, narrowing a bound', () => {
    const { result } = setup();
    act(() => {
      result.current.setAttacker({ species: 'Gengar' });
      result.current.setDefenderSpecies('Garchomp');
    });
    act(() => result.current.addObservation());
    const [obs] = result.current.observations;

    act(() => result.current.updateObservation(obs.id, { moveName: 'Shadow Ball', damagePercent: 36, targetsHit: 1 }));

    expect(result.current.inference.spdBound).not.toEqual({ min: 0, max: 32 });
    expect(result.current.inference.specialObservationCount).toBe(1);
    expect(result.current.inference.defBound).toEqual({ min: 0, max: 32 });
  });

  it('attackerMoveOptions is the full move list until species-learned moves resolve, then narrows to them', async () => {
    const getEnrichedSpeciesOptions = vi.fn().mockResolvedValue({
      moves: [{ name: 'shadow-ball' }, { name: 'toxic' }],
      abilities: [],
    });
    const { result } = setup({ getEnrichedSpeciesOptions });
    const fullOptions = result.current.attackerMoveOptions;
    expect(fullOptions).toContain('Shadow Ball');

    act(() => result.current.setAttacker({ species: 'Gengar' }));

    await waitFor(() => expect(result.current.attackerMoveOptions).toEqual(['Shadow Ball', 'Toxic']));
    expect(getEnrichedSpeciesOptions).toHaveBeenCalledWith('Gengar', undefined);
  });

  it('attackerMoveOptions caps to the attacker\'s real 4 moves once a set with moves is loaded, ignoring the learned movepool', async () => {
    const getEnrichedSpeciesOptions = vi.fn().mockResolvedValue({
      moves: [{ name: 'shadow-ball' }, { name: 'toxic' }, { name: 'sludge-wave' }],
      abilities: [],
    });
    const { result } = setup({ getEnrichedSpeciesOptions });

    act(() => result.current.setAttacker({ species: 'Gengar' }));
    await waitFor(() => expect(result.current.attackerMoveOptions).toEqual(['Shadow Ball', 'Sludge Wave', 'Toxic']));

    act(() => result.current.setAttacker({
      moves: [
        { name: 'Shadow Ball', isCrit: false },
        { name: 'Sludge Wave', isCrit: false },
        { name: 'Nasty Plot', isCrit: false },
        { name: '', isCrit: false },
      ],
    }));

    expect(result.current.attackerMoveOptions).toEqual(['Shadow Ball', 'Sludge Wave', 'Nasty Plot']);
  });

  it('attackerBaseStats is null with no species selected, and the real base stat table once one is', () => {
    const { result } = setup();
    expect(result.current.attackerBaseStats).toBe(null);

    act(() => result.current.setAttacker({ species: 'Gengar' }));

    expect(result.current.attackerBaseStats).toEqual({ hp: 60, atk: 65, def: 60, spa: 130, spd: 75, spe: 110 });
  });
});
