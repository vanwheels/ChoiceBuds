/**
 * Core TypeScript data models for ChoiceBuds Pokémon VGC Team Importer
 * Explicit interfaces for all data contracts - no 'as any' casting allowed
 *
 * This is the barrel: every one of the 113+ importers across the app keeps
 * importing from `types/pokemon` regardless of which domain file a type
 * actually lives in (not worth a mass path rewrite). It holds the core
 * team/Pokemon-set types itself, and re-exports the three domain files below
 * - see CLAUDE.md's Architecture section for what goes where when adding a
 * new field type: Team/roster shapes here, Battle Logger shapes in
 * `types/battle.ts`, settings/sync-payload shapes in `types/settings.ts`,
 * cached PokeAPI/Champions-usage shapes in `types/gameData.ts`.
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
  // Stable identity for this roster slot's occupant, independent of its
  // array position - added for the roster drag-reorder animation (leg 4,
  // see TODO.md): a reorder must keep the SAME React element/DOM node
  // attached to the moved Pokemon so Framer Motion's `layout` prop can
  // animate it sliding to its new slot, rather than keying by array index
  // (which changes on every reorder and forces an unmount/remount instead
  // of a slide). Generated once via crypto.randomUUID() at enrichment time
  // (services/pokeapi.ts::enrichPokemonWithAPI, the single choke point
  // every roster slot - import, add, swap - is built through). Teams
  // persisted before this field existed are backfilled at the read
  // boundary (useTeams.ts::loadTeamsFromDisk), same pattern as
  // useBattles.ts's normalizeBattle.
  id: string;
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
  author?: string; // Pokepaste pages have one; plain Showdown export text doesn't, so this is manually editable
  // Tournament-specific, unlike PlayerProfile below (which is stable across
  // events) - a "Battle Team" is the in-game Switch roster this saved Team
  // represents, registered fresh (and often renumbered) per event. Both feed
  // the single "Battle Team Number / Name:" blank on the official VGC team
  // sheet (see services/teamSheetPdf.ts) - kept as two fields since the form
  // itself distinguishes them, joined at generation time.
  battleTeamNumber?: string;
  battleTeamName?: string;
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
 * One individually-saved Pokémon set on the Calc page - a flat library, not
 * nested under a Team (which is always a fixed 6-slot roster). `label`
 * defaults to nickname||species at save time, deduped on collision, but is
 * user-renamable since more than one set can exist per species.
 */
export interface SavedPokemonEntry {
  id: string; // UUID
  label: string;
  pokemon: ImportedPokemonInfo;
  savedAt: number; // Unix timestamp
  updatedAt: number; // Unix timestamp
}

/**
 * Database schema state for saved-Pokemon-set storage (savedPokemon.json)
 */
export interface SavedPokemonDatabase {
  version: number;
  savedPokemon: SavedPokemonEntry[];
  lastModified: number; // Unix timestamp
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

/** The 5 stats VGC play actually stages up/down in practice - see config/onSwitchInAbilities.ts. */
export type StatKey = 'atk' | 'def' | 'spa' | 'spd' | 'spe';

/** One Pokemon's current stat stages, -6..6 each. Absent key = 0 (unboosted). */
export type StatStages = Partial<Record<StatKey, number>>;

export * from './battle';
export * from './settings';
export * from './gameData';
