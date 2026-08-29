import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSpeciesRoster } from './useSpeciesRoster';
import { fetchJSON } from '../services/pokeapiService';

vi.mock('../services/pokeapiService', () => ({
  fetchJSON: vi.fn(),
}));

const mockedFetchJSON = vi.mocked(fetchJSON);
const CACHE_KEY = 'choicebuds:speciesRoster:v3';

describe('useSpeciesRoster', () => {
  beforeEach(() => {
    mockedFetchJSON.mockReset();
    localStorage.clear();
  });

  it('is loading with an empty roster on mount when there is no cache', () => {
    mockedFetchJSON.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useSpeciesRoster());
    expect(result.current).toEqual({ roster: [], isLoading: true });
  });

  it('fetches the full list, filters out Mega forms, and builds display entries with sprite URLs', async () => {
    mockedFetchJSON.mockResolvedValueOnce({
      results: [
        { name: 'charizard', url: 'https://pokeapi.co/api/v2/pokemon/6/' },
        { name: 'charizard-mega-x', url: 'https://pokeapi.co/api/v2/pokemon/10034/' },
        { name: 'charizard-mega-y', url: 'https://pokeapi.co/api/v2/pokemon/10035/' },
        { name: 'ninetales-alola', url: 'https://pokeapi.co/api/v2/pokemon/10103/' },
      ],
    });

    const { result } = renderHook(() => useSpeciesRoster());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.roster).toEqual([
      {
        name: 'Charizard',
        id: 6,
        spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png',
        shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/6.png',
      },
      {
        name: 'Ninetales-Alola',
        id: 10103,
        spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10103.png',
        shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/10103.png',
      },
    ]);
  });

  it('caches the fetched roster to localStorage so a later mount serves it without refetching', async () => {
    mockedFetchJSON.mockResolvedValueOnce({
      results: [{ name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' }],
    });
    const { result: first } = renderHook(() => useSpeciesRoster());
    await waitFor(() => expect(first.current.isLoading).toBe(false));
    expect(localStorage.getItem(CACHE_KEY)).not.toBeNull();

    const { result: second } = renderHook(() => useSpeciesRoster());
    expect(second.current).toEqual({ roster: [{ name: 'Pikachu', id: 25, spriteUrl: expect.any(String), shinySpriteUrl: expect.any(String) }], isLoading: false });
    expect(mockedFetchJSON).toHaveBeenCalledTimes(1); // second mount served from cache, no refetch
  });

  it('falls back to a fresh fetch when the cached value is corrupted JSON', async () => {
    localStorage.setItem(CACHE_KEY, '{not valid json');
    mockedFetchJSON.mockResolvedValueOnce({ results: [] });

    const { result } = renderHook(() => useSpeciesRoster());
    expect(result.current.isLoading).toBe(true); // corrupted cache treated as a miss
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockedFetchJSON).toHaveBeenCalledWith('/pokemon?limit=2000');
  });

  it('stops loading without throwing when the fetch fails', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockedFetchJSON.mockRejectedValueOnce(new Error('network down'));

    const { result } = renderHook(() => useSpeciesRoster());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.roster).toEqual([]);
    consoleErrorSpy.mockRestore();
  });
});
