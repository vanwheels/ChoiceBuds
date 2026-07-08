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
  author?: string; // Pokepaste pages have one; plain Showdown export text doesn't, so this is manually editable
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

export type BattleSide = 'player' | 'opponent';

/**
 * Frozen copy of one of the team's up-to-6 Pokemon at battle-start time,
 * independent of the live Team/ImportedPokemonInfo (which has no stable
 * per-Pokemon id) - editing or deleting the source team later never
 * touches a past log. Not all of these are necessarily brought to this
 * battle - see Battle.broughtIds.
 */
export interface BroughtPokemonSnapshot {
  id: string; // fresh crypto.randomUUID(), unrelated to the source Team's data
  species: string;
  nickname?: string;
  ability?: string;
  item?: string;
  teraType?: string;
  moves: string[];
  gender?: 'M' | 'F' | 'N' | '';
  pokedexNumber: number;
  types: string[];
  spriteUrl: string;
}

/**
 * One opponent Pokemon as revealed during a battle. Grows incrementally as
 * the user adds foes they see - ephemeral, per-battle only, never persisted
 * or aggregated across battles.
 */
export interface OpponentPokemonEntry {
  id: string;
  species: string;
  pokedexNumber: number;
  spriteUrl: string;
  types: string[]; // fetched live at add-time (see useBattleLogActions.ts::addOpponentPokemon) - powers type-effectiveness tags
  moves: string[]; // revealed moves, a growable tag list (not a fixed 4)
  ability?: string;
  item?: string;
  itemConsumed?: boolean; // true once a one-time consumable item (berry, Focus Sash, etc.) has triggered - see config/vgcData.ts::isConsumableItem
  fainted: boolean;
  addedAt: number; // Unix timestamp
}

/**
 * One logged action within a turn. `move`/`note` are freeform strings, not
 * an enum, so "Protect", "fainted to residual" etc. all just live in `note`
 * - this is a flexible manual log, not a rigid simulator. `target` is an
 * array since spread moves can hit 2 Pokemon at once. `phase` orders
 * display within a turn (send-ins/switches, then Mega Evolutions, then
 * moves, regardless of the order they were tapped in) - undefined is
 * treated as `'move'` so pre-existing logged actions still render
 * correctly. `'sendIn'` (an empty slot being filled - the start of battle
 * or a fainted slot's replacement) never costs the slot's turn action;
 * `'switch'` (a manual mid-turn swap of an already-occupied slot, or the
 * continuation of a switch-out move like U-turn) does - see
 * canActThisTurn/canSwitchOutThisTurn in utils/battleLookup.ts. `failed`
 * is only meaningful for Protect-family moves - see config/protectMoves.ts.
 */
export interface BattleAction {
  id: string;
  side: BattleSide;
  pokemonId: string; // id into playerRoster (player) or opponentRoster (opponent)
  move?: string;
  target?: { side: BattleSide; pokemonId: string }[];
  phase?: 'sendIn' | 'switch' | 'mega' | 'move';
  failed?: boolean;
  note?: string;
  // Type-effectiveness multiplier per target, computed at log time from the
  // move's type and each target's types (see config/typeEffectiveness.ts) -
  // only present for damaging moves, absent for status moves/self/field.
  effectiveness?: { pokemonId: string; multiplier: number }[];
  // The move's type/damage-class, snapshotted at log time (same pattern as
  // effectiveness above) - lets utils/battleLookup.ts's hit-reactive-ability
  // check (config/hitReactiveAbilities.ts) work from the stored action alone
  // without re-fetching move data. Absent for non-damaging/self/field moves.
  moveType?: string;
  moveCategory?: 'physical' | 'special' | 'status';
}

/**
 * A single in-game turn: an ordered sequence of actions exactly as observed
 * live (doubles = up to 4 actions/turn, 2 per side). No attempt is made to
 * predict/compute turn order from priority/abilities/speed - the user is
 * watching the real battle and records what actually happened, in order.
 */
export interface Turn {
  number: number;
  actions: BattleAction[];
}

export type WeatherType = 'rain' | 'sun' | 'sand' | 'snow';
export type TerrainType = 'electric' | 'grassy' | 'misty' | 'psychic';

/**
 * One side's screens/Tailwind/hazards. Turn-tracked fields (tailwind
 * through mist) store the turn number they were set on, not a live
 * countdown - see config/fieldConditions.ts's getRemainingTurns for how the
 * displayed countdown is derived, and useBattleLogActions.ts's
 * toggleTurnCondition for how they're set/cleared. Hazards have no
 * duration and persist until manually cleared (Rapid Spin/Defog/etc.).
 */
export interface SideConditions {
  tailwind?: number;
  reflect?: number;
  lightScreen?: number;
  auroraVeil?: number;
  safeguard?: number;
  mist?: number;
  stealthRock?: boolean;
  stickyWeb?: boolean;
  spikes?: number; // 0-3 layers
  toxicSpikes?: number; // 0-2 layers
  // Light Clay extends Reflect/Light Screen/Aurora Veil to 8 turns instead of
  // the standard 5 - Tailwind/Safeguard/Mist have no extending item in this
  // game, so they have no equivalent flag. See config/fieldConditions.ts.
  reflectExtended?: boolean;
  lightScreenExtended?: boolean;
  auroraVeilExtended?: boolean;
}

