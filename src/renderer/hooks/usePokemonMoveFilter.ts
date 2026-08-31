/**
 * usePokemonMoveFilter Hook - '#move-name' Tag Filter for the Species Picker
 * Mirrors usePokemonTypeFilter.ts's shape exactly, but for moves: when a
 * '#tag' doesn't match one of the 18 known types (see SpeciesPickerCard.tsx),
 * it's treated as a move name instead, and this hook fetches PokeAPI's
 * /move/{name} endpoint - its `learned_by_pokemon` field already lists every
 * species that can learn it, so no per-species learnset scan is needed.
 * Cached per-move for the rest of the session, same as the type cache.
 *
 * Takes an array rather than a single move because the species picker ANDs
 * several '#tag's together - each non-type tag in the search needs its own
 * move lookup resolved independently.
 */

import { useState, useEffect } from 'react';
import { fetchJSON } from '../services/pokeapiService';

interface PokeAPIMoveLearnersResponse {
  learned_by_pokemon?: Array<{ name: string }>;
}

const moveLearnerCache = new Map<string, Set<string> | null>();

async function fetchMoveLearners(move: string): Promise<Set<string> | null> {
  if (moveLearnerCache.has(move)) return moveLearnerCache.get(move)!;
  const data = await fetchJSON<PokeAPIMoveLearnersResponse>(`/move/${move}`);
  const result = data ? new Set((data.learned_by_pokemon ?? []).map(p => p.name.toLowerCase())) : null;
  moveLearnerCache.set(move, result);
  return result;
}

/**
 * Whether `move` has finished resolving (found or 404) - lets a caller tell
 * "still loading" (this returns false, hook returns null for it) apart from
 * "confirmed not a move" (this returns true, hook returns null for it)
 * without reaching into the module-private cache. SpeciesPickerCard.tsx uses
 * this to know when to fall back to treating a given tag as an ability name
 * instead.
 */
export function isMoveResolved(move: string): boolean {
  return moveLearnerCache.has(move);
}

function buildResultMap(moves: string[]): Map<string, Set<string> | null> {
  const map = new Map<string, Set<string> | null>();
  for (const move of moves) map.set(move, moveLearnerCache.get(move) ?? null);
  return map;
}

/**
 * Returns a Map from each requested move to its matching learner species
 * slugs (lowercase), or null for a move that's still loading/inapplicable.
 * An empty `moves` array resolves to an empty Map immediately, with no fetch.
 */
export function usePokemonMoveFilter(moves: string[]): Map<string, Set<string> | null> {
  const [result, setResult] = useState<Map<string, Set<string> | null>>(() => buildResultMap(moves));

  // Re-derives synchronously from cache the moment the requested moves
  // change - set during render rather than in an effect, see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes.
  // JSON.stringify (not a plain join) so two different arrays can never
  // collide onto the same key string.
  const key = JSON.stringify(moves);
  const [resolvedKey, setResolvedKey] = useState(key);
  if (key !== resolvedKey) {
    setResolvedKey(key);
    setResult(buildResultMap(moves));
  }

  useEffect(() => {
    const missing = moves.filter(move => !moveLearnerCache.has(move));
    if (missing.length === 0) return;
    let cancelled = false;
    Promise.all(missing.map(fetchMoveLearners)).then(() => {
      if (!cancelled) setResult(buildResultMap(moves));
    });
    return () => { cancelled = true; };
    // Depends on `key` (a stable stringified snapshot of `moves`), not
    // `moves` itself - a fresh array reference every render would otherwise
    // rerun this effect on every keystroke even when the tags didn't change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return result;
}
