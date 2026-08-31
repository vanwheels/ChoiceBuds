/**
 * usePokemonMoveFilter Hook - '#move-name' Tag Filter for the Species Picker
 * Mirrors usePokemonTypeFilter.ts's shape exactly, but for moves: when a
 * '#tag' doesn't match one of the 18 known types (see SpeciesPickerCard.tsx),
 * it's treated as a move name instead, and this hook fetches PokeAPI's
 * /move/{name} endpoint - its `learned_by_pokemon` field already lists every
 * species that can learn it, so no per-species learnset scan is needed.
 * Cached per-move for the rest of the session, same as the type cache.
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
 * "still loading" (this returns false, hook returns null) apart from
 * "confirmed not a move" (this returns true, hook returns null) without
 * reaching into the module-private cache. SpeciesPickerCard.tsx uses this to
 * know when to fall back to treating the tag as an ability name instead.
 */
export function isMoveResolved(move: string): boolean {
  return moveLearnerCache.has(move);
}

/** Returns null while loading/inapplicable, or the set of matching species slugs (lowercase) */
export function usePokemonMoveFilter(move: string | null): Set<string> | null {
  const [result, setResult] = useState<Set<string> | null>(move ? moveLearnerCache.get(move) ?? null : null);

  // Re-derives synchronously from cache the moment move changes - set during
  // render rather than in an effect, see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [resolvedForMove, setResolvedForMove] = useState(move);
  if (move !== resolvedForMove) {
    setResolvedForMove(move);
    setResult(move ? moveLearnerCache.get(move) ?? null : null);
  }

  useEffect(() => {
    if (!move || moveLearnerCache.has(move)) return;
    let cancelled = false;
    fetchMoveLearners(move).then(members => { if (!cancelled) setResult(members); });
    return () => { cancelled = true; };
  }, [move]);

  return result;
}
