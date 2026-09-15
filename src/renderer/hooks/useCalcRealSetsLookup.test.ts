import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCalcRealSetsLookup } from './useCalcRealSetsLookup';
import type { UseVgcPastesCacheReturn } from './useVgcPastesCache';
import type { UseVgcRealSetsCacheReturn } from './useVgcRealSetsCache';
import type { VgcPasteTeamRow, VgcRealSetsEntry } from '../types/pokemon';

const REGULATION = 'Reg M-C' as const;

function makeRow(overrides: Partial<VgcPasteTeamRow> = {}): VgcPasteTeamRow {
  return {
    id: 'MC1', description: '', owner: '', tournament: '', rank: '', date: '',
    pokepasteUrl: 'https://pokepast.es/abc123', species: ['Incineroar'],
    linkToSource: '', reportVideo: '', otherLinks: '',
    ...overrides,
  };
}

function makeEntry(overrides: Partial<VgcRealSetsEntry> = {}): VgcRealSetsEntry {
  return { species: 'incineroar', sampledTeamCount: 1, bundles: [], fetchedAt: 0, ...overrides };
}

function makePastesState(overrides: Partial<UseVgcPastesCacheReturn> = {}): UseVgcPastesCacheReturn {
  return {
    cache: null, isInitialized: true, isRefreshing: false, error: null,
    getRows: vi.fn().mockReturnValue([]),
    getLastFetchedAt: vi.fn().mockReturnValue(null),
    refresh: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeRealSetsState(overrides: Partial<UseVgcRealSetsCacheReturn> = {}): UseVgcRealSetsCacheReturn {
  return {
    cache: null, isInitialized: true, isLoading: false, error: null,
    getCachedRealSets: vi.fn().mockReturnValue(null),
    getRealSets: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

describe('useCalcRealSetsLookup', () => {
  it('does nothing when the regulation catalog has no rows yet', async () => {
    const pastesState = makePastesState({ getRows: vi.fn().mockReturnValue([]) });
    const realSetsState = makeRealSetsState();
    const { result } = renderHook(() => useCalcRealSetsLookup(REGULATION, pastesState, realSetsState));

    await act(async () => { await result.current.lookup('Incineroar'); });

    expect(realSetsState.getRealSets).not.toHaveBeenCalled();
    expect(result.current.entry).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets isLoading true while a lookup against non-empty rows is in flight', async () => {
    const rows = [makeRow()];
    const pastesState = makePastesState({ getRows: vi.fn().mockReturnValue(rows) });
    let resolveGetRealSets: (entry: VgcRealSetsEntry | null) => void = () => {};
    const realSetsState = makeRealSetsState({
      getRealSets: vi.fn().mockReturnValue(new Promise(resolve => { resolveGetRealSets = resolve; })),
    });
    const { result } = renderHook(() => useCalcRealSetsLookup(REGULATION, pastesState, realSetsState));

    let lookupPromise!: Promise<void>;
    act(() => { lookupPromise = result.current.lookup('Incineroar'); });
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    act(() => resolveGetRealSets(makeEntry()));
    await act(async () => { await lookupPromise; });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.entry).toEqual(makeEntry());
  });

  it('sets error to the shared hook\'s error when getRealSets resolves null against non-empty rows', async () => {
    const rows = [makeRow()];
    const pastesState = makePastesState({ getRows: vi.fn().mockReturnValue(rows) });
    const realSetsState = makeRealSetsState({
      getRealSets: vi.fn().mockResolvedValue(null),
      error: 'network exploded',
    });
    const { result } = renderHook(() => useCalcRealSetsLookup(REGULATION, pastesState, realSetsState));

    await act(async () => { await result.current.lookup('Incineroar'); });

    expect(result.current.error).toBe('network exploded');
    expect(result.current.entry).toBeNull();
  });

  it('falls back to a generic error message when the shared hook has no error text either', async () => {
    const rows = [makeRow()];
    const pastesState = makePastesState({ getRows: vi.fn().mockReturnValue(rows) });
    const realSetsState = makeRealSetsState({ getRealSets: vi.fn().mockResolvedValue(null), error: null });
    const { result } = renderHook(() => useCalcRealSetsLookup(REGULATION, pastesState, realSetsState));

    await act(async () => { await result.current.lookup('Incineroar'); });

    expect(result.current.error).toBe('Failed to load real sets for "Incineroar"');
  });

  it('refreshCatalogAndRetry retries the lookup only when the catalog refresh succeeds', async () => {
    const pastesState = makePastesState({
      getRows: vi.fn().mockReturnValue([makeRow()]),
      refresh: vi.fn().mockResolvedValue(false),
    });
    const realSetsState = makeRealSetsState();
    const { result } = renderHook(() => useCalcRealSetsLookup(REGULATION, pastesState, realSetsState));

    await act(async () => { await result.current.refreshCatalogAndRetry('Incineroar'); });

    expect(pastesState.refresh).toHaveBeenCalledWith(REGULATION);
    expect(realSetsState.getRealSets).not.toHaveBeenCalled();
  });

  it('a superseded lookup does not clobber a later, faster one\'s result', async () => {
    const rows = [makeRow()];
    const pastesState = makePastesState({ getRows: vi.fn().mockReturnValue(rows) });
    let resolveFirst: (entry: VgcRealSetsEntry | null) => void = () => {};
    const firstPromise = new Promise<VgcRealSetsEntry | null>(resolve => { resolveFirst = resolve; });
    const realSetsState = makeRealSetsState({
      getRealSets: vi.fn()
        .mockReturnValueOnce(firstPromise)
        .mockResolvedValueOnce(makeEntry({ species: 'charizard' })),
    });
    const { result } = renderHook(() => useCalcRealSetsLookup(REGULATION, pastesState, realSetsState));

    let firstLookup!: Promise<void>;
    act(() => { firstLookup = result.current.lookup('Incineroar'); });
    await act(async () => { await result.current.lookup('Charizard'); });
    act(() => resolveFirst(makeEntry({ species: 'incineroar' })));
    await act(async () => { await firstLookup; });

    expect(result.current.entry).toEqual(makeEntry({ species: 'charizard' }));
  });
});
