/**
 * useAbilityNameList Hook - Full Ability Name List for Autocomplete
 * Mirrors useMoveNameList.ts's shape exactly, but for abilities - added in
 * Search & Filter: Tag-Chip Redesign Leg 2 to give TagChipInput's ability
 * column candidate options, since no flat "all ability names" list existed
 * before (moves already had useMoveNameList.ts for the Battle Logger).
 * Fetched once lazily and cached module-level for the rest of the session.
 *
 * Names are prettified for display (hyphen -> space, each word
 * capitalized), same round-trip-through-normalizeNameForAPI property
 * useMoveNameList.ts documents - whatever's picked still resolves to the
 * right ability slug when normalized for the PokeAPI fetch.
 */

import { useState, useEffect } from 'react';
import { fetchAllAbilityNames } from '../services/pokeapiService';

function formatAbilityName(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

let cache: string[] | null = null;
let inflight: Promise<string[]> | null = null;

async function loadAbilityNames(): Promise<string[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = fetchAllAbilityNames()
      .then((names) => {
        cache = names.map(formatAbilityName);
        return cache;
      })
      .catch(() => []);
  }
  return inflight;
}

export function useAbilityNameList(): string[] {
  const [names, setNames] = useState<string[]>(cache ?? []);

  useEffect(() => {
    if (cache) return;
    let cancelled = false;
    loadAbilityNames().then((result) => {
      if (!cancelled) setNames(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return names;
}
