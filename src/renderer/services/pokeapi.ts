/**
 * Network communication service for PokeAPI integration
 * Direct fetch pipelines to https://pokeapi.co REST endpoints
 * NO web scraping or proxy middleware - official API only
 * All returned strings are forced to lowercase before hitting state
 */

import type { PokemonStats, PokeAPICacheEntry } from '../types/pokemon';

/**
 * Base URL for PokeAPI v2
 */
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';

/**
 * Cache duration: 7 days in milliseconds
 */
const CACHE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Raw PokeAPI response structure for pokemon endpoint
 * Only includes fields we actually use
 */
interface PokeAPISpeciesResponse {
  id: number;
  name: string;
  types: Array<{
    slot: number;
    type: {
      name: string;
    };
  }>;
  stats: Array<{
    base_stat: number;
    stat: {
      name: string;
    };
  }>;
  sprites: {
    front_default: string | null;
    other?: {
      'official-artwork'?: {
        front_default: string | null;
      };
    };
  };
  abilities: Array<{
    ability: {
      name: string;
    };
    is_hidden: boolean;
  }>;
}

/**
 * Fetches Pokémon data from PokeAPI
 * @param speciesName - Pokémon species name (will be normalized to lowercase)
 * @returns Promise resolving to PokeAPICacheEntry
 * @throws Error if fetch fails or species not found
 */
export async function fetchPokemonData(speciesName: string): Promise<PokeAPICacheEntry> {
  // Normalize species name to lowercase and remove special characters
  const normalizedName = normalizeSpeciesName(speciesName);
  
  // Construct API URL
  const url = `${POKEAPI_BASE_URL}/pokemon/${normalizedName}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Pokémon species "${speciesName}" not found in PokeAPI`);
      }
      throw new Error(`PokeAPI request failed with status ${response.status}`);
    }
    
    const data: PokeAPISpeciesResponse = await response.json();
    
    // Transform API response to our cache entry format
    return transformAPIResponse(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch Pokémon data: ${String(error)}`);
  }
}

/**
 * Normalizes species name for API requests
 * Converts to lowercase, handles special forms and characters
 * @param name - Raw species name
 * @returns Normalized lowercase species name
 */
function normalizeSpeciesName(name: string): string {
  let normalized = name.toLowerCase().trim();
  
  // Handle common special cases
  normalized = normalized.replace(/['']/g, ''); // Remove apostrophes
  normalized = normalized.replace(/\s+/g, '-'); // Spaces to hyphens
  normalized = normalized.replace(/[.]/g, ''); // Remove periods
  
  // Handle specific form names that PokeAPI expects
  const formMappings: Record<string, string> = {
    'nidoran-f': 'nidoran-f',
    'nidoran-m': 'nidoran-m',
    'mr-mime': 'mr-mime',
    'mime-jr': 'mime-jr',
    'type-null': 'type-null',
    'tapu-koko': 'tapu-koko',
    'tapu-lele': 'tapu-lele',
    'tapu-bulu': 'tapu-bulu',
    'tapu-fini': 'tapu-fini',
  };
  
  return formMappings[normalized] || normalized;
}

/**
 * Transforms raw PokeAPI response into our cache entry format
 * Forces all string values to lowercase
 * @param data - Raw API response
 * @returns Formatted PokeAPICacheEntry
 */
function transformAPIResponse(data: PokeAPISpeciesResponse): PokeAPICacheEntry {
  const now = Date.now();
  
  // Extract types array (forced to lowercase)
  const types = data.types
    .sort((a, b) => a.slot - b.slot)
    .map(t => t.type.name.toLowerCase());
  
  // Extract base stats
  const baseStats: PokemonStats = {
    hp: 0,
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0,
  };
  
  for (const stat of data.stats) {
    const statName = stat.stat.name.toLowerCase();
    switch (statName) {
      case 'hp':
        baseStats.hp = stat.base_stat;
        break;
      case 'attack':
        baseStats.attack = stat.base_stat;
        break;
      case 'defense':
        baseStats.defense = stat.base_stat;
        break;
      case 'special-attack':
        baseStats.specialAttack = stat.base_stat;
        break;
      case 'special-defense':
        baseStats.specialDefense = stat.base_stat;
        break;
      case 'speed':
        baseStats.speed = stat.base_stat;
        break;
    }
  }
  
  // Extract sprite URL (prefer official artwork, fallback to front_default)
  let spriteUrl = data.sprites.front_default || '';
  if (data.sprites.other?.['official-artwork']?.front_default) {
    spriteUrl = data.sprites.other['official-artwork'].front_default;
  }
  
  // Extract abilities (forced to lowercase)
  const abilities = data.abilities.map(a => a.ability.name.toLowerCase());
  
  return {
    species: data.name.toLowerCase(),
    pokedexNumber: data.id,
    types,
    baseStats,
    spriteUrl,
    abilities,
    cachedAt: now,
    expiresAt: now + CACHE_DURATION_MS,
  };
}

/**
 * Fetches item sprite URL from PokeAPI
 * @param itemName - Item name (will be normalized to lowercase)
 * @returns Promise resolving to sprite URL or null if not found
 */
export async function fetchItemSprite(itemName: string): Promise<string | null> {
  const normalizedName = itemName.toLowerCase().trim().replace(/\s+/g, '-');
  const url = `${POKEAPI_BASE_URL}/item/${normalizedName}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      return null; // Item not found, return null instead of throwing
    }
    
    const data = await response.json();
    return data.sprites?.default || null;
  } catch (error) {
    console.warn(`Failed to fetch item sprite for "${itemName}":`, error);
    return null;
  }
}

/**
 * Validates if a cache entry is still valid (not expired)
 * @param entry - Cache entry to validate
 * @returns True if cache entry is still valid
 */
export function isCacheEntryValid(entry: PokeAPICacheEntry): boolean {
  return Date.now() < entry.expiresAt;
}

/**
 * Batch fetches multiple Pokémon data entries
 * Useful for importing full teams
 * @param speciesNames - Array of species names
 * @returns Promise resolving to array of cache entries (nulls for failures)
 */
export async function fetchPokemonBatch(
  speciesNames: string[]
): Promise<Array<PokeAPICacheEntry | null>> {
  const promises = speciesNames.map(async (name) => {
    try {
      return await fetchPokemonData(name);
    } catch (error) {
      console.error(`Failed to fetch data for "${name}":`, error);
      return null;
    }
  });
  
  return Promise.all(promises);
}
