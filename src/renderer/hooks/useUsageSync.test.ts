import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useUsageSync } from './useUsageSync';
import type { UseGameDataReturn } from './useGameData';
import type { UseSpeciesRosterReturn } from './useSpeciesRoster';
import type { ChampionsUsageEntry, SpeciesRosterEntry } from '../types/pokemon';

vi.mock('../utils/pokemonRules', () => ({
  validateSpeciesLegality: vi.fn(),
}));

import { validateSpeciesLegality } from '../utils/pokemonRules';

const mockedValidateLegality = vi.mocked(validateSpeciesLegality);

function makeRosterEntry(overrides: Partial<SpeciesRosterEntry> = {}): SpeciesRosterEntry {
  return {
    name: 'Gengar',
    id: 94,
    spriteUrl: 'https://example.com/94.png',
    shinySpriteUrl: 'https://example.com/94-shiny.png',
    ...overrides,
  };
}

function makeUsage(overrides: Partial<ChampionsUsageEntry> = {}): ChampionsUsageEntry {
  const now = Date.now();
  return {
    species: 'gengar',
    season: 'Season M-4',
    moves: [],
    items: [],
    abilities: [],
    natures: [],
    statSpreads: [],
    columnPosition: 1,
    cachedAt: now,
    expiresAt: now + 100_000,
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
    getItemData: vi.fn(),
    getCachedItem: vi.fn(),
    getAbilityData: vi.fn(),
    getCachedAbility: vi.fn(),
    getSpeciesLearnset: vi.fn(),
    getEnrichedSpeciesOptions: vi.fn(),
    getChampionsUsage: vi.fn().mockResolvedValue(null),
    getCachedChampionsUsage: vi.fn().mockReturnValue(null),
    clearCache: vi.fn(),
    getUnsyncedSpecies: vi.fn(),
    markSpeciesSynced: vi.fn(),
    ...overrides,
  } as UseGameDataReturn;
}

function makeSpeciesRosterState(overrides: Partial<UseSpeciesRosterReturn> = {}): UseSpeciesRosterReturn {
  return { roster: [makeRosterEntry()], isLoading: false, ...overrides };
}

function setup(overrides: {
  gameData?: Partial<UseGameDataReturn>;
  speciesRoster?: Partial<UseSpeciesRosterReturn>;
} = {}) {
  const gameDataState = makeGameDataState(overrides.gameData);
  const speciesRosterState = makeSpeciesRosterState(overrides.speciesRoster);
  const { result } = renderHook(() => useUsageSync(gameDataState, speciesRosterState));
  return { result, gameDataState, speciesRosterState };
}

describe('useUsageSync', () => {
  beforeEach(() => {
    mockedValidateLegality.mockReset().mockReturnValue(true); // every roster entry legal by default
  });

  it('reports not-done while gameData is not initialized or the roster is still loading/empty', () => {
    expect(setup({ gameData: { isInitialized: false } }).result.current.isDone).toBe(false);
    expect(setup({ speciesRoster: { isLoading: true, roster: [] } }).result.current.isDone).toBe(false);
    expect(setup({ speciesRoster: { isLoading: false, roster: [] } }).result.current.isDone).toBe(false);
  });

  it('is immediately done with no fetches when every legal species already has cached usage', () => {
    const getChampionsUsage = vi.fn();
    const { result } = setup({
      gameData: { getCachedChampionsUsage: vi.fn().mockReturnValue(makeUsage()), getChampionsUsage },
    });

    expect(result.current.isDone).toBe(true);
    expect(getChampionsUsage).not.toHaveBeenCalled();
  });

  it('filters the roster to the legal REG-MB set before checking for stale usage', () => {
    const illegal = makeRosterEntry({ name: 'Not-A-Real-Mon', id: 9999 });
    const legal = makeRosterEntry();
    mockedValidateLegality.mockImplementation(name => name === 'Gengar');
    const getCachedChampionsUsage = vi.fn().mockReturnValue(makeUsage());

    setup({ speciesRoster: { roster: [illegal, legal] }, gameData: { getCachedChampionsUsage } });

    expect(getCachedChampionsUsage).toHaveBeenCalledWith('Gengar');
    expect(getCachedChampionsUsage).not.toHaveBeenCalledWith('Not-A-Real-Mon');
  });

  it('fetches usage only for species missing (or with expired) cached usage, then reports done', async () => {
    const roster = [makeRosterEntry(), makeRosterEntry({ name: 'Rillaboom', id: 812 })];
    const getCachedChampionsUsage = vi.fn(name => name === 'Rillaboom' ? makeUsage({ species: 'rillaboom' }) : null);
    const getChampionsUsage = vi.fn().mockResolvedValue(makeUsage());

    const { result } = setup({
      speciesRoster: { roster },
      gameData: { getCachedChampionsUsage, getChampionsUsage },
    });

    await waitFor(() => expect(result.current.isDone).toBe(true));

    expect(getChampionsUsage).toHaveBeenCalledTimes(1);
    expect(getChampionsUsage).toHaveBeenCalledWith('Gengar');
  });

  it('a single failing species does not abort the rest of the batch', async () => {
    const roster = [makeRosterEntry(), makeRosterEntry({ name: 'Rillaboom', id: 812 })];
    const getChampionsUsage = vi.fn()
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValue(makeUsage({ species: 'rillaboom' }));

    const { result } = setup({
      speciesRoster: { roster },
      gameData: { getChampionsUsage },
    });

    await waitFor(() => expect(result.current.isDone).toBe(true));

    expect(getChampionsUsage).toHaveBeenCalledTimes(2);
  });
});
