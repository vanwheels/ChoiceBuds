/**
 * usePokemonTypeFilter Hook - '#type' Tag Filter for the Species Picker
 * The bulk /pokemon?limit=2000 roster fetch (useSpeciesRoster) has no type
 * data per entry - fetching it per-entry would mean 1000+ extra requests.
 * Instead, when a '#fire'/'#grass'/etc. tag is actually used, fetch PokeAPI's
 * /type/{name} endpoint once (it returns every Pokemon of that type) and
 * intersect by name. Cached per-type for the rest of the session - only 18
 * possible types, so this never grows unbounded.
 *
 * Takes an array rather than a single type because the species picker ANDs
 * several '#tag's together (see SpeciesPickerCard.tsx) - each type tag in
 * the search needs its own member set resolved independently.
 */

import { useState, useEffect } from 'react';
import { fetchJSON } from '../services/pokeapiService';

interface PokeAPITypeResponse {
  pokemon: Array<{ pokemon: { name: string } }>;
}

const typeCache = new Map<string, Set<string> | null>();

async function fetchTypeMembers(type: string): Promise<Set<string> | null> {
  if (typeCache.has(type)) return typeCache.get(type)!;
  const data = await fetchJSON<PokeAPITypeResponse>(`/type/${type}`);
  const result = data ? new Set(data.pokemon.map(p => p.pokemon.name.toLowerCase())) : null;
  typeCache.set(type, result);
  return result;
}

function buildResultMap(types: string[]): Map<string, Set<string> | null> {
  const map = new Map<string, Set<string> | null>();
  for (const type of types) map.set(type, typeCache.get(type) ?? null);
  return map;
}

/**
 * Returns a Map from each requested type to its matching species slugs
 * (lowercase), or null for a type that's still loading/inapplicable. An
 * empty `types` array resolves to an empty Map immediately, with no fetch.
 */
export function usePokemonTypeFilter(types: string[]): Map<string, Set<string> | null> {
  const [result, setResult] = useState<Map<string, Set<string> | null>>(() => buildResultMap(types));

  // Re-derives synchronously from cache the moment the requested types
  // change - set during render rather than in an effect, see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  // JSON.stringify (not a plain join) so two different arrays can never
  // collide onto the same key string.
  const key = JSON.stringify(types);
  const [resolvedKey, setResolvedKey] = useState(key);
  if (key !== resolvedKey) {
    setResolvedKey(key);
    setResult(buildResultMap(types));
  }

  useEffect(() => {
    const missing = types.filter(type => !typeCache.has(type));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map(fetchTypeMembers)).then(() => {
      if (!cancelled) setResult(buildResultMap(types));
    });
    return () => { cancelled = true; };
    // Depends on `key` (a stable stringified snapshot of `types`), not
    // `types` itself - a fresh array reference every render would otherwise
    // rerun this effect on every keystroke even when the tags didn't change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return result;
}
