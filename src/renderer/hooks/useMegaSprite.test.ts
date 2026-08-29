import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMegaSprite } from './useMegaSprite';
import { fetchJSON } from '../services/pokeapiService';

vi.mock('../services/pokeapiService', () => ({
  fetchJSON: vi.fn(),
}));

const mockedFetchJSON = vi.mocked(fetchJSON);

// Same module-level-cache caveat as usePokemonTypeFilter.test.ts - every
// test below uses its own never-reused apiSlug.

describe('useMegaSprite', () => {
  beforeEach(() => {
    mockedFetchJSON.mockReset();
  });

  it('returns null immediately, with no fetch, when apiSlug is null', () => {
    const { result } = renderHook(() => useMegaSprite(null));
    expect(result.current).toBeNull();
    expect(mockedFetchJSON).not.toHaveBeenCalled();
  });

  it('fetches the id and derives sprite URLs from it for a new slug', async () => {
    mockedFetchJSON.mockResolvedValueOnce({ id: 10033 });
    const { result } = renderHook(() => useMegaSprite('venusaur-mega-test-1'));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toEqual({
      id: 10033,
      spriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10033.png',
      shinySpriteUrl: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/10033.png',
    });
    expect(mockedFetchJSON).toHaveBeenCalledWith('/pokemon/venusaur-mega-test-1');
  });

  it('resolves to null (not a throw) when the slug has no PokeAPI resource yet', async () => {
    mockedFetchJSON.mockResolvedValueOnce(null);
    const { result } = renderHook(() => useMegaSprite('unreleased-mega-test-1'));
    await waitFor(() => expect(mockedFetchJSON).toHaveBeenCalledTimes(1));
    expect(result.current).toBeNull();
  });

  it('serves a second hook instance for the same slug from cache without refetching', async () => {
    mockedFetchJSON.mockResolvedValueOnce({ id: 20001 });
    const { result: first } = renderHook(() => useMegaSprite('gengar-mega-test-1'));
    await waitFor(() => expect(first.current).not.toBeNull());

    const { result: second } = renderHook(() => useMegaSprite('gengar-mega-test-1'));
    expect(second.current?.id).toBe(20001);
    expect(mockedFetchJSON).toHaveBeenCalledTimes(1);
  });

  it('re-derives synchronously (no new fetch) when apiSlug returns to an already-cached value', async () => {
    mockedFetchJSON.mockResolvedValueOnce({ id: 30001 });
    const { result, rerender } = renderHook(({ slug }) => useMegaSprite(slug), {
      initialProps: { slug: 'charizard-mega-x-test-1' as string | null },
    });
    await waitFor(() => expect(result.current).not.toBeNull());

    rerender({ slug: null });
    expect(result.current).toBeNull();

    rerender({ slug: 'charizard-mega-x-test-1' });
    expect(result.current?.id).toBe(30001);
    expect(mockedFetchJSON).toHaveBeenCalledTimes(1);
  });
});
