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
      spriteUrl:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/10033.png',
      shinySpriteUrl:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/10033.png',
    });
    expect(mockedFetchJSON).toHaveBeenCalledWith('/pokemon/venusaur-mega-test-1');
  });

  // PokeAPI names Floette's and Meowstic's Megas differently from
  // CURATED_MEGA_FORM_SLUGS' scheme; the unaliased slug 404s and the team
  // card toggle never swaps the sprite. 'floette-eternal-mega' isn't in the
  // curated set (swapped for 'floette-mega'), so it's safe from the
  // prefetch test's shared-cache accounting below.
  it("fetches PokeAPI's own resource name for a differently-named Mega slug", async () => {
    mockedFetchJSON.mockResolvedValueOnce({ id: 10999 });
    const { result } = renderHook(() => useMegaSprite('floette-eternal-mega'));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(mockedFetchJSON).toHaveBeenCalledWith('/pokemon/floette-mega');
    expect(getCachedMegaSprite('floette-eternal-mega')?.id).toBe(10999);
  });

  it('extracts types (sorted by slot) and baseStats when the response includes them', async () => {
    mockedFetchJSON.mockResolvedValueOnce({
      id: 40001,
      types: [
        { slot: 2, type: { name: 'Dragon' } },
        { slot: 1, type: { name: 'Fire' } },
      ],
      stats: [
        { base_stat: 78, stat: { name: 'hp' } },
        { base_stat: 130, stat: { name: 'attack' } },
        { base_stat: 111, stat: { name: 'defense' } },
        { base_stat: 130, stat: { name: 'special-attack' } },
        { base_stat: 85, stat: { name: 'special-defense' } },
        { base_stat: 100, stat: { name: 'speed' } },
      ],
    });
    const { result } = renderHook(() => useMegaSprite('charizard-mega-x-stats-test-1'));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.types).toEqual(['fire', 'dragon']);
    expect(result.current?.baseStats).toEqual({
      hp: 78,
      attack: 130,
      defense: 111,
      specialAttack: 130,
      specialDefense: 85,
      speed: 100,
    });
  });

  it('leaves types/baseStats undefined when the response has neither (e.g. a bare {id} fixture)', async () => {
    mockedFetchJSON.mockResolvedValueOnce({ id: 40002 });
    const { result } = renderHook(() => useMegaSprite('unreleased-mega-test-2'));
    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current?.types).toBeUndefined();
    expect(result.current?.baseStats).toBeUndefined();
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

    expect(mockedFetchJSON).toHaveBeenCalledWith('/pokemon/meowstic-male-mega');
    expect(mockedFetchJSON).not.toHaveBeenCalledWith('/pokemon/meowstic-mega');

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
