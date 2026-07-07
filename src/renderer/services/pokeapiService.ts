/**
 * Raw PokeAPI fetch layer for game metadata (moves, items, abilities, and
 * per-species learnsets). Pure network + parsing - no React state, no cache
 * mutation. Callers (useGameData) own caching and loading/error state.
 */

import type { AbilityData, ItemData, MoveData, SpeciesLearnsetEntry } from '../types/pokemon';
import { normalizeSpeciesForAPI } from './pokeapi';

export const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';

/**
 * Cache expiration duration: 30 days in milliseconds
 * Move/item/ability/learnset data is static, so long cache duration is acceptable
 */
export const CACHE_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Normalize move/item/ability name for API requests and cache keys
 * Enhanced sanitizer for items like 'Fairy Feather' to map cleanly to 'fairy-feather'
 */
export function normalizeNameForAPI(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove all non-alphanumeric except spaces and hyphens
    .replace(/[\s_]+/g, '-'); // Spaces and underscores to hyphens
}

interface PokeAPIEffectEntry {
  language?: { name: string };
  effect?: string;
  short_effect?: string;
}

interface PokeAPIFlavorTextEntry {
  language?: { name: string };
  text?: string;
}

interface PokeAPIMoveResponse {
  type?: { name?: string };
  damage_class?: { name?: string };
  power: number | null;
  pp?: number;
  accuracy: number | null;
  effect_entries?: PokeAPIEffectEntry[];
}

interface PokeAPIItemResponse {
  category?: { name?: string };
  effect_entries?: PokeAPIEffectEntry[];
  flavor_text_entries?: PokeAPIFlavorTextEntry[];
  sprites?: { default?: string | null };
}

interface PokeAPIAbilityResponse {
  effect_entries?: PokeAPIEffectEntry[];
}

interface PokeAPISpeciesResponse {
  abilities?: Array<{ ability: { name: string } }>;
  moves?: Array<{ move: { name: string } }>;
}

function extractEffectDescription(effectEntries: PokeAPIEffectEntry[] | undefined, fallback: string): string {
  if (!effectEntries || effectEntries.length === 0) return fallback;
  const englishEntry = effectEntries.find(entry => entry.language?.name === 'en');
  const source = englishEntry ?? effectEntries[0];
  return source?.short_effect || source?.effect || fallback;
}

function extractItemDescription(flavorTextEntries: PokeAPIFlavorTextEntry[] | undefined): string {
  if (!flavorTextEntries || flavorTextEntries.length === 0) return 'No description available';
  const englishEntries = flavorTextEntries.filter(entry => entry.language?.name === 'en');
  const latestEntry = englishEntries.length > 0 ? englishEntries[englishEntries.length - 1] : flavorTextEntries[0];
  return latestEntry?.text?.replace(/\n/g, ' ').trim() || 'No description available';
}

export async function fetchJSON<T>(path: string): Promise<T | null> {
  const response = await fetch(`${POKEAPI_BASE_URL}${path}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`PokeAPI request failed with status ${response.status}`);
  }
  return response.json() as Promise<T>;
}

/**
 * Fetches and shapes a single move's metadata from PokeAPI
 */
export async function fetchMoveData(normalizedName: string): Promise<MoveData | null> {
  const data = await fetchJSON<PokeAPIMoveResponse>(`/move/${normalizedName}`);
  if (!data) return null;

  const now = Date.now();
  return {
    name: normalizedName,
    type: data.type?.name?.toLowerCase() || 'normal',
    category: (data.damage_class?.name?.toLowerCase() || 'status') as 'physical' | 'special' | 'status',
    power: data.power,
    pp: data.pp || 0,
    accuracy: data.accuracy,
    description: extractEffectDescription(data.effect_entries, 'No description available'),
    cachedAt: now,
    expiresAt: now + CACHE_EXPIRATION_MS,
  };
}

/**
 * Fetches and shapes a single item's metadata from PokeAPI
 */
export async function fetchItemData(normalizedName: string): Promise<ItemData | null> {
  const data = await fetchJSON<PokeAPIItemResponse>(`/item/${normalizedName}`);
  if (!data) return null;

  const now = Date.now();
  let itemEffect = extractEffectDescription(data.effect_entries, 'No effect available');
  let itemDescription = extractItemDescription(data.flavor_text_entries);

  // Bug Fix: Hardcoded fallback for Fairy Feather description
  if (normalizedName === 'fairy-feather') {
    if (!itemEffect || itemEffect === 'No effect available') {
      itemEffect = 'An item to be held by a Pokémon. It boosts the power of Fairy-type moves.';
    }
    if (!itemDescription || itemDescription === 'No description available') {
      itemDescription = 'An item to be held by a Pokémon. It boosts the power of Fairy-type moves.';
    }
  }

  return {
    name: normalizedName,
    category: data.category?.name?.toLowerCase() || 'held-items',
    effect: itemEffect,
    description: itemDescription,
    spriteUrl: data.sprites?.default || '',
    cachedAt: now,
    expiresAt: now + CACHE_EXPIRATION_MS,
  };
}

/**
 * Fetches and shapes a single ability's metadata from PokeAPI
 */
export async function fetchAbilityData(normalizedName: string): Promise<AbilityData | null> {
  const data = await fetchJSON<PokeAPIAbilityResponse>(`/ability/${normalizedName}`);
  if (!data) return null;

  const now = Date.now();
  return {
    name: normalizedName,
    description: extractEffectDescription(data.effect_entries, 'No description available'),
    cachedAt: now,
    expiresAt: now + CACHE_EXPIRATION_MS,
  };
}

/**
 * Fetches a species' true legal learnset (abilities + learnable moves) from
 * PokeAPI. This is the validation source of truth for what a given species
 * can actually have equipped - never a static or per-Pokemon fallback list.
 * Reuses normalizeSpeciesForAPI so gender-divergent species (Basculegion,
 * Indeedee, Oinkologne, Meowstic) resolve to the same slug used everywhere else.
 */
export async function fetchSpeciesLearnset(
  species: string,
  gender?: 'M' | 'F' | 'N' | ''
): Promise<SpeciesLearnsetEntry | null> {
  const normalizedSpecies = normalizeSpeciesForAPI(species, gender);
  const data = await fetchJSON<PokeAPISpeciesResponse>(`/pokemon/${normalizedSpecies}`);
  if (!data) return null;

  const now = Date.now();
  return {
    species: normalizedSpecies,
    abilities: (data.abilities || []).map(a => a.ability.name.toLowerCase()),
    moves: (data.moves || []).map(m => m.move.name.toLowerCase()),
    cachedAt: now,
    expiresAt: now + CACHE_EXPIRATION_MS,
  };
}
