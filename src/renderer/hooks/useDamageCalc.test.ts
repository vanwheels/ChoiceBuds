import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDamageCalc } from './useDamageCalc';
import type { UseGameDataReturn } from './useGameData';
import type { RegulationId } from '../utils/pokemonRules';

const ZERO_STATS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

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

  const { result } = renderHook(() => useDamageCalc(gameDataState, defaultRegulation));
  return { result, getEnrichedSpeciesOptions };
}

describe('useDamageCalc', () => {
  it('initializes both Pokemon/field slots to their defaults, keyed off the given default regulation', () => {
    const { result } = setup({}, 'REG-MA');

    expect(result.current.regulationId).toBe('REG-MA');
    expect(result.current.pokemon1).toEqual({
      species: '', gender: '', level: 50, item: '', ability: '', nature: 'Hardy', status: '',
      sps: ZERO_STATS, boosts: ZERO_STATS,
      moves: [{ name: '', isCrit: false }, { name: '', isCrit: false }, { name: '', isCrit: false }, { name: '', isCrit: false }],
    });
    expect(result.current.pokemon2).toEqual(result.current.pokemon1);
    expect(result.current.field.gameType).toBe('Doubles');
    expect(result.current.field.weather).toBe('');
    expect(result.current.field.terrain).toBe('');
    expect(result.current.field.pokemon1Side.spikes).toBe(0);
    expect(result.current.field.pokemon1Side.isReflect).toBe(false);
    expect(result.current.selectedResult).toBe(null);
    expect(result.current.selectedEntry).toBe(null);
  });

  it('speciesOptions is filtered to the selected regulation\'s legal roster', () => {
    const { result } = setup({}, 'REG-MA');

    // Gengar is REG-MA-legal; Swampert is only added in REG-MB; Mewtwo (a
    // Legendary) is on neither regulation's allowlist.
    expect(result.current.speciesOptions).toContain('Gengar');
    expect(result.current.speciesOptions).not.toContain('Swampert');
    expect(result.current.speciesOptions).not.toContain('Mewtwo');

    act(() => result.current.setRegulationId('REG-MB'));

    expect(result.current.speciesOptions).toContain('Gengar');
    expect(result.current.speciesOptions).toContain('Swampert');
    expect(result.current.speciesOptions).not.toContain('Mewtwo');
  });

  it('itemOptions/abilityOptions/natureOptions are sorted and sourced from @smogon/calc\'s real Gen 9 data', () => {
    const { result } = setup();

    expect(result.current.itemOptions).toContain('Life Orb');
    expect(result.current.itemOptions).toEqual([...result.current.itemOptions].sort());
    expect(result.current.abilityOptions).toContain('Levitate');
    expect(result.current.abilityOptions).toEqual([...result.current.abilityOptions].sort());
    expect(result.current.natureOptions).toContain('Timid');
    expect(result.current.natureOptions).toEqual([...result.current.natureOptions].sort());
  });

  it('setPokemon1/setPokemon2 merge a partial update without disturbing other fields', () => {
    const { result } = setup();

    act(() => result.current.setPokemon1({ species: 'Gengar', level: 100 }));

    expect(result.current.pokemon1.species).toBe('Gengar');
    expect(result.current.pokemon1.level).toBe(100);
    expect(result.current.pokemon1.nature).toBe('Hardy');
    expect(result.current.pokemon2.species).toBe('');
  });

  it('setPokemon1Move/setPokemon2Move update only the targeted slot', () => {
    const { result } = setup();

    act(() => result.current.setPokemon1Move(1, { name: 'Shadow Ball', isCrit: true }));

    expect(result.current.pokemon1.moves[0]).toEqual({ name: '', isCrit: false });
    expect(result.current.pokemon1.moves[1]).toEqual({ name: 'Shadow Ball', isCrit: true });
    expect(result.current.pokemon1.moves[2]).toEqual({ name: '', isCrit: false });
    expect(result.current.pokemon2.moves[1]).toEqual({ name: '', isCrit: false });
  });

  it('setField merges gameType/weather/terrain without touching side conditions', () => {
    const { result } = setup();
    act(() => result.current.setPokemon1Side({ isTailwind: true }));

    act(() => result.current.setField({ weather: 'Rain', terrain: 'Electric' }));

    expect(result.current.field.weather).toBe('Rain');
    expect(result.current.field.terrain).toBe('Electric');
    expect(result.current.field.gameType).toBe('Doubles');
    expect(result.current.field.pokemon1Side.isTailwind).toBe(true);
  });

  it('setPokemon1Side/setPokemon2Side merge into their own side only', () => {
    const { result } = setup();

    act(() => result.current.setPokemon1Side({ spikes: 2, isReflect: true }));

    expect(result.current.field.pokemon1Side.spikes).toBe(2);
    expect(result.current.field.pokemon1Side.isReflect).toBe(true);
    expect(result.current.field.pokemon2Side.spikes).toBe(0);
  });

  it('pokemon*BaseStats is null with no species selected, and the real base stat table once one is', () => {
    const { result } = setup();
    expect(result.current.pokemon1BaseStats).toBe(null);

    act(() => result.current.setPokemon1({ species: 'Gengar' }));

    expect(result.current.pokemon1BaseStats).toEqual({ hp: 60, atk: 65, def: 60, spa: 130, spd: 75, spe: 110 });
  });

  it('pokemon*NatureEffect is empty for a genuinely neutral nature and the real plus/minus otherwise', () => {
    const { result } = setup();

    expect(result.current.pokemon1NatureEffect).toEqual({});

    act(() => result.current.setPokemon1({ nature: 'Timid' }));

    expect(result.current.pokemon1NatureEffect).toEqual({ plus: 'spe', minus: 'atk' });
  });

  it('pokemon*Speed/BoostedStats are null until a species is selected', () => {
    const { result } = setup();
    expect(result.current.pokemon1Speed).toBe(null);
    expect(result.current.pokemon1BoostedStats).toBe(null);
  });

  it('computes boosted stats as base+SPs+nature with no boosts/weather/status applied', () => {
    const { result } = setup();
    act(() => result.current.setPokemon1({ species: 'Gengar' }));

    // Gengar, level 50, 0 SPs, neutral nature, max IVs - a known @smogon/calc value.
    expect(result.current.pokemon1BoostedStats?.spe).toBe(130);
    expect(result.current.pokemon1Speed).toBe(130);
  });

  it('applies a stat-stage boost multiplier, floored', () => {
    const { result } = setup();
    act(() => result.current.setPokemon1({ species: 'Gengar' }));

    act(() => result.current.setPokemon1({ boosts: { ...ZERO_STATS, atk: 2 } }));
    expect(result.current.pokemon1BoostedStats?.atk).toBe(170); // floor(85 * 2)

    act(() => result.current.setPokemon1({ boosts: { ...ZERO_STATS, atk: -2 } }));
    expect(result.current.pokemon1BoostedStats?.atk).toBe(42); // floor(85 * 0.5)
  });

  it('doubles Speed for a weather-boosting ability that matches the active field weather', () => {
    const { result } = setup();
    act(() => result.current.setPokemon1({ species: 'Gengar', ability: 'Swift Swim' }));
    act(() => result.current.setField({ weather: 'Rain' }));

    expect(result.current.pokemon1Speed).toBe(260); // floor(130 * 2)
  });

  it('does not boost Speed when the weather-boosting ability does not match the active weather', () => {
    const { result } = setup();
    act(() => result.current.setPokemon1({ species: 'Gengar', ability: 'Swift Swim' }));
    act(() => result.current.setField({ weather: 'Sun' }));

    expect(result.current.pokemon1Speed).toBe(130);
  });

  it('halves Speed for paralysis', () => {
    const { result } = setup();
    act(() => result.current.setPokemon1({ species: 'Gengar', status: 'par' }));

    expect(result.current.pokemon1Speed).toBe(65); // floor(130 / 2)
  });

  it('applies weather-boost before paralysis-halving, matching in-game modifier order', () => {
    const { result } = setup();
    act(() => result.current.setPokemon1({ species: 'Gengar', ability: 'Swift Swim', status: 'par' }));
    act(() => result.current.setField({ weather: 'Rain' }));

    expect(result.current.pokemon1Speed).toBe(130); // floor(floor(130 * 2) / 2)
  });

  it('pokemon*Formes is empty for no species, and includes the real Mega siblings for a Mega-capable species', () => {
    const { result } = setup();
    expect(result.current.pokemon1Formes).toEqual({ root: '', statFormes: [], megaFormes: [] });

    act(() => result.current.setPokemon1({ species: 'Charizard' }));

    expect(result.current.pokemon1Formes.root).toBe('Charizard');
    expect(result.current.pokemon1Formes.megaFormes).toEqual(
      expect.arrayContaining(['Charizard-Mega-X', 'Charizard-Mega-Y'])
    );
  });

  it('p1Results/p2Results are 4 empty entries per side until both species are set', () => {
    const { result } = setup();

    expect(result.current.p1Results).toHaveLength(4);
    expect(result.current.p1Results.every(e => e.percent === null && e.errorMessage === null)).toBe(true);

    act(() => result.current.setPokemon1({ species: 'Gengar' }));
    // p2 still has no species - still empty entries for both sides.
    expect(result.current.p1Results.every(e => e.percent === null)).toBe(true);
    expect(result.current.p2Results.every(e => e.percent === null)).toBe(true);
  });

  it('calculates a real damage result once both sides and a move are set', () => {
    const { result } = setup();
    act(() => {
      result.current.setPokemon1({ species: 'Gengar' });
      result.current.setPokemon2({ species: 'Garchomp' });
    });
    act(() => result.current.setPokemon1Move(0, { name: 'Shadow Ball' }));

    const entry = result.current.p1Results[0];
    expect(entry.errorMessage).toBe(null);
    expect(entry.range).toEqual([66, 78]);
    expect(entry.percent).toBe('36.1 - 42.6%');
    expect(entry.desc).toContain('Shadow Ball');
    expect(entry.kochanceText).toBe('guaranteed 3HKO');
    expect(entry.possibleDamages).toEqual([66, 67, 69, 70, 72, 73, 75, 76, 78]);
    expect(entry.multihitRange).toBe(null);
    expect(entry.effectiveHits).toBe(null);
  });

  it('a crit slot produces a higher damage range than the same move without it', () => {
    const { result } = setup();
    act(() => {
      result.current.setPokemon1({ species: 'Gengar' });
      result.current.setPokemon2({ species: 'Garchomp' });
    });
    act(() => result.current.setPokemon1Move(0, { name: 'Shadow Ball', isCrit: true }));

    expect(result.current.p1Results[0].range).toEqual([99, 117]);
  });

  it('exposes a multihit move\'s selectable hit-count range and the engine-chosen default hit count', () => {
    const { result } = setup();
    act(() => {
      result.current.setPokemon1({ species: 'Gengar' });
      result.current.setPokemon2({ species: 'Garchomp' });
    });
    act(() => result.current.setPokemon1Move(0, { name: 'Bullet Seed' }));

    const entry = result.current.p1Results[0];
    expect(entry.multihitRange).toEqual([2, 5]);
    expect(entry.effectiveHits).not.toBe(null);
    expect(entry.effectiveHits).toBeGreaterThanOrEqual(2);
    expect(entry.effectiveHits).toBeLessThanOrEqual(5);
  });

  it('an explicit hit count on the move slot overrides the engine default', () => {
    const { result } = setup();
    act(() => {
      result.current.setPokemon1({ species: 'Gengar' });
      result.current.setPokemon2({ species: 'Garchomp' });
    });
    act(() => result.current.setPokemon1Move(0, { name: 'Bullet Seed', hits: 3 }));

    expect(result.current.p1Results[0].effectiveHits).toBe(3);
  });

  it('an unresolvable species produces an error entry for every move slot on that side', () => {
    const { result } = setup();
    act(() => {
      result.current.setPokemon1({ species: 'Not A Real Species At All' });
      result.current.setPokemon2({ species: 'Garchomp' });
    });
    act(() => result.current.setPokemon1Move(0, { name: 'Shadow Ball' }));

    const entry = result.current.p1Results[0];
    expect(entry.moveName).toBe('Shadow Ball');
    expect(entry.errorMessage).toEqual(expect.any(String));
    expect(entry.percent).toBe(null);
    expect(entry.range).toBe(null);
  });

  it('setSelectedResult/selectedEntry track the chosen result, and an out-of-range index yields null', () => {
    const { result } = setup();
    act(() => {
      result.current.setPokemon1({ species: 'Gengar' });
      result.current.setPokemon2({ species: 'Garchomp' });
    });
    act(() => result.current.setPokemon1Move(0, { name: 'Shadow Ball' }));

    act(() => result.current.setSelectedResult({ side: 'p1', index: 0 }));
    expect(result.current.selectedEntry).toBe(result.current.p1Results[0]);

    act(() => result.current.setSelectedResult({ side: 'p1', index: 99 }));
    expect(result.current.selectedEntry).toBe(null);

    act(() => result.current.setSelectedResult(null));
    expect(result.current.selectedEntry).toBe(null);
  });

  it('pokemon1MoveOptions is the full move list (same reference) while no species is selected', () => {
    const { result } = setup();
    const fullOptions = result.current.pokemon1MoveOptions;

    expect(fullOptions).toContain('Shadow Ball');
    expect(result.current.pokemon1MoveOptions).toBe(fullOptions);
  });

  it('filters pokemon1MoveOptions down to the species\' learned moves once the fetch resolves', async () => {
    const getEnrichedSpeciesOptions = vi.fn().mockResolvedValue({
      moves: [{ name: 'shadow-ball' }, { name: 'toxic' }],
      abilities: [],
    });
    const { result } = setup({ getEnrichedSpeciesOptions });

    act(() => result.current.setPokemon1({ species: 'Gengar' }));

    await waitFor(() => expect(result.current.pokemon1MoveOptions).toEqual(['Shadow Ball', 'Toxic']));
    expect(getEnrichedSpeciesOptions).toHaveBeenCalledWith('Gengar', undefined);
  });

  it('falls back to the full move list when the learned set does not intersect any real move name', async () => {
    const getEnrichedSpeciesOptions = vi.fn().mockResolvedValue({
      moves: [{ name: 'totally-fake-move-xyz' }],
      abilities: [],
    });
    const { result } = setup({ getEnrichedSpeciesOptions });
    const fullOptions = result.current.pokemon1MoveOptions;

    act(() => result.current.setPokemon1({ species: 'Gengar' }));

    await waitFor(() => expect(result.current.pokemon1MoveOptions).toBe(fullOptions));
  });

  it('falls back to the full move list when the learnset fetch rejects', async () => {
    const getEnrichedSpeciesOptions = vi.fn().mockRejectedValue(new Error('network down'));
    const { result } = setup({ getEnrichedSpeciesOptions });
    const fullOptions = result.current.pokemon1MoveOptions;

    act(() => result.current.setPokemon1({ species: 'Gengar' }));
    // First let the filtered set actually apply so this isn't just "never changed".
    await waitFor(() => expect(getEnrichedSpeciesOptions).toHaveBeenCalled());

    await waitFor(() => expect(result.current.pokemon1MoveOptions).toBe(fullOptions));
  });

  it('clearing the species back out immediately reverts to the unfiltered move list', async () => {
    const getEnrichedSpeciesOptions = vi.fn().mockResolvedValue({
      moves: [{ name: 'shadow-ball' }],
      abilities: [],
    });
    const { result } = setup({ getEnrichedSpeciesOptions });
    const fullOptions = result.current.pokemon1MoveOptions;

    act(() => result.current.setPokemon1({ species: 'Gengar' }));
    await waitFor(() => expect(result.current.pokemon1MoveOptions).toEqual(['Shadow Ball']));

    act(() => result.current.setPokemon1({ species: '' }));

    expect(result.current.pokemon1MoveOptions).toBe(fullOptions);
  });

  it('ignores a stale in-flight learnset fetch once a newer species change has superseded it', async () => {
    const staleFetch = createDeferred<{ moves: { name: string }[]; abilities: never[] }>();
    const freshFetch = createDeferred<{ moves: { name: string }[]; abilities: never[] }>();
    const getEnrichedSpeciesOptions = vi.fn()
      .mockReturnValueOnce(staleFetch.promise)
      .mockReturnValueOnce(freshFetch.promise);
    const { result } = setup({ getEnrichedSpeciesOptions });

    act(() => result.current.setPokemon1({ species: 'Gengar' }));
    act(() => result.current.setPokemon1({ species: 'Rillaboom' }));

    // The stale (Gengar) fetch resolves after the species has already moved on to Rillaboom.
    await act(async () => { staleFetch.resolve({ moves: [{ name: 'shadow-ball' }], abilities: [] }); });
    expect(result.current.pokemon1MoveOptions).not.toEqual(['Shadow Ball']);

    await act(async () => { freshFetch.resolve({ moves: [{ name: 'grassy-glide' }], abilities: [] }); });
    await waitFor(() => expect(result.current.pokemon1MoveOptions).toEqual(['Grassy Glide']));
  });
});
