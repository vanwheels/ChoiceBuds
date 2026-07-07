/**
 * useSpeciesRoster Hook - Full National Dex Roster Loader
 * Fetches the complete POKEMON list (form-level, not species-level) once,
 * for the roster swap/add pickers - so "Ninetales" and "Alolan Ninetales"
 * are two independently selectable rows, each with its own correct sprite.
 * Called a single time at the App level and shared via props - never
 * re-fetched per PokemonCard instance.
 *
 * Mega-form entries are filtered out entirely: Mega Evolution is meant to be
 * derived from the base species + holding the matching Mega Stone, not a
 * separate roster slot pick.
 *
 * Backed by a localStorage cache (30 days, mirroring the other PokeAPI caches'
 * expiration convention): a fresh app launch on a warm cache renders the full
 * roster instantly instead of waiting on a large network response every
 * single startup.
 */

import { useState, useEffect } from 'react';
import type { SpeciesRosterEntry } from '../types/pokemon';
import { fetchJSON } from '../services/pokeapiService';

export interface UseSpeciesRosterReturn {
  roster: SpeciesRosterEntry[];
  isLoading: boolean;
}

interface PokeAPIPokemonListResponse {
  results: Array<{ name: string; url: string }>;
}

interface CachedRoster {
  entries: SpeciesRosterEntry[];
  cachedAt: number;
}

const CACHE_KEY = 'choicebuds:speciesRoster:v3';
const CACHE_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000;

/** Mega Evolution is item-driven (holding the right Mega Stone), not a roster pick */
const MEGA_FORM_PATTERN = /-mega(-x|-y)?$/;

function extractIdFromUrl(url: string): number {
  const match = url.match(/\/(\d+)\/?$/);
  return match ? Number(match[1]) : 0;
}

/**
 * "ninetales-alola" -> "Ninetales-Alola", matching this app's existing
 * species-naming convention for forms (e.g. "Rotom-Wash", "Basculegion-F").
 * Kept as a single round-trippable string - the same value is displayed,
 * fed to normalizeSpeciesForAPI for enrichment, and checked against the
 * ruleset's legality slugs, with no separate "raw slug" field needed.
 */
function toDisplayName(apiName: string): string {
  return apiName
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

function getRosterSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

function getRosterShinySpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/${id}.png`;
}

function readRosterCache(): SpeciesRosterEntry[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedRoster = JSON.parse(raw);
    if (Date.now() - parsed.cachedAt > CACHE_EXPIRATION_MS) return null;
    return parsed.entries;
  } catch {
    return null;
  }
}

function writeRosterCache(entries: SpeciesRosterEntry[]): void {
  try {
    const payload: CachedRoster = { entries, cachedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable - roster still works for this session, just re-fetches next launch
  }
}

export function useSpeciesRoster(): UseSpeciesRosterReturn {
  const cached = readRosterCache();
  const [roster, setRoster] = useState<SpeciesRosterEntry[]>(cached ?? []);
  const [isLoading, setIsLoading] = useState(!cached);

  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    fetchJSON<PokeAPIPokemonListResponse>('/pokemon?limit=2000')
      .then(data => {
        if (cancelled || !data) return;
        const entries: SpeciesRosterEntry[] = data.results
          .filter(({ name }) => !MEGA_FORM_PATTERN.test(name))
          .map(({ name, url }) => {
            const id = extractIdFromUrl(url);
            return { name: toDisplayName(name), id, spriteUrl: getRosterSpriteUrl(id), shinySpriteUrl: getRosterShinySpriteUrl(id) };
          });
        setRoster(entries);
        writeRosterCache(entries);
      })
      .catch(err => console.error('Error loading species roster:', err))
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { roster, isLoading };
}
