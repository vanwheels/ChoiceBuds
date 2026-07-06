/**
 * useMegaSprite Hook - Live Mega Form Sprite Lookup
 * Given a PokeAPI resource slug (e.g. "gengar-mega", "charizard-mega-x"),
 * fetches that Pokémon's real `id` and derives its sprite URLs from it -
 * Mega forms live at their own distinct PokeAPI id (e.g. Mega Venusaur is
 * 10033, not a suffixed filename off Venusaur's own id 3), so this can't be
 * computed locally the way the base/female sprite variants are.
 *
 * Species newly added to Mega Evolution by Pokémon Champions mostly have no
 * PokeAPI resource yet, so a 404 here is expected and just means "no mega
 * sprite available yet" - callers fall back to the normal sprite, never a
 * broken image. Cached in-memory per slug for the rest of the session.
 */

import { useState, useEffect } from 'react';
import { fetchJSON } from '../services/pokeapiService';

export interface MegaSpriteResult {
  id: number;
  spriteUrl: string;
  shinySpriteUrl: string;
}

interface PokeAPIPokemonResponse {
  id: number;
}

const cache = new Map<string, MegaSpriteResult | null>();

function buildResult(id: number): MegaSpriteResult {
  return {
    id,
    spriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
    shinySpriteUrl: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`,
  };
}

async function fetchMegaSprite(apiSlug: string): Promise<MegaSpriteResult | null> {
  if (cache.has(apiSlug)) return cache.get(apiSlug)!;
  const data = await fetchJSON<PokeAPIPokemonResponse>(`/pokemon/${apiSlug}`);
  const result = data ? buildResult(data.id) : null;
  cache.set(apiSlug, result);
  return result;
}

/** `apiSlug` null means "not currently mega-eligible" - returns null immediately, no fetch */
export function useMegaSprite(apiSlug: string | null): MegaSpriteResult | null {
  const [result, setResult] = useState<MegaSpriteResult | null>(apiSlug ? cache.get(apiSlug) ?? null : null);

  useEffect(() => {
    if (!apiSlug) {
      setResult(null);
      return;
    }
    const cached = cache.get(apiSlug);
    if (cached !== undefined) {
      setResult(cached);
      return;
    }
    let cancelled = false;
    fetchMegaSprite(apiSlug).then(r => { if (!cancelled) setResult(r); });
    return () => { cancelled = true; };
  }, [apiSlug]);

  return result;
}
