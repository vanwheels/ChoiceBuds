/**
 * Cached game-data domain types: PokeAPI species/move/item/ability/learnset
 * caches and Pokemon Champions ranked-usage data. Split out of
 * types/pokemon.ts (see CLAUDE.md's Architecture section).
 */

import type { PokemonStats, RegulationLabel, EVSpread } from './pokemon';

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
  // PokeAPI's secondary-effect metadata (its own /move/{id} `meta` object) -
  // ailment/flinch/crit-rate data. `ailment` is PokeAPI's raw ailment slug
  // (e.g. "paralysis", "none") - see config/statusConditions.ts's
  // mapAilmentToStatus for how this gets narrowed to our own StatusCondition
  // type. Added after `target` - see useGameData.ts's getCachedMove for how
  // a pre-existing cache entry missing this field is treated as a miss.
  meta?: { ailment: string; ailmentChance: number; flinchChance: number; critRate: number };
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
  // True when `moves` was narrowed using PokeAPI's own "champions" version-group
  // move tags (real per-species data); false when PokeAPI had zero champions-tagged
  // moves for this species yet and `moves` is the untouched all-time fallback list.
  // Drives whether config/championsMovepoolChanges.ts's hand-curated corrections
  // get applied at the read boundary - see useGameData.ts. Live PokeAPI data is
  // trusted over the hand table whenever it's actually available.
  hasChampionsMoveData: boolean;
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
 * One ranked entry within a Pokemon Champions usage category (move/held
 * item/ability all share this shape) - see services/championsBattleData.ts
 */
export interface ChampionsUsageRankedEntry {
  name: string; // already Title Case as returned by the API - no formatting needed
  percentage: number; // 0-100
}

/** A ranked nature entry - the API calls this category "stat_alignment" */
export interface ChampionsUsageNatureEntry extends ChampionsUsageRankedEntry {
  statUp?: string; // e.g. "Attack"
  statDown?: string; // e.g. "Sp. Atk"
}

/**
 * One ranked Stat Point spread - already on this app's native 0-32-per-stat
 * scale (utils/championsStats.ts), matching @smogon/calc's StatsTable key
 * convention so a future Calc-page fast-follow can feed it straight into
 * spsToEvs() with no remapping.
 */
export interface ChampionsUsageStatSpreadEntry {
  percentage: number;
  points: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number };
}

/**
 * One species' parsed Pokemon Champions ranked-ladder usage snapshot
 * (championsbattledata.com's /api/battle/Doubles/:name - see
 * services/championsBattleData.ts), grouped by category and sorted by rank
 * ascending. Powers the Battle Logger's "likely sets" suggestion panel - a
 * separate, clearly-unconfirmed display. Never written into
 * OpponentPokemonEntry's real ability/item/moves fields - see that type's
 * own doc comment for why those must stay "actually observed". The
 * source API's `teammate` category isn't parsed/surfaced here - out of
 * scope for the current suggestion panel.
 */
export interface ChampionsUsageEntry {
  species: string; // this app's own species string, gender-suffix stripped
  season: string; // API's own season string (e.g. "Season M-3") - display-only, never matched against config/seasons.ts
  moves: ChampionsUsageRankedEntry[];
  items: ChampionsUsageRankedEntry[];
  abilities: ChampionsUsageRankedEntry[];
  natures: ChampionsUsageNatureEntry[];
  statSpreads: ChampionsUsageStatSpreadEntry[];
  // The site's own ladder-wide usage ordering (lower = more used) - every row
  // in a /api/battle/:format/:name response carries this, constant per
  // species (confirmed live, sourced from the site's underlying wide-format
  // usage CSV). Falls back to Number.MAX_SAFE_INTEGER (sorts last) on the
  // theoretical zero-row response. Powers Team Gap Analysis's ranked-gap-list
  // feature (see TODO.md) - unused by anything yet in this leg.
  columnPosition: number;
  cachedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
}

/**
 * Game data cache for moves, items, abilities, species learnsets, and
 * Pokemon Champions ranked-usage suggestions
 * Reduces redundant API calls by caching game metadata
 */
