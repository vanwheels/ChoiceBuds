import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useGameData } from './useGameData';
import { VGC_ITEMS } from '../config/vgcData';
import { NEVER_EXPIRES } from '../utils/cacheExpiry';
import type { AbilityData, ChampionsUsageEntry, GameDataCache, MoveData, SpeciesLearnsetEntry } from '../types/pokemon';

vi.mock('../services/pokeapiService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/pokeapiService')>();
  return {
    ...actual,
    fetchMoveData: vi.fn(),
    fetchItemData: vi.fn(),
    fetchAbilityData: vi.fn(),
    fetchSpeciesLearnset: vi.fn(),
  };
});

vi.mock('../services/championsBattleData', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/championsBattleData')>();
  return { ...actual, fetchChampionsUsage: vi.fn() };
});

import { fetchMoveData, fetchItemData, fetchAbilityData, fetchSpeciesLearnset } from '../services/pokeapiService';
import { fetchChampionsUsage } from '../services/championsBattleData';

const NOW = Date.now();

function makeMove(overrides: Partial<MoveData> = {}): MoveData {
  return {
    name: 'shadow-ball',
    type: 'ghost',
    category: 'special',
    power: 80,
    pp: 15,
    accuracy: 100,
    description: 'Has a 20% chance to lower Sp. Def by 1 stage.',
    flags: [],
    target: 'selected-pokemon',
    meta: { ailment: 'none', ailmentChance: 0, flinchChance: 0, critRate: 0 },
    cachedAt: NOW,
    expiresAt: NOW + 100_000,
    ...overrides,
  };
}

function makeAbility(overrides: Partial<AbilityData> = {}): AbilityData {
  return { name: 'cursed-body', description: 'May disable a move that hits.', cachedAt: NOW, expiresAt: NOW + 100_000, ...overrides };
}

function makeLearnset(overrides: Partial<SpeciesLearnsetEntry> = {}): SpeciesLearnsetEntry {
  return {
    species: 'gengar',
    abilities: ['cursed-body'],
    moves: ['shadow-ball'],
    hasChampionsMoveData: true,
    cachedAt: NOW,
    expiresAt: NOW + 100_000,
    ...overrides,
  };
}

function makeUsage(overrides: Partial<ChampionsUsageEntry> = {}): ChampionsUsageEntry {
  return {
    species: 'gengar',
    season: 'Season M-4',
    moves: [],
    items: [],
    abilities: [],
    natures: [],
    statSpreads: [],
    cachedAt: NOW,
    expiresAt: NOW + 100_000,
    ...overrides,
  };
}

function makeCache(overrides: Partial<GameDataCache> = {}): GameDataCache {
  return {
    version: 1,
    moves: {},
    items: {},
    abilities: {},
    learnsets: {},
    usage: {},
    lastCleaned: NOW,
    lastSyncedSpeciesNames: [],
    ...overrides,
  };
}

