import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSpeciesStatsPrefetch } from './useSpeciesStatsPrefetch';
import type { UseSpeciesRosterReturn } from './useSpeciesRoster';
import type { UseDatabaseReturn } from './useDatabase';

vi.mock('../utils/pokemonRules', () => ({
  validateSpeciesLegality: vi.fn((name: string) => name !== 'illegal'),
  LATEST_REGULATION_ID: 'REG-MC',
}));
vi.mock('./useInitialSync', () => ({ syncSpeciesStats: vi.fn().mockResolvedValue(undefined) }));

import { syncSpeciesStats } from './useInitialSync';
const mockedSync = vi.mocked(syncSpeciesStats);

const roster = (names: string[]) =>
  ({ roster: names.map(name => ({ name })), isLoading: false }) as unknown as UseSpeciesRosterReturn;
const db = (cached: string[], isInitialized = true) =>
  ({ isInitialized, getCachedEntry: (k: string) => (cached.includes(k) ? {} : null) }) as unknown as UseDatabaseReturn;

describe('useSpeciesStatsPrefetch', () => {
  beforeEach(() => mockedSync.mockClear());

  it('fetches only legal species missing a cache entry', async () => {
    renderHook(() => useSpeciesStatsPrefetch(roster(['gengar', 'pikachu', 'illegal']), db(['pikachu'])));
    await waitFor(() => expect(mockedSync).toHaveBeenCalledTimes(1));
    expect(mockedSync.mock.calls[0][0]).toBe('gengar');
  });

  it('waits for the database to initialize', () => {
    renderHook(() => useSpeciesStatsPrefetch(roster(['gengar']), db([], false)));
    expect(mockedSync).not.toHaveBeenCalled();
  });

  it('runs only one pass per session', async () => {
    const { rerender } = renderHook(
      ({ r }) => useSpeciesStatsPrefetch(r, db([])),
      { initialProps: { r: roster(['gengar']) } }
    );
    await waitFor(() => expect(mockedSync).toHaveBeenCalledTimes(1));
    rerender({ r: roster(['gengar', 'mew']) });
    expect(mockedSync).toHaveBeenCalledTimes(1);
  });
});
