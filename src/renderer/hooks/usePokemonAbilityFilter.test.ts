import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePokemonAbilityFilter } from './usePokemonAbilityFilter';
import { fetchJSON } from '../services/pokeapiService';

vi.mock('../services/pokeapiService', () => ({
  fetchJSON: vi.fn(),
}));

const mockedFetchJSON = vi.mocked(fetchJSON);

// The hook caches per-ability results in a module-level Map that outlives
// any one render, so every test below uses its own never-reused ability
// string(s) - otherwise an earlier test's cached result would leak into a
// later one.

describe('usePokemonAbilityFilter', () => {
  beforeEach(() => {
    mockedFetchJSON.mockReset();
  });

  it('returns an empty Map immediately, with no fetch, when abilities is empty', () => {
    const { result } = renderHook(() => usePokemonAbilityFilter([]));
    expect(result.current.size).toBe(0);
    expect(mockedFetchJSON).not.toHaveBeenCalled();
  });

  it('fetches and returns a lowercase Set of ability holders for a new ability', async () => {
    mockedFetchJSON.mockResolvedValueOnce({
      pokemon: [{ pokemon: { name: 'Charizard' } }, { pokemon: { name: 'ninetales' } }],
    });
    const { result } = renderHook(() => usePokemonAbilityFilter(['flash-fire-test-1']));
    expect(result.current.get('flash-fire-test-1')).toBeNull(); // still loading synchronously after mount

    await waitFor(() => expect(result.current.get('flash-fire-test-1')).not.toBeNull());
    expect(result.current.get('flash-fire-test-1')).toEqual(new Set(['charizard', 'ninetales']));
    expect(mockedFetchJSON).toHaveBeenCalledWith('/ability/flash-fire-test-1');
  });

  it('resolves multiple new abilities in one call, each to its own set', async () => {
    mockedFetchJSON.mockImplementation(async (url: string) =>
      url === '/ability/static-test-2'
        ? { pokemon: [{ pokemon: { name: 'pikachu' } }] }
        : { pokemon: [{ pokemon: { name: 'blissey' } }] }
    );
    const { result } = renderHook(() => usePokemonAbilityFilter(['static-test-2', 'natural-cure-test-2']));

    await waitFor(() => expect(result.current.get('static-test-2')).not.toBeNull());
    expect(result.current.get('static-test-2')).toEqual(new Set(['pikachu']));
    expect(result.current.get('natural-cure-test-2')).toEqual(new Set(['blissey']));
    expect(mockedFetchJSON).toHaveBeenCalledTimes(2);
  });

  it('resolves to null (not a throw) when the ability endpoint 404s', async () => {
    mockedFetchJSON.mockResolvedValueOnce(null);
    const { result } = renderHook(() => usePokemonAbilityFilter(['bogus-ability-test-1']));
    await waitFor(() => expect(mockedFetchJSON).toHaveBeenCalledTimes(1));
    expect(result.current.get('bogus-ability-test-1')).toBeNull();
  });

  it('serves a second hook instance for the same ability from cache without refetching', async () => {
    mockedFetchJSON.mockResolvedValueOnce({ pokemon: [{ pokemon: { name: 'blissey' } }] });
    const { result: first } = renderHook(() => usePokemonAbilityFilter(['natural-cure-test-1']));
    await waitFor(() => expect(first.current.get('natural-cure-test-1')).not.toBeNull());

    const { result: second } = renderHook(() => usePokemonAbilityFilter(['natural-cure-test-1']));
    expect(second.current.get('natural-cure-test-1')).toEqual(new Set(['blissey']));
    expect(mockedFetchJSON).toHaveBeenCalledTimes(1);
  });

  it('re-derives synchronously (no new fetch) when the abilities prop returns to an already-cached value', async () => {
    mockedFetchJSON.mockResolvedValueOnce({ pokemon: [{ pokemon: { name: 'pikachu' } }] });
    const { result, rerender } = renderHook(({ abilities }) => usePokemonAbilityFilter(abilities), {
      initialProps: { abilities: ['static-test-1'] },
    });
    await waitFor(() => expect(result.current.get('static-test-1')).not.toBeNull());

    rerender({ abilities: [] });
    expect(result.current.size).toBe(0);

    rerender({ abilities: ['static-test-1'] });
    expect(result.current.get('static-test-1')).toEqual(new Set(['pikachu']));
    expect(mockedFetchJSON).toHaveBeenCalledTimes(1);
  });

  it('treats a missing pokemon field as an empty set rather than throwing', async () => {
    mockedFetchJSON.mockResolvedValueOnce({});
    const { result } = renderHook(() => usePokemonAbilityFilter(['trace-test-1']));
    await waitFor(() => expect(result.current.get('trace-test-1')).not.toBeNull());
    expect(result.current.get('trace-test-1')).toEqual(new Set());
  });
});
