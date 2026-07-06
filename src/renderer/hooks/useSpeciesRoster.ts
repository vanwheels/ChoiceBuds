/**
 * useSpeciesRoster Hook - Full National Dex Roster Loader
 * Fetches the complete species list (name + id + sprite) once, for the
 * roster swap/add pickers. Called a single time at the App level and shared
 * via props - never re-fetched per PokemonCard instance.
 */

import { useState, useEffect } from 'react';
import type { SpeciesRosterEntry } from '../types/pokemon';
import { fetchJSON } from '../services/pokeapiService';

export interface UseSpeciesRosterReturn {
  roster: SpeciesRosterEntry[];
  isLoading: boolean;
}

interface PokeAPISpeciesListResponse {
  results: Array<{ name: string; url: string }>;
}

function extractIdFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}

function toDisplayName(apiName: string): string {
  return apiName
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

function getRosterSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

export function useSpeciesRoster(): UseSpeciesRosterReturn {
  const [roster, setRoster] = useState<SpeciesRosterEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchJSON<PokeAPISpeciesListResponse>('/pokemon-species?limit=2000')
      .then(data => {
        if (cancelled || !data) return;
        const entries: SpeciesRosterEntry[] = data.results.map(({ name, url }) => {
          const id = extractIdFromUrl(url);
          return { name: toDisplayName(name), id, spriteUrl: getRosterSpriteUrl(id) };
        });
        setRoster(entries);
      })
      .catch(err => console.error('Error loading species roster:', err))
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return { roster, isLoading };
}
