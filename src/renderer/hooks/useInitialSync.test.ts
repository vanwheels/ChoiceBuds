import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useInitialSync } from './useInitialSync';
import type { UseGameDataReturn } from './useGameData';
import type { UseSpeciesRosterReturn } from './useSpeciesRoster';
import type { UseSpriteCacheReturn } from './useSpriteCache';
import type { UseDatabaseReturn } from './useDatabase';
import type { PokeAPICacheEntry, SpeciesRosterEntry } from '../types/pokemon';
import { VGC_ITEMS } from '../config/vgcData';

vi.mock('../utils/pokemonRules', () => ({
  validateSpeciesLegality: vi.fn(),
}));

vi.mock('../services/pokeapi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/pokeapi')>();
  return { ...actual, fetchPokemonData: vi.fn() };
});

import { validateSpeciesLegality } from '../utils/pokemonRules';
import { fetchPokemonData } from '../services/pokeapi';

const mockedValidateLegality = vi.mocked(validateSpeciesLegality);
const mockedFetchPokemonData = vi.mocked(fetchPokemonData);

const CACHE_ENTRY: PokeAPICacheEntry = {
  species: 'gengar',
  pokedexNumber: 94,
  types: ['ghost', 'poison'],
  baseStats: { hp: 60, attack: 65, defense: 60, specialAttack: 130, specialDefense: 75, speed: 110 },
  spriteUrl: 'https://example.com/gengar.png',
  abilities: ['cursed-body'],
  cachedAt: Date.now(),
  expiresAt: Date.now() + 100_000,
};

function makeRosterEntry(overrides: Partial<SpeciesRosterEntry> = {}): SpeciesRosterEntry {
  return {
    name: 'Gengar',
    id: 94,
    spriteUrl: 'https://example.com/94.png',
    shinySpriteUrl: 'https://example.com/94-shiny.png',
    ...overrides,
  };
}

function makeGameDataState(overrides: Partial<UseGameDataReturn> = {}): UseGameDataReturn {
  return {
    cache: null,
    isInitialized: true,
    isLoading: false,
    error: null,
    items: [],
    getMoveData: vi.fn(),
    getCachedMove: vi.fn(),
    getItemData: vi.fn().mockResolvedValue({ spriteUrl: 'https://example.com/item.png' }),
    getCachedItem: vi.fn(),
    getAbilityData: vi.fn(),
    getCachedAbility: vi.fn(),
    getSpeciesLearnset: vi.fn(),
    getEnrichedSpeciesOptions: vi.fn().mockResolvedValue({ moves: [], abilities: [] }),
    getChampionsUsage: vi.fn(),
    getCachedChampionsUsage: vi.fn(),
    clearCache: vi.fn(),
    getUnsyncedSpecies: vi.fn().mockReturnValue([]),
    markSpeciesSynced: vi.fn(),
    ...overrides,
  } as UseGameDataReturn;
}

function makeSpeciesRosterState(overrides: Partial<UseSpeciesRosterReturn> = {}): UseSpeciesRosterReturn {
  return { roster: [makeRosterEntry()], isLoading: false, ...overrides };
}

function makeSpriteCacheState(overrides: Partial<UseSpriteCacheReturn> = {}): UseSpriteCacheReturn {
  return { resolveSprite: vi.fn(), downloadSprite: vi.fn().mockResolvedValue('/local/sprite.png'), ...overrides };
}

function makeDatabaseState(overrides: Partial<UseDatabaseReturn> = {}): UseDatabaseReturn {
  return {
    cache: null,
    isInitialized: true,
    isRevalidating: false,
    error: null,
    getCachedEntry: vi.fn().mockReturnValue(null),
    setCacheEntry: vi.fn().mockResolvedValue(true),
    isCacheEntryValid: vi.fn(),
    cleanExpiredEntries: vi.fn(),
    clearCache: vi.fn(),
    refreshCache: vi.fn(),
    ...overrides,
  };
}

