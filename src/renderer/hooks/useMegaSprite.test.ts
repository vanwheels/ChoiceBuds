import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMegaSprite, useMegaSpritePrefetch, getCachedMegaSprite } from './useMegaSprite';
import { fetchJSON } from '../services/pokeapiService';
import { CURATED_MEGA_FORM_SLUGS } from '../config/megaEvolution';

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

describe('useMegaSpritePrefetch', () => {
  // Own reset (not covered by the describe block above's beforeEach, which
  // is scoped to its own describe) - without it, mock.calls carries over
  // calls recorded by the last 'useMegaSprite' test above, over-counting
  // this test's own assertion below.
  beforeEach(() => {
    mockedFetchJSON.mockReset();
  });

  it('bulk-fetches every curated Mega form slug into the shared cache, then skips already-cached ones on a later mount', async () => {
    mockedFetchJSON.mockResolvedValue({ id: 999 });
    const { result } = renderHook(() => useMegaSpritePrefetch());
    expect(result.current).toBe(0);
    await waitFor(() => expect(result.current).toBe(1));
    expect(mockedFetchJSON).toHaveBeenCalledTimes(CURATED_MEGA_FORM_SLUGS.size);

    const [sampleSlug] = CURATED_MEGA_FORM_SLUGS;
    expect(getCachedMegaSprite(sampleSlug)?.id).toBe(999);

    // A second mount (e.g. revisiting Speed Tiers later the same session)
    // finds everything already cached - no re-fetch, version stays at its
    // initial 0 since there's no async work to bump it for.
    mockedFetchJSON.mockClear();
    const { result: second } = renderHook(() => useMegaSpritePrefetch());
    expect(mockedFetchJSON).not.toHaveBeenCalled();
    expect(second.current).toBe(0);
  });
});
