import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePokemonMoveFilter, isMoveResolved } from './usePokemonMoveFilter';
import { fetchJSON } from '../services/pokeapiService';

vi.mock('../services/pokeapiService', () => ({
  fetchJSON: vi.fn(),
}));

const mockedFetchJSON = vi.mocked(fetchJSON);

// The hook caches per-move results in a module-level Map that outlives any
// one render, so every test below uses its own never-reused move string(s) -
// otherwise an earlier test's cached result would leak into a later one.

describe('usePokemonMoveFilter', () => {
  beforeEach(() => {
    mockedFetchJSON.mockReset();
  });

  it('returns an empty Map immediately, with no fetch, when moves is empty', () => {
    const { result } = renderHook(() => usePokemonMoveFilter([]));
    expect(result.current.size).toBe(0);
    expect(mockedFetchJSON).not.toHaveBeenCalled();
  });

  it('fetches and returns a lowercase Set of learner species for a new move', async () => {
    mockedFetchJSON.mockResolvedValueOnce({
      learned_by_pokemon: [{ name: 'Charizard' }, { name: 'dragonite' }],
    });
    const { result } = renderHook(() => usePokemonMoveFilter(['dragon-dance-test-1']));
    expect(result.current.get('dragon-dance-test-1')).toBeNull(); // still loading synchronously after mount

    await waitFor(() => expect(result.current.get('dragon-dance-test-1')).not.toBeNull());
    expect(result.current.get('dragon-dance-test-1')).toEqual(new Set(['charizard', 'dragonite']));
    expect(mockedFetchJSON).toHaveBeenCalledWith('/move/dragon-dance-test-1');
  });

  it('resolves multiple new moves in one call, each to its own set', async () => {
    mockedFetchJSON.mockImplementation(async (url: string) =>
      url === '/move/tackle-test-2'
        ? { learned_by_pokemon: [{ name: 'rattata' }] }
        : { learned_by_pokemon: [{ name: 'psyduck' }] }
    );
    const { result } = renderHook(() => usePokemonMoveFilter(['tackle-test-2', 'scratch-test-2']));

    await waitFor(() => expect(result.current.get('tackle-test-2')).not.toBeNull());
    expect(result.current.get('tackle-test-2')).toEqual(new Set(['rattata']));
    expect(result.current.get('scratch-test-2')).toEqual(new Set(['psyduck']));
    expect(mockedFetchJSON).toHaveBeenCalledTimes(2);
  });

  it('resolves to null (not a throw) when the move endpoint 404s', async () => {
    mockedFetchJSON.mockResolvedValueOnce(null);
    const { result } = renderHook(() => usePokemonMoveFilter(['bogus-move-test-1']));
    await waitFor(() => expect(mockedFetchJSON).toHaveBeenCalledTimes(1));
    expect(result.current.get('bogus-move-test-1')).toBeNull();
  });

  it('serves a second hook instance for the same move from cache without refetching', async () => {
    mockedFetchJSON.mockResolvedValueOnce({ learned_by_pokemon: [{ name: 'squirtle' }] });
    const { result: first } = renderHook(() => usePokemonMoveFilter(['withdraw-test-1']));
    await waitFor(() => expect(first.current.get('withdraw-test-1')).not.toBeNull());

    const { result: second } = renderHook(() => usePokemonMoveFilter(['withdraw-test-1']));
    expect(second.current.get('withdraw-test-1')).toEqual(new Set(['squirtle']));
    expect(mockedFetchJSON).toHaveBeenCalledTimes(1);
  });

  it('only fetches the newly-added move when a second move joins an already-resolved one', async () => {
    mockedFetchJSON.mockResolvedValueOnce({ learned_by_pokemon: [{ name: 'pikachu' }] });
    const { result, rerender } = renderHook(({ moves }) => usePokemonMoveFilter(moves), {
      initialProps: { moves: ['thunderbolt-test-2'] },
    });
    await waitFor(() => expect(result.current.get('thunderbolt-test-2')).not.toBeNull());

    mockedFetchJSON.mockResolvedValueOnce({ learned_by_pokemon: [{ name: 'geodude' }] });
    rerender({ moves: ['thunderbolt-test-2', 'earthquake-test-2'] });

    await waitFor(() => expect(result.current.get('earthquake-test-2')).not.toBeNull());
    expect(result.current.get('thunderbolt-test-2')).toEqual(new Set(['pikachu']));
    expect(result.current.get('earthquake-test-2')).toEqual(new Set(['geodude']));
    expect(mockedFetchJSON).toHaveBeenCalledTimes(2);
  });

  it('re-derives synchronously (no new fetch) when the moves prop returns to an already-cached value', async () => {
    mockedFetchJSON.mockResolvedValueOnce({ learned_by_pokemon: [{ name: 'pikachu' }] });
    const { result, rerender } = renderHook(({ moves }) => usePokemonMoveFilter(moves), {
      initialProps: { moves: ['thunderbolt-test-1'] },
    });
    await waitFor(() => expect(result.current.get('thunderbolt-test-1')).not.toBeNull());

    rerender({ moves: [] });
    expect(result.current.size).toBe(0);

    rerender({ moves: ['thunderbolt-test-1'] });
    expect(result.current.get('thunderbolt-test-1')).toEqual(new Set(['pikachu']));
    expect(mockedFetchJSON).toHaveBeenCalledTimes(1);
  });

  it('treats a missing learned_by_pokemon field as an empty set rather than throwing', async () => {
    mockedFetchJSON.mockResolvedValueOnce({});
    const { result } = renderHook(() => usePokemonMoveFilter(['splash-test-1']));
    await waitFor(() => expect(result.current.get('splash-test-1')).not.toBeNull());
    expect(result.current.get('splash-test-1')).toEqual(new Set());
  });

  describe('isMoveResolved', () => {
    it('is false before a move has been fetched and true once it resolves, including on a 404', async () => {
      expect(isMoveResolved('resolve-check-test-1')).toBe(false);

      mockedFetchJSON.mockResolvedValueOnce(null);
      const { result } = renderHook(() => usePokemonMoveFilter(['resolve-check-test-1']));
      await waitFor(() => expect(mockedFetchJSON).toHaveBeenCalledTimes(1));

      expect(result.current.get('resolve-check-test-1')).toBeNull(); // 404 -> no match
      expect(isMoveResolved('resolve-check-test-1')).toBe(true); // but resolution is confirmed
    });
  });
});