describe('useGameData', () => {
  it('initializes an empty cache when none is persisted', async () => {
    const { result } = renderHook(() => useGameData());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    expect(result.current.cache).toEqual(expect.objectContaining({ version: 1, moves: {}, lastSyncedSpeciesNames: [] }));
  });

  it('loads a persisted cache, normalizing a legacy cache missing lastSyncedSpeciesNames', async () => {
    const legacyCache = makeCache();
    // @ts-expect-error - simulating a cache file written before the field existed
    delete legacyCache.lastSyncedSpeciesNames;
    vi.mocked(window.electron.readGameDataCache).mockResolvedValueOnce(legacyCache);

    const { result } = renderHook(() => useGameData());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    expect(result.current.cache?.lastSyncedSpeciesNames).toEqual([]);
  });

  it('falls back to an empty cache when reading throws', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(window.electron.readGameDataCache).mockRejectedValueOnce(new Error('disk error'));

    const { result } = renderHook(() => useGameData());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));
    expect(result.current.cache).toEqual(expect.objectContaining({ version: 1, moves: {} }));
    consoleErrorSpy.mockRestore();
  });

  it('persists the cache to disk once initialized', async () => {
    const { result } = renderHook(() => useGameData());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    vi.mocked(fetchAbilityData).mockResolvedValueOnce(makeAbility());
    await act(async () => {
      await result.current.getAbilityData('Cursed Body');
    });

    expect(window.electron.writeGameDataCache).toHaveBeenCalledWith(
      expect.objectContaining({ abilities: expect.objectContaining({ 'cursed-body': expect.objectContaining({ name: 'cursed-body' }) }) })
    );
  });

  describe('moves', () => {
    it('getCachedMove returns null for a miss, and applies overrides/PP-retiering to a hit', async () => {
      const cache = makeCache({ moves: { 'shadow-ball': makeMove({ pp: 15 }) } });
      vi.mocked(window.electron.readGameDataCache).mockResolvedValueOnce(cache);
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      expect(result.current.getCachedMove('missing-move')).toBeNull();
      // base pp 15 is retiered to 16 game-wide by config/championsMoveOverrides.ts
      expect(result.current.getCachedMove('Shadow Ball')?.pp).toBe(16);
    });

    it('getCachedMove treats an entry missing target/meta as a cache miss (self-heal)', async () => {
      const staleMove = makeMove();
      delete staleMove.meta; // simulating a cache entry from before `meta` existed (an optional field)
      const cache = makeCache({ moves: { 'shadow-ball': staleMove } });
      vi.mocked(window.electron.readGameDataCache).mockResolvedValueOnce(cache);
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      expect(result.current.getCachedMove('shadow-ball')).toBeNull();
    });

    it('getMoveData fetches, caches and overrides on a miss, and serves the cache on a hit', async () => {
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));
      vi.mocked(fetchMoveData).mockResolvedValueOnce(makeMove({ pp: 5 }));

      const fetched = await result.current.getMoveData('Shadow Ball');
      expect(fetchMoveData).toHaveBeenCalledWith('shadow-ball');
      expect(fetched?.pp).toBe(8); // base pp 5 -> 8 per the retier

      vi.mocked(fetchMoveData).mockClear();
      await waitFor(() => expect(result.current.getCachedMove('Shadow Ball')?.pp).toBe(8));
      expect(fetchMoveData).not.toHaveBeenCalled();
    });

    it('getMoveData returns null and records an error when the fetch throws', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));
      vi.mocked(fetchMoveData).mockRejectedValueOnce(new Error('network down'));

      const fetched = await result.current.getMoveData('Shadow Ball');
      expect(fetched).toBeNull();
      await waitFor(() => expect(result.current.error).toBe('network down'));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('items', () => {
    it('getCachedItem treats an entry with an empty spriteUrl (a synthesized placeholder) as a miss', async () => {
      const cache = makeCache({ items: { 'life-orb': { name: 'life-orb', category: 'held-items', effect: '', description: '', spriteUrl: '', cachedAt: NOW, expiresAt: NEVER_EXPIRES } } });
      vi.mocked(window.electron.readGameDataCache).mockResolvedValueOnce(cache);
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      expect(result.current.getCachedItem('Life Orb')).toBeNull();
    });

    it('getItemData caches a real fetched item so a later call hits the cache', async () => {
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));
      const item = { name: 'life-orb', category: 'held-items', effect: 'Boosts power, costs HP.', description: '', spriteUrl: 'https://example.com/life-orb.png', cachedAt: NOW, expiresAt: NEVER_EXPIRES };
      vi.mocked(fetchItemData).mockResolvedValueOnce(item);

      const fetched = await result.current.getItemData('Life Orb');
      expect(fetched).toEqual(item);

      vi.mocked(fetchItemData).mockClear();
      await waitFor(() => expect(result.current.getCachedItem('Life Orb')).toEqual(item));
      expect(fetchItemData).not.toHaveBeenCalled();
    });

    it('synthesizes a placeholder for every VGC-legal item PokeAPI has no data for, excluding them from the live items list', async () => {
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));
      // fetchItemData is unmocked here, so every call resolves undefined - the "PokeAPI doesn't have this item" case
      await waitFor(() => expect(Object.keys(result.current.cache?.items ?? {}).length).toBe(VGC_ITEMS.length));

      expect(result.current.items).toEqual([]);
    });
  });

  describe('abilities', () => {
    it('applies the Champions override text to a known ability', async () => {
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));
      vi.mocked(fetchAbilityData).mockResolvedValueOnce(makeAbility({ name: 'healer', description: 'mainline SV text' }));

      const fetched = await result.current.getAbilityData('Healer');
      expect(fetched?.description).toContain('50% chance to heal an adjacent ally');
    });

    it('leaves an ability with no override untouched', async () => {
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));
      vi.mocked(fetchAbilityData).mockResolvedValueOnce(makeAbility());

      const fetched = await result.current.getAbilityData('Cursed Body');
      expect(fetched?.description).toBe('May disable a move that hits.');
    });
  });

  describe('species learnsets', () => {
    it('does not apply hand-curated movepool changes once PokeAPI has its own champions move data', async () => {
      const cache = makeCache({ learnsets: { gengar: makeLearnset({ moves: ['shadow-ball', 'tera-blast'], hasChampionsMoveData: true }) } });
      vi.mocked(window.electron.readGameDataCache).mockResolvedValueOnce(cache);
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      const learnset = await result.current.getSpeciesLearnset('gengar');
      expect(learnset?.moves).toEqual(['shadow-ball', 'tera-blast']);
    });

    it('applies the globally-removed-moves correction when PokeAPI has no champions move data yet', async () => {
      const cache = makeCache({ learnsets: { gengar: makeLearnset({ moves: ['shadow-ball', 'tera-blast'], hasChampionsMoveData: false }) } });
      vi.mocked(window.electron.readGameDataCache).mockResolvedValueOnce(cache);
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      const learnset = await result.current.getSpeciesLearnset('gengar');
      expect(learnset?.moves).toEqual(['shadow-ball']); // tera-blast stripped
    });

    it('treats a cache entry predating hasChampionsMoveData as a miss and re-fetches', async () => {
      const staleLearnset = makeLearnset();
      // @ts-expect-error - simulating a cache entry from before the field existed
      delete staleLearnset.hasChampionsMoveData;
      const cache = makeCache({ learnsets: { gengar: staleLearnset } });
      vi.mocked(window.electron.readGameDataCache).mockResolvedValueOnce(cache);
      vi.mocked(fetchSpeciesLearnset).mockResolvedValueOnce(makeLearnset({ hasChampionsMoveData: false, moves: ['shadow-ball', 'tera-blast'] }));

      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      const learnset = await result.current.getSpeciesLearnset('gengar');
      expect(fetchSpeciesLearnset).toHaveBeenCalledWith('gengar', undefined);
      expect(learnset?.moves).toEqual(['shadow-ball']); // re-fetched, then movepool-corrected
    });
  });

  describe('getEnrichedSpeciesOptions', () => {
    it('resolves the full move/ability data for a species learnset', async () => {
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));
      vi.mocked(fetchSpeciesLearnset).mockResolvedValueOnce(makeLearnset({ moves: ['shadow-ball'], abilities: ['cursed-body'] }));
      vi.mocked(fetchMoveData).mockResolvedValueOnce(makeMove());
      vi.mocked(fetchAbilityData).mockResolvedValueOnce(makeAbility());
      // note: getEnrichedSpeciesOptions only ever reads cached usage (getCachedChampionsUsage),
      // never triggers a live fetchChampionsUsage call - nothing to mock here

      const options = await result.current.getEnrichedSpeciesOptions('gengar');
      expect(options.moves.map(m => m.name)).toEqual(['shadow-ball']);
      expect(options.abilities.map(a => a.name)).toEqual(['cursed-body']);
    });

    it('returns empty moves/abilities when the species has no learnset', async () => {
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));
      vi.mocked(fetchSpeciesLearnset).mockResolvedValueOnce(null);

      const options = await result.current.getEnrichedSpeciesOptions('missingno');
      expect(options).toEqual({ moves: [], abilities: [] });
    });

    it('sorts by cached Champions usage percentage, overriding learnset order', async () => {
      const cache = makeCache({
        usage: {
          gengar: makeUsage({
            moves: [{ name: 'Shadow Ball', percentage: 10 }, { name: 'Protect', percentage: 90 }],
            abilities: [{ name: 'Cursed Body', percentage: 100 }],
          }),
        },
      });
      vi.mocked(window.electron.readGameDataCache).mockResolvedValueOnce(cache);
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      vi.mocked(fetchSpeciesLearnset).mockResolvedValueOnce(makeLearnset({ moves: ['shadow-ball', 'protect'], abilities: ['cursed-body'] }));
      vi.mocked(fetchMoveData).mockImplementation(async (name: string) => makeMove({ name, category: 'status' }));
      vi.mocked(fetchAbilityData).mockResolvedValueOnce(makeAbility());

      const options = await result.current.getEnrichedSpeciesOptions('gengar');
      expect(options.moves.map(m => m.name)).toEqual(['protect', 'shadow-ball']);
    });
  });

  describe('Champions usage', () => {
    it('getChampionsUsage serves the cache without fetching on a hit', async () => {
      const cache = makeCache({ usage: { gengar: makeUsage() } });
      vi.mocked(window.electron.readGameDataCache).mockResolvedValueOnce(cache);
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      const usage = await result.current.getChampionsUsage('gengar');
      expect(usage).toEqual(makeUsage());
      expect(fetchChampionsUsage).not.toHaveBeenCalled();
    });

    it('getChampionsUsage fetches and caches on a miss, keyed by gender-suffix-stripped species', async () => {
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));
      vi.mocked(fetchChampionsUsage).mockResolvedValueOnce(makeUsage());

      const usage = await result.current.getChampionsUsage('Gengar');
      expect(fetchChampionsUsage).toHaveBeenCalledWith('Gengar');
      expect(usage).toEqual(makeUsage());
      await waitFor(() => expect(result.current.getCachedChampionsUsage('gengar')).toEqual(makeUsage()));
    });

    it('a null usage result (no Champions usage page) is not an error', async () => {
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));
      vi.mocked(fetchChampionsUsage).mockResolvedValueOnce(null);

      const usage = await result.current.getChampionsUsage('missingno');
      expect(usage).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  describe('sync tracking', () => {
    it('getUnsyncedSpecies filters out already-synced species by name', async () => {
      const cache = makeCache({ lastSyncedSpeciesNames: ['Gengar'] });
      vi.mocked(window.electron.readGameDataCache).mockResolvedValueOnce(cache);
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      const roster = [
        { name: 'Gengar', id: 94, spriteUrl: '', shinySpriteUrl: '' },
        { name: 'Rillaboom', id: 812, spriteUrl: '', shinySpriteUrl: '' },
      ];
      expect(result.current.getUnsyncedSpecies(roster).map(s => s.name)).toEqual(['Rillaboom']);
    });

    it('markSpeciesSynced merges new names into the synced set without duplicates', async () => {
      const cache = makeCache({ lastSyncedSpeciesNames: ['Gengar'] });
      vi.mocked(window.electron.readGameDataCache).mockResolvedValueOnce(cache);
      const { result } = renderHook(() => useGameData());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      act(() => result.current.markSpeciesSynced(['Gengar', 'Rillaboom']));

      await waitFor(() => expect(result.current.cache?.lastSyncedSpeciesNames).toEqual(['Gengar', 'Rillaboom']));
    });
  });

  it('clearCache resets to a fresh empty cache', async () => {
    const cache = makeCache({ moves: { 'shadow-ball': makeMove() } });
    vi.mocked(window.electron.readGameDataCache).mockResolvedValueOnce(cache);
    const { result } = renderHook(() => useGameData());
    await waitFor(() => expect(result.current.isInitialized).toBe(true));

    await act(async () => {
      await result.current.clearCache();
    });

    expect(result.current.cache?.moves).toEqual({});
  });
});
