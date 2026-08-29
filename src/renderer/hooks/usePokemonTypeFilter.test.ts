import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePokemonTypeFilter } from './usePokemonTypeFilter';
import { fetchJSON } from '../services/pokeapiService';

vi.mock('../services/pokeapiService', () => ({
  fetchJSON: vi.fn(),
}));

const mockedFetchJSON = vi.mocked(fetchJSON);

// The hook caches per-type results in a module-level Map that outlives any
// one render, so every test below uses its own never-reused type string -
// otherwise an earlier test's cached result would leak into a later one.

describe('usePokemonTypeFilter', () => {
  beforeEach(() => {
    mockedFetchJSON.mockReset();
  });

  it('returns null immediately, with no fetch, when type is null', () => {
    const { result } = renderHook(() => usePokemonTypeFilter(null));
    expect(result.current).toBeNull();
    expect(mockedFetchJSON).not.toHaveBeenCalled();
  });

  it('fetches and returns a lowercase Set of member species for a new type', async () => {
    mockedFetchJSON.mockResolvedValueOnce({
      pokemon: [{ pokemon: { name: 'Charizard' } }, { pokemon: { name: 'ponyta' } }],
    });
    const { result } = renderHook(() => usePokemonTypeFilter('fire-test-1'));
    expect(result.current).toBeNull(); // still loading synchronously after mount

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toEqual(new Set(['charizard', 'ponyta']));
    expect(mockedFetchJSON).toHaveBeenCalledWith('/type/fire-test-1');
  });

  it('resolves to null (not a throw) when the type endpoint 404s', async () => {
    mockedFetchJSON.mockResolvedValueOnce(null);
    const { result } = renderHook(() => usePokemonTypeFilter('bogus-type-test-1'));
    await waitFor(() => expect(mockedFetchJSON).toHaveBeenCalledTimes(1));
    expect(result.current).toBeNull();
  });

  it('serves a second hook instance for the same type from cache without refetching', async () => {
    mockedFetchJSON.mockResolvedValueOnce({ pokemon: [{ pokemon: { name: 'squirtle' } }] });
    const { result: first } = renderHook(() => usePokemonTypeFilter('water-test-1'));
    await waitFor(() => expect(first.current).not.toBeNull());

    const { result: second } = renderHook(() => usePokemonTypeFilter('water-test-1'));
    expect(second.current).toEqual(new Set(['squirtle']));
    expect(mockedFetchJSON).toHaveBeenCalledTimes(1);
  });

  it('re-derives synchronously (no new fetch) when the type prop returns to an already-cached value', async () => {
    mockedFetchJSON.mockResolvedValueOnce({ pokemon: [{ pokemon: { name: 'pikachu' } }] });
    const { result, rerender } = renderHook(({ type }) => usePokemonTypeFilter(type), {
      initialProps: { type: 'electric-test-1' as string | null },
    });
    await waitFor(() => expect(result.current).not.toBeNull());

    rerender({ type: null });
    expect(result.current).toBeNull();

    rerender({ type: 'electric-test-1' });
    expect(result.current).toEqual(new Set(['pikachu']));
    expect(mockedFetchJSON).toHaveBeenCalledTimes(1);
  });
});