function setup(overrides: {
  gameData?: Partial<UseGameDataReturn>;
  speciesRoster?: Partial<UseSpeciesRosterReturn>;
  spriteCache?: Partial<UseSpriteCacheReturn>;
  database?: Partial<UseDatabaseReturn>;
} = {}) {
  const gameDataState = makeGameDataState(overrides.gameData);
  const speciesRosterState = makeSpeciesRosterState(overrides.speciesRoster);
  const spriteCacheState = makeSpriteCacheState(overrides.spriteCache);
  const databaseState = makeDatabaseState(overrides.database);

  const { result } = renderHook(() => useInitialSync(gameDataState, speciesRosterState, spriteCacheState, databaseState));
  return { result, gameDataState, speciesRosterState, spriteCacheState, databaseState };
}

describe('useInitialSync', () => {
  beforeEach(() => {
    mockedValidateLegality.mockReset().mockReturnValue(true); // every roster entry legal by default
    mockedFetchPokemonData.mockReset().mockResolvedValue(CACHE_ENTRY);
  });

  it('reports not-done with a Starting up placeholder until every input hook is ready', () => {
    const { result } = setup({ speciesRoster: { isLoading: true, roster: [] } });

    expect(result.current.isDone).toBe(false);
    expect(result.current.progress).toEqual({ label: 'Starting up...', current: 0, total: 1 });
  });

  it('reports not-done while the species roster is still empty even if not flagged loading', () => {
    const { result } = setup({ speciesRoster: { isLoading: false, roster: [] } });
    expect(result.current.isDone).toBe(false);
  });

  it('reports not-done while gameData or the PokeAPI cache have not initialized yet', () => {
    const { result: gameDataNotReady } = setup({ gameData: { isInitialized: false } });
    expect(gameDataNotReady.current.isDone).toBe(false);

    const { result: dbNotReady } = setup({ database: { isInitialized: false } });
    expect(dbNotReady.current.isDone).toBe(false);
  });

  it('is immediately done with no network calls when nothing is unsynced', async () => {
    const getUnsyncedSpecies = vi.fn().mockReturnValue([]);
    const downloadSprite = vi.fn();
    const { result } = setup({
      gameData: { getUnsyncedSpecies },
      spriteCache: { downloadSprite },
    });

    expect(result.current.isDone).toBe(true);
    expect(downloadSprite).not.toHaveBeenCalled();
    expect(mockedFetchPokemonData).not.toHaveBeenCalled();
  });

  it('filters the roster to the legal REG-MB set before asking what is unsynced', () => {
    const illegal = makeRosterEntry({ name: 'Not-A-Real-Mon', id: 9999 });
    const legal = makeRosterEntry();
    mockedValidateLegality.mockImplementation(name => name === 'Gengar');
    const getUnsyncedSpecies = vi.fn().mockReturnValue([]);

    setup({ speciesRoster: { roster: [illegal, legal] }, gameData: { getUnsyncedSpecies } });

    expect(getUnsyncedSpecies).toHaveBeenCalledWith([legal]);
  });

  it('downloads sprites/species data/item sprites for unsynced species and marks them synced', async () => {
    const unsynced = [makeRosterEntry(), makeRosterEntry({ name: 'Rillaboom', id: 812, spriteUrl: 'https://example.com/812.png', shinySpriteUrl: 'https://example.com/812-shiny.png' })];
    const getUnsyncedSpecies = vi.fn().mockReturnValue(unsynced);
    const markSpeciesSynced = vi.fn();
    const getEnrichedSpeciesOptions = vi.fn().mockResolvedValue({ moves: [], abilities: [] });
    const downloadSprite = vi.fn().mockResolvedValue('/local/sprite.png');
    const getItemData = vi.fn().mockResolvedValue({ spriteUrl: 'https://example.com/item.png' });

    const { result } = setup({
      gameData: { getUnsyncedSpecies, markSpeciesSynced, getEnrichedSpeciesOptions, getItemData },
      spriteCache: { downloadSprite },
    });

    await waitFor(() => expect(result.current.isDone).toBe(true));

    // Both species' regular + shiny sprites downloaded
    expect(downloadSprite).toHaveBeenCalledWith('https://example.com/94.png');
    expect(downloadSprite).toHaveBeenCalledWith('https://example.com/94-shiny.png');
    expect(downloadSprite).toHaveBeenCalledWith('https://example.com/812.png');
    expect(downloadSprite).toHaveBeenCalledWith('https://example.com/812-shiny.png');

    // Species data (learnset + PokeAPICache stats) fetched for both
    expect(getEnrichedSpeciesOptions).toHaveBeenCalledWith('Gengar');
    expect(getEnrichedSpeciesOptions).toHaveBeenCalledWith('Rillaboom');
    expect(mockedFetchPokemonData).toHaveBeenCalledWith('Gengar');
    expect(mockedFetchPokemonData).toHaveBeenCalledWith('Rillaboom');

    // Every configured VGC item's sprite fetched too, and its sprite downloaded
    expect(getItemData).toHaveBeenCalledTimes(VGC_ITEMS.length);
    expect(downloadSprite).toHaveBeenCalledWith('https://example.com/item.png');

    expect(markSpeciesSynced).toHaveBeenCalledWith(['Gengar', 'Rillaboom']);
    expect(result.current.progress).toEqual({ label: 'Downloading Item Sprites', current: VGC_ITEMS.length, total: VGC_ITEMS.length });
  }, 15_000);

  it('skips re-fetching PokeAPICache species stats for a species already cached', async () => {
    const unsynced = [makeRosterEntry()];
    const getCachedEntry = vi.fn().mockReturnValue(CACHE_ENTRY); // already cached
    const setCacheEntry = vi.fn().mockResolvedValue(true);

    const { result } = setup({
      gameData: { getUnsyncedSpecies: vi.fn().mockReturnValue(unsynced) },
      database: { getCachedEntry, setCacheEntry },
    });

    await waitFor(() => expect(result.current.isDone).toBe(true));

    expect(mockedFetchPokemonData).not.toHaveBeenCalled();
    expect(setCacheEntry).not.toHaveBeenCalled();
  }, 15_000);

  it('does not skip an item with no spriteUrl (no download attempted) and still finishes the sync', async () => {
    const unsynced = [makeRosterEntry()];
    const getItemData = vi.fn().mockResolvedValue({ spriteUrl: '' });
    const downloadSprite = vi.fn().mockResolvedValue('/local/sprite.png');

    const { result } = setup({
      gameData: { getUnsyncedSpecies: vi.fn().mockReturnValue(unsynced), getItemData },
      spriteCache: { downloadSprite },
    });

    await waitFor(() => expect(result.current.isDone).toBe(true));

    // Only the species' own sprites were downloaded - no item sprite calls, since every item resolved an empty spriteUrl
    expect(downloadSprite).toHaveBeenCalledWith('https://example.com/94.png');
    expect(downloadSprite).toHaveBeenCalledWith('https://example.com/94-shiny.png');
    expect(downloadSprite).not.toHaveBeenCalledWith('');
  }, 15_000);

  it('a single failing species does not abort the rest of the sync', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unsynced = [makeRosterEntry({ name: 'Gengar' }), makeRosterEntry({ name: 'Rillaboom', id: 812, spriteUrl: 'https://example.com/812.png', shinySpriteUrl: 'https://example.com/812-shiny.png' })];
    const getEnrichedSpeciesOptions = vi.fn()
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValue({ moves: [], abilities: [] });
    const markSpeciesSynced = vi.fn();

    const { result } = setup({
      gameData: { getUnsyncedSpecies: vi.fn().mockReturnValue(unsynced), getEnrichedSpeciesOptions, markSpeciesSynced },
    });

    await waitFor(() => expect(result.current.isDone).toBe(true));

    expect(getEnrichedSpeciesOptions).toHaveBeenCalledTimes(2);
    expect(markSpeciesSynced).toHaveBeenCalledWith(['Gengar', 'Rillaboom']);
    consoleErrorSpy.mockRestore();
  }, 15_000);
});
