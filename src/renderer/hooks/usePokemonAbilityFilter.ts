/**
 * usePokemonAbilityFilter Hook - '#ability-name' Tag Filter for the Species Picker
 * Mirrors usePokemonMoveFilter.ts's shape exactly, but for abilities: once a
 * '#tag' fails to resolve as a move (see SpeciesPickerCard.tsx's fallback
 * chain), it's tried as an ability name instead, and this hook fetches
 * PokeAPI's /ability/{name} endpoint - its `pokemon` field already lists
 * every species that can have it, so no per-species ability-list scan is
 * needed. Cached per-ability for the rest of the session, same as the
 * move cache.
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

/** Returns null while loading/inapplicable, or the set of matching species slugs (lowercase) */
export function usePokemonAbilityFilter(ability: string | null): Set<string> | null {
  const [result, setResult] = useState<Set<string> | null>(ability ? abilityUserCache.get(ability) ?? null : null);

  // Re-derives synchronously from cache the moment ability changes - set
  // during render rather than in an effect, see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [resolvedForAbility, setResolvedForAbility] = useState(ability);
  if (ability !== resolvedForAbility) {
    setResolvedForAbility(ability);
    setResult(ability ? abilityUserCache.get(ability) ?? null : null);
  }

  useEffect(() => {
    if (!ability || abilityUserCache.has(ability)) return;
    let cancelled = false;
    fetchAbilityUsers(ability).then(members => { if (!cancelled) setResult(members); });
    return () => { cancelled = true; };
  }, [ability]);

  return result;
}
