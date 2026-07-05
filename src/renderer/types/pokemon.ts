/**
 * Core TypeScript data models for ChoiceBuds Pokémon VGC Team Importer
 * Explicit interfaces for all data contracts - no 'as any' casting allowed
 */

/**
 * Represents a single Pokémon's stats
 */
export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

/**
 * Represents EVs (Effort Values) distribution
 */
export interface EVSpread {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}


/**
 * Parsed Pokémon data from Showdown/Pokepaste format
 * This represents the raw imported data before API enrichment
 */
export interface ShowdownPokemon {
  nickname?: string;
  species: string;
  gender?: 'M' | 'F' | 'N' | ''; // Male, Female, Genderless/Null, or empty
  item?: string;
  ability?: string;
  level: number;
  shiny: boolean;
  gigantamax: boolean;
  happiness: number;
  teraType?: string;
  nature?: string;
  evs: EVSpread;
  moves: string[];
}

/**
 * Enriched Pokémon data after fetching from PokeAPI
 * Combines parsed Showdown data with API-fetched metadata
 */
export interface ImportedPokemonInfo {
  // Parsed Showdown data
  showdownData: ShowdownPokemon;
  
  // API-enriched data
  pokedexNumber: number;
  types: string[];
  baseStats: PokemonStats;
  spriteUrl: string;
  
  // Computed fields
  calculatedStats?: PokemonStats;
  
  // Metadata
  importedAt: number; // Unix timestamp
}

/**
 * Represents a complete VGC team with metadata
 */
export interface Team {
  id: string; // UUID
  name: string;
  format: 'Reg M-A' | 'Reg M-B';
  pokemon: ImportedPokemonInfo[];
  createdAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
  notes?: string;
}

/**
 * Database schema state for teams storage
 * Represents the persisted state in userData directory
 */
export interface TeamsDatabase {
  version: number;
  teams: Team[];
  lastModified: number; // Unix timestamp
}

/**
 * Database schema state for PokeAPI cache
 * Reduces redundant API calls by caching species data
 */
export interface PokeAPICacheEntry {
  species: string; // Lowercase normalized
  pokedexNumber: number;
  types: string[];
  baseStats: PokemonStats;
  spriteUrl: string;
  abilities: string[];
  cachedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
}

export interface PokeAPICache {
  version: number;
  entries: Record<string, PokeAPICacheEntry>; // Key: lowercase species name
  lastCleaned: number; // Unix timestamp
}

/**
 * Active editor state for the current team being built/edited
 */
export interface EditorState {
  currentTeam: Team | null;
  isDirty: boolean; // Has unsaved changes
  selectedPokemonIndex: number | null;
  validationErrors: ValidationError[];
}

/**
 * Validation error structure for user feedback
 */
export interface ValidationError {
  pokemonIndex: number;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Parser result from parsing Showdown/Pokepaste text
 */
export interface ParseResult {
  success: boolean;
  pokemon: ShowdownPokemon[];
  errors: string[];
  rawBlocks: string[]; // Original text blocks for debugging
}

/**
 * Move metadata from PokeAPI
 * Stores comprehensive move data for dynamic card rendering
 */
export interface MoveData {
  name: string; // Lowercase normalized move name
  type: string; // Move type (e.g., "fighting", "fire")
  category: 'physical' | 'special' | 'status'; // Damage class
  power: number | null; // Base power (null for status moves)
  pp: number; // Power points
  accuracy: number | null; // Accuracy percentage (null for moves that never miss)
  description: string; // Effect description
  cachedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
}

/**
 * Item metadata from PokeAPI
 * Stores comprehensive item data for tooltips and descriptions
 */
export interface ItemData {
  name: string; // Lowercase normalized item name
  category: string; // Item category (e.g., "held-items", "choice")
  effect: string; // Short effect description
  description: string; // Full flavor text description
  spriteUrl: string; // Official sprite URL
  cachedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
}

/**
 * Ability metadata from PokeAPI
 * Stores comprehensive ability data for tooltips and descriptions
 */
export interface AbilityData {
  name: string; // Lowercase normalized ability name
  description: string; // Effect description
  cachedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
}

/**
 * Game data cache for moves, items, and abilities
 * Reduces redundant API calls by caching game metadata
 */
export interface GameDataCache {
  version: number;
  moves: Record<string, MoveData>; // Key: lowercase move name
  items: Record<string, ItemData>; // Key: lowercase item name
  abilities: Record<string, AbilityData>; // Key: lowercase ability name
  lastCleaned: number; // Unix timestamp
}
