/**
 * usePokemonTypeFilter Hook - '#type' Tag Filter for the Species Picker
 * The bulk /pokemon?limit=2000 roster fetch (useSpeciesRoster) has no type
 * data per entry - fetching it per-entry would mean 1000+ extra requests.
 * Instead, when a '#fire'/'#grass'/etc. tag is actually used, fetch PokeAPI's
 * /type/{name} endpoint once (it returns every Pokémon of that type) and
 * intersect by name. Cached per-type for the rest of the session - only 18
 * possible types, so this never grows unbounded.
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

/** Returns null while loading/inapplicable, or the set of matching species slugs (lowercase) */
export function usePokemonTypeFilter(type: string | null): Set<string> | null {
  const [result, setResult] = useState<Set<string> | null>(type ? typeCache.get(type) ?? null : null);

  // Re-derives synchronously from cache the moment type changes - set
  // during render rather than in an effect, see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [resolvedForType, setResolvedForType] = useState(type);
  if (type !== resolvedForType) {
    setResolvedForType(type);
    setResult(type ? typeCache.get(type) ?? null : null);
  }

  useEffect(() => {
    if (!type || typeCache.has(type)) return;
    let cancelled = false;
    fetchTypeMembers(type).then(members => { if (!cancelled) setResult(members); });
    return () => { cancelled = true; };
  }, [type]);

  return result;
}