/**
 * Current field state for a battle - a single live snapshot (not per-turn
 * history), matching the existing playerActiveIds/opponentActiveIds
 * pattern. Weather/terrain are field-wide; screens/hazards are per-side.
 * `wasMegaEvolved` drives duration confidence in FieldWeatherBar - a Mega's
 * ability-triggered weather/terrain is always the fixed 5-turn duration
 * (a Mega Stone occupies the item slot, so no duration-extending rock is
 * possible), while a regular ability trigger is uncertain (5 or 8 turns,
 * depending on an unrevealed held rock).
 */
export interface FieldState {
  weather?: { type: WeatherType; setOnTurn: number; wasMegaEvolved?: boolean };
  terrain?: { type: TerrainType; setOnTurn: number; wasMegaEvolved?: boolean };
  trickRoom?: { setOnTurn: number }; // always move-set, fixed 5-turn duration - never ability-triggered, so no mega confidence needed
  playerSide: SideConditions;
  opponentSide: SideConditions;
}

/** The 5 stats VGC play actually stages up/down in practice - see config/onSwitchInAbilities.ts. */
export type StatKey = 'atk' | 'def' | 'spa' | 'spd' | 'spe';

/** One Pokemon's current stat stages, -6..6 each. Absent key = 0 (unboosted). */
export type StatStages = Partial<Record<StatKey, number>>;

/**
 * One manually-logged Pokemon Champions VGC battle (doubles). See
 * useBattleLogActions.ts for the higher-level mutations that build/update
 * these records.
 */
export interface Battle {
  id: string;
  date: number; // Unix timestamp
  teamId: string; // links back to the source Team (may later be edited/deleted)
  teamName: string; // snapshot - display never breaks if the team is renamed/deleted
  format: Team['format'];
  playerRoster: BroughtPokemonSnapshot[]; // all of the team brought to Team Preview, up to 6
  broughtIds: string[]; // 0-4 ids from playerRoster - which of the 6 were actually brought to this battle
  // Fixed 2-element tuple - index IS the left/right field position, `null` = empty.
  // Never shrunk/spliced when a Pokemon leaves, so the other slot's position
  // never shifts - see utils/battleLookup.ts's compactActiveIds for call
  // sites that just need a plain id list.
  playerActiveIds: (string | null)[]; // ids from broughtIds
  playerFaintedIds: string[]; // ids from playerRoster
  opponentRoster: OpponentPokemonEntry[]; // starts empty, grows during the battle
  opponentActiveIds: (string | null)[]; // ids from opponentRoster, same fixed-slot shape as playerActiveIds
  megaEvolvedIds: string[]; // ids (either roster) that have Mega Evolved this battle
  statStages: Record<string, StatStages>; // keyed by pokemonId, either roster - cleared when that id leaves the field (bench/faint)
  turns: Turn[];
  fieldState: FieldState;
  result: 'win' | 'loss' | 'in-progress';
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface BattlesDatabase {
  version: number;
  battles: Battle[];
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
  flags: string[]; // Move flags (sound/bullet/punch/etc.) - see config/moveFlags.ts
  target: string; // Raw PokeAPI target slug (e.g. "selected-pokemon", "all-opponents") - see config/moveTargeting.ts
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
 * Per-species legal learnset: which moves and abilities a given species
 * can actually have, as reported by PokeAPI's /pokemon/{species} endpoint
 */
export interface SpeciesLearnsetEntry {
  species: string; // Normalized PokeAPI slug (gender-form aware)
  abilities: string[]; // Lowercase ability names this species can have
  moves: string[]; // Lowercase move names this species can naturally learn
  cachedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
}

/**
 * A single entry in the full national dex roster, used by the roster
 * swap/add pickers (Team Builder). Loaded once app-wide, not per-card.
 */
export interface SpeciesRosterEntry {
  name: string; // Display name (Title-Case, hyphens preserved for forms)
  id: number; // National Pokedex number
  spriteUrl: string; // Pixel sprite URL (same convention as PokemonCard)
  shinySpriteUrl: string; // Shiny variant of spriteUrl (same convention as PokemonCard)
}

/**
 * Game data cache for moves, items, abilities, and species learnsets
 * Reduces redundant API calls by caching game metadata
 */
export interface GameDataCache {
  version: number;
  moves: Record<string, MoveData>; // Key: lowercase move name
  items: Record<string, ItemData>; // Key: lowercase item name
  abilities: Record<string, AbilityData>; // Key: lowercase ability name
  learnsets: Record<string, SpeciesLearnsetEntry>; // Key: normalized species slug
  lastCleaned: number; // Unix timestamp
  // Set once the one-time bulk first-launch sync (useInitialSync) has completed -
  // null means it still needs to run.
  initialBulkSyncCompletedAt: number | null;
}
