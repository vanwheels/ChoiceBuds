import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePokemonTypeFilter } from './usePokemonTypeFilter';
import { fetchJSON } from '../services/pokeapiService';

vi.mock('../services/pokeapiService', () => ({
  fetchJSON: vi.fn(),
}));

const mockedFetchJSON = vi.mocked(fetchJSON);

// The hook caches per-type results in a module-level Map that outlives any
// one render, so every test below uses its own never-reused type string(s) -
// otherwise an earlier test's cached result would leak into a later one.

describe('usePokemonTypeFilter', () => {
  beforeEach(() => {
    mockedFetchJSON.mockReset();
  });

  it('returns an empty Map immediately, with no fetch, when types is empty', () => {
    const { result } = renderHook(() => usePokemonTypeFilter([]));
    expect(result.current.size).toBe(0);
    expect(mockedFetchJSON).not.toHaveBeenCalled();
  });

  it('fetches and returns a lowercase Set of member species for a new type', async () => {
    mockedFetchJSON.mockResolvedValueOnce({
      pokemon: [{ pokemon: { name: 'Charizard' } }, { pokemon: { name: 'ponyta' } }],
    });
    const { result } = renderHook(() => usePokemonTypeFilter(['fire-test-1']));
    expect(result.current.get('fire-test-1')).toBeNull(); // still loading synchronously after mount

    await waitFor(() => expect(result.current.get('fire-test-1')).not.toBeNull());
    expect(result.current.get('fire-test-1')).toEqual(new Set(['charizard', 'ponyta']));
    expect(mockedFetchJSON).toHaveBeenCalledWith('/type/fire-test-1');
  });

  it('resolves multiple new types in one call, each to its own set', async () => {
    mockedFetchJSON.mockImplementation(async (url: string) =>
      url === '/type/fire-test-2'
        ? { pokemon: [{ pokemon: { name: 'charizard' } }] }
        : { pokemon: [{ pokemon: { name: 'squirtle' } }] }
    );
    const { result } = renderHook(() => usePokemonTypeFilter(['fire-test-2', 'water-test-2']));

    await waitFor(() => expect(result.current.get('fire-test-2')).not.toBeNull());
    expect(result.current.get('fire-test-2')).toEqual(new Set(['charizard']));
    expect(result.current.get('water-test-2')).toEqual(new Set(['squirtle']));
    expect(mockedFetchJSON).toHaveBeenCalledTimes(2);
  });

  it('resolves to null (not a throw) when the type endpoint 404s', async () => {
    mockedFetchJSON.mockResolvedValueOnce(null);
    const { result } = renderHook(() => usePokemonTypeFilter(['bogus-type-test-1']));
    await waitFor(() => expect(mockedFetchJSON).toHaveBeenCalledTimes(1));
    expect(result.current.get('bogus-type-test-1')).toBeNull();
  });

  it('serves a second hook instance for the same type from cache without refetching', async () => {
    mockedFetchJSON.mockResolvedValueOnce({ pokemon: [{ pokemon: { name: 'squirtle' } }] });
    const { result: first } = renderHook(() => usePokemonTypeFilter(['water-test-1']));
    await waitFor(() => expect(first.current.get('water-test-1')).not.toBeNull());

    const { result: second } = renderHook(() => usePokemonTypeFilter(['water-test-1']));
    expect(second.current.get('water-test-1')).toEqual(new Set(['squirtle']));
    expect(mockedFetchJSON).toHaveBeenCalledTimes(1);
  });

  it('only fetches the newly-added type when a second type joins an already-resolved one', async () => {
    mockedFetchJSON.mockResolvedValueOnce({ pokemon: [{ pokemon: { name: 'pikachu' } }] });
    const { result, rerender } = renderHook(({ types }) => usePokemonTypeFilter(types), {
      initialProps: { types: ['electric-test-2'] },
    });
    await waitFor(() => expect(result.current.get('electric-test-2')).not.toBeNull());

    mockedFetchJSON.mockResolvedValueOnce({ pokemon: [{ pokemon: { name: 'geodude' } }] });
    rerender({ types: ['electric-test-2', 'ground-test-2'] });

    await waitFor(() => expect(result.current.get('ground-test-2')).not.toBeNull());
    expect(result.current.get('electric-test-2')).toEqual(new Set(['pikachu']));
    expect(result.current.get('ground-test-2')).toEqual(new Set(['geodude']));
    expect(mockedFetchJSON).toHaveBeenCalledTimes(2);
    expect(mockedFetchJSON).toHaveBeenCalledWith('/type/ground-test-2');
  });

  it('re-derives synchronously (no new fetch) when the types prop returns to an already-cached value', async () => {
    mockedFetchJSON.mockResolvedValueOnce({ pokemon: [{ pokemon: { name: 'pikachu' } }] });
    const { result, rerender } = renderHook(({ types }) => usePokemonTypeFilter(types), {
      initialProps: { types: ['electric-test-1'] },
    });
    await waitFor(() => expect(result.current.get('electric-test-1')).not.toBeNull());

    rerender({ types: [] });
    expect(result.current.size).toBe(0);

    rerender({ types: ['electric-test-1'] });
    expect(result.current.get('electric-test-1')).toEqual(new Set(['pikachu']));
    expect(mockedFetchJSON).toHaveBeenCalledTimes(1);
  });
});
