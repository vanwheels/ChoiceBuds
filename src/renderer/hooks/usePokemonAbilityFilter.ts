/**
 * usePokemonAbilityFilter Hook - '#ability-name' Tag Filter for the Species Picker
 * Mirrors usePokemonMoveFilter.ts's shape exactly, but for abilities: once a
 * '#tag' fails to resolve as a move (see SpeciesPickerCard.tsx's fallback
 * chain), it's tried as an ability name instead, and this hook fetches
 * PokeAPI's /ability/{name} endpoint - its `pokemon` field already lists
 * every species that can have it, so no per-species ability-list scan is
 * needed. Cached per-ability for the rest of the session, same as the
 * move cache.
 *
 * Takes an array rather than a single ability because the species picker
 * ANDs several '#tag's together - each tag that fell through the move
 * fallback needs its own ability lookup resolved independently.
 */

import { useState, useEffect } from 'react';
import { fetchJSON } from '../services/pokeapiService';

interface PokeAPIAbilityUsersResponse {
  pokemon?: Array<{ pokemon: { name: string } }>;
}

const abilityUserCache = new Map<string, Set<string> | null>();

async function fetchAbilityUsers(ability: string): Promise<Set<string> | null> {
  if (abilityUserCache.has(ability)) return abilityUserCache.get(ability)!;
  const data = await fetchJSON<PokeAPIAbilityUsersResponse>(`/ability/${ability}`);
  const result = data ? new Set((data.pokemon ?? []).map(p => p.pokemon.name.toLowerCase())) : null;
  abilityUserCache.set(ability, result);
  return result;
}

function buildResultMap(abilities: string[]): Map<string, Set<string> | null> {
  const map = new Map<string, Set<string> | null>();
  for (const ability of abilities) map.set(ability, abilityUserCache.get(ability) ?? null);
  return map;
}

/**
 * Returns a Map from each requested ability to its matching holder species
 * slugs (lowercase), or null for an ability that's still loading/
 * inapplicable. An empty `abilities` array resolves to an empty Map
 * immediately, with no fetch.
 */
export function usePokemonAbilityFilter(abilities: string[]): Map<string, Set<string> | null> {
  const [result, setResult] = useState<Map<string, Set<string> | null>>(() => buildResultMap(abilities));

  // Re-derives synchronously from cache the moment the requested abilities
  // change - set during render rather than in an effect, see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  // JSON.stringify (not a plain join) so two different arrays can never
  // collide onto the same key string.
  const key = JSON.stringify(abilities);
  const [resolvedKey, setResolvedKey] = useState(key);
  if (key !== resolvedKey) {
    setResolvedKey(key);
    setResult(buildResultMap(abilities));
  }

  useEffect(() => {
    const missing = abilities.filter(ability => !abilityUserCache.has(ability));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map(fetchAbilityUsers)).then(() => {
      if (!cancelled) setResult(buildResultMap(abilities));
    });
    return () => { cancelled = true; };
    // Depends on `key` (a stable stringified snapshot of `abilities`), not
    // `abilities` itself - a fresh array reference every render would
    // otherwise rerun this effect on every keystroke even when the tags
    // didn't change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return result;
}