export interface GameDataCache {
  version: number;
  moves: Record<string, MoveData>; // Key: lowercase move name
  items: Record<string, ItemData>; // Key: lowercase item name
  abilities: Record<string, AbilityData>; // Key: lowercase ability name
  learnsets: Record<string, SpeciesLearnsetEntry>; // Key: normalized species slug
  usage: Record<string, ChampionsUsageEntry>; // Key: species, lowercased, gender-suffix stripped
  lastCleaned: number; // Unix timestamp
  // Names (SpeciesRosterEntry.name) of every legal-roster species that has
  // completed the full first-launch/delta sync (useInitialSync) - sprites,
  // moves, abilities, learnset, and PokeAPICache species stats. Diffed
  // against the current legal roster on every launch so a species newly
  // added by a future regulation update gets synced too, not just species
  // present the very first time this ever ran.
  lastSyncedSpeciesNames: string[];
}

/**
 * One real tournament team row pulled from the VGCPastes public Google
 * Sheet (services/vgcPastes.ts) - only rows the sheet itself flags
 * `EVs == Yes` ever become one of these (see that service's filtering).
 * `species` is the sheet's own plain-text 6-species list, kept as-is for
 * display only - no per-species parsing/normalization this leg (that's
 * VGCPastes Per-Species Real-Set Extraction, see TODO.md).
 */
export interface VgcPasteTeamRow {
  id: string; // Team ID, e.g. "MC254"
  description: string;
  owner: string;
  tournament: string;
  rank: string;
  date: string; // raw sheet string, display-only
  pokepasteUrl: string;
  species: string[]; // the sheet's own species text, display-only
  // Added for Notes Auto-Population (Leg 4, see TODO.md). Raw sheet text,
  // untouched - the sheet uses "-" as its own placeholder for "not filled
  // in" across all three, same as it sometimes does for tournament/rank, so
  // callers building display text (services/vgcPastes.ts's
  // buildCatalogNotes) are the ones that treat "-"/blank as "omit this
  // line", not this parsing layer.
  linkToSource: string; // column AG - usually a social-media post URL, "No Tweet" text is also a real observed value here
  reportVideo: string; // column AH - a video/report URL
  otherLinks: string; // column AI - e.g. a tournament standings page
}

/**
 * Persisted cache backing the sample-team catalog (useVgcPastesCache.ts) -
 * manually refreshed per regulation (a button, no background job), so a
 * regulation with no entry here simply hasn't been pulled yet.
 */
export interface VgcPastesCache {
  version: number;
  rowsByRegulation: Partial<Record<RegulationLabel, VgcPasteTeamRow[]>>;
  lastFetchedAtByRegulation: Partial<Record<RegulationLabel, number>>;
}

/**
 * One distinct move/item/ability/nature/EV bundle extracted from real
 * tournament pastes for a given species (services/vgcRealSets.ts) - see
 * TODO.md's VGCPastes Per-Species Real-Set Extraction leg and
 * docs/investigations/vgcpastes-realset-extraction-scope.md for the scoping
 * session. `moves` is stored alphabetically sorted (not source order) so two
 * pastes listing the same four moves in a different order still dedupe into
 * one bundle - order isn't meaningful in a Showdown export anyway.
 */
export interface VgcRealSetBundle {
  item?: string;
  ability?: string;
  nature?: string;
  moves: string[];
  evs: EVSpread;
  occurrences: number; // how many sampled pastes had this exact bundle
}

/**
 * One species' extracted real-set data for one regulation - persisted in
 * VgcRealSetsCache, keyed by regulation then normalizeUsageCacheKey(species)
 * (services/championsBattleData.ts - the same species-key convention
 * GameDataCache.usage already uses). `sampledTeamCount` (M) alongside each
 * bundle's own `occurrences` (N) is what gives the "seen in N of M sampled
 * teams" signal the scoping session called for.
 */
export interface VgcRealSetsEntry {
  species: string; // normalizeUsageCacheKey(species) - the key this entry was extracted for
  sampledTeamCount: number;
  bundles: VgcRealSetBundle[];
  fetchedAt: number; // Unix timestamp of this extraction
}

/**
 * Persisted cache backing useVgcRealSetsCache.ts. Extraction is strictly
 * on-demand per (regulation, species) - the first time Calc looks a species
 * up against that regulation's already-cached VgcPasteTeamRow[] - never
 * eager/bulk across a whole regulation tab. Once extracted for a species it
 * never expires (a real tournament team's own history doesn't change
 * retroactively) and is simply never re-fetched, same "never re-fetched"
 * precedent as VgcPastesCache's own manual-refresh-only rows, just at the
 * species level instead of the regulation level.
 */
export interface VgcRealSetsCache {
  version: number;
  entriesByRegulation: Partial<Record<RegulationLabel, Record<string, VgcRealSetsEntry>>>;
}
