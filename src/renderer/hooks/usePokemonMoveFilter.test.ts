import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePokemonMoveFilter, isMoveResolved } from './usePokemonMoveFilter';
import { fetchJSON } from '../services/pokeapiService';

vi.mock('../services/pokeapiService', () => ({
  fetchJSON: vi.fn(),
}));

const mockedFetchJSON = vi.mocked(fetchJSON);

// The hook caches per-move results in a module-level Map that outlives any
// one render, so every test below uses its own never-reused move string -
// otherwise an earlier test's cached result would leak into a later one.

describe('usePokemonMoveFilter', () => {
  beforeEach(() => {
    mockedFetchJSON.mockReset();
  });

  it('returns null immediately, with no fetch, when move is null', () => {
    const { result } = renderHook(() => usePokemonMoveFilter(null));
    expect(result.current).toBeNull();
    expect(mockedFetchJSON).not.toHaveBeenCalled();
  });

  it('fetches and returns a lowercase Set of learner species for a new move', async () => {
    mockedFetchJSON.mockResolvedValueOnce({
      learned_by_pokemon: [{ name: 'Charizard' }, { name: 'dragonite' }],
    });
    const { result } = renderHook(() => usePokemonMoveFilter('dragon-dance-test-1'));
    expect(result.current).toBeNull(); // still loading synchronously after mount

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toEqual(new Set(['charizard', 'dragonite']));
    expect(mockedFetchJSON).toHaveBeenCalledWith('/move/dragon-dance-test-1');
  });

  it('resolves to null (not a throw) when the move endpoint 404s', async () => {
    mockedFetchJSON.mockResolvedValueOnce(null);
    const { result } = renderHook(() => usePokemonMoveFilter('bogus-move-test-1'));
    await waitFor(() => expect(mockedFetchJSON).toHaveBeenCalledTimes(1));
    expect(result.current).toBeNull();
  });

  it('serves a second hook instance for the same move from cache without refetching', async () => {
    mockedFetchJSON.mockResolvedValueOnce({ learned_by_pokemon: [{ name: 'squirtle' }] });
    const { result: first } = renderHook(() => usePokemonMoveFilter('withdraw-test-1'));
    await waitFor(() => expect(first.current).not.toBeNull());

    const { result: second } = renderHook(() => usePokemonMoveFilter('withdraw-test-1'));
    expect(second.current).toEqual(new Set(['squirtle']));
    expect(mockedFetchJSON).toHaveBeenCalledTimes(1);
  });

  it('re-derives synchronously (no new fetch) when the move prop returns to an already-cached value', async () => {
    mockedFetchJSON.mockResolvedValueOnce({ learned_by_pokemon: [{ name: 'pikachu' }] });
    const { result, rerender } = renderHook(({ move }) => usePokemonMoveFilter(move), {
      initialProps: { move: 'thunderbolt-test-1' as string | null },
    });
    await waitFor(() => expect(result.current).not.toBeNull());

    rerender({ move: null });
    expect(result.current).toBeNull();

    rerender({ move: 'thunderbolt-test-1' });
    expect(result.current).toEqual(new Set(['pikachu']));
    expect(mockedFetchJSON).toHaveBeenCalledTimes(1);
  });

  it('treats a missing learned_by_pokemon field as an empty set rather than throwing', async () => {
    mockedFetchJSON.mockResolvedValueOnce({});
    const { result } = renderHook(() => usePokemonMoveFilter('splash-test-1'));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toEqual(new Set());
  });

  describe('isMoveResolved', () => {
    it('is false before a move has been fetched and true once it resolves, including on a 404', async () => {
      expect(isMoveResolved('resolve-check-test-1')).toBe(false);

      mockedFetchJSON.mockResolvedValueOnce(null);
      const { result } = renderHook(() => usePokemonMoveFilter('resolve-check-test-1'));
      await waitFor(() => expect(mockedFetchJSON).toHaveBeenCalledTimes(1));

      expect(result.current).toBeNull(); // 404 -> no match
      expect(isMoveResolved('resolve-check-test-1')).toBe(true); // but resolution is confirmed
    });
  });
});
