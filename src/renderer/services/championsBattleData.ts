/**
 * Network communication service for championsbattledata.com's public /api/*
 * JSON endpoints - real Pokemon Champions ranked-ladder usage data (moves,
 * held items, abilities, natures, Stat Point spreads). No auth, CORS-enabled.
 * See CLAUDE.md's "Fourth exception" for the project-policy authorization.
 *
 * Species-name normalization here is NOT the same problem
 * services/pokeapi.ts::normalizeSpeciesForAPI solves - this site has its own
 * naming convention and its own (smaller) Pokedex, verified empirically
 * against the live API, not guessed:
 *  - The site's /api/index endpoint is the real normalization table (each
 *    entry's own `battleName` is the exact string /api/battle/:format/:name
 *    wants) - a hand-rolled slug transform would silently break on
 *    multi-word/regional-form species (e.g. "Alolan Ninetales").
 *  - Pokemon Champions has a materially smaller roster than mainline SV -
 *    Iron Hands, Flutter Mane, every Paradox/Treasure of Ruin, Ogerpon,
 *    Landorus/Tornadus, Tapu-anything, Ursaluna, Mr. Mime, Indeedee, and
 *    Oinkologne all have no page at all. A missing species is an expected,
 *    common outcome, not an error.
 *  - Of this app's 4 gendered-suffix species (config/pokemonRules.ts), only
 *    Basculegion and Meowstic exist in Champions, and both resolve to one
 *    shared dataset regardless of gender - so normalization only needs to
 *    strip this app's own trailing "-F" suffix before the index lookup.
 *  - There is currently no queryable per-season archive - the `season`
 *    query param only resolves for the exact "Current" season's own label
 *    (confirmed live: a same-day dated static-asset snapshot the site
 *    exposes is byte-identical to the live data), so it's never passed.
 */

import type { ChampionsUsageEntry, ChampionsUsageRankedEntry, ChampionsUsageNatureEntry, ChampionsUsageStatSpreadEntry } from '../types/pokemon';

const CHAMPIONS_BASE_URL = 'https://championsbattledata.com';

/**
 * Cache duration: 5 days in milliseconds. Shorter than PokeAPI-sourced
 * sections' 30 days (species data is static) since ranked-ladder usage
 * shifts meaningfully week to week - 5 days refreshes at worst once per
 * tournament weekend without re-fetching every single session.
 */
export const USAGE_CACHE_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

interface ChampionsIndexPokemonPage {
  name: string;
  slug: string;
  battleName: string;
  baseName: string;
  isForm: boolean;
}

interface ChampionsIndexResponse {
  pokemonPages: ChampionsIndexPokemonPage[];
}

interface ChampionsBattleDataRow {
  category: 'move' | 'held_item' | 'ability' | 'stat_alignment' | 'stat_points' | 'teammate' | string;
  rank: number;
  name?: string;
  percentage_value?: number;
  stat_up?: string;
  stat_down?: string;
  hp_points?: number | '';
  attack_points?: number | '';
  defense_points?: number | '';
  sp_atk_points?: number | '';
  sp_def_points?: number | '';
  speed_points?: number | '';
}

interface ChampionsBattleDataResponse {
  pokemon: string;
  season: string;
  rows: ChampionsBattleDataRow[];
}

/**
 * Strips this app's own "-F" gender-suffix storage convention
 * (config/pokemonRules.ts's GENDERED_FORM_VARIANTS - bare species name is
 * always this app's unmarked-default/male form) before an index lookup.
 */
function stripGenderSuffix(species: string): string {
  return species.replace(/-F$/i, '');
}

// Memoized per app session (not persisted) - cheap (~357 entries), re-fetched
// fresh each launch so newly-added Champions species show up without a
// stale multi-day cache.
let indexPromise: Promise<ChampionsIndexPokemonPage[]> | null = null;

async function getBattleNameIndex(): Promise<ChampionsIndexPokemonPage[]> {
  if (!indexPromise) {
    indexPromise = fetch(`${CHAMPIONS_BASE_URL}/api/index`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Champions battle-data index request failed with status ${response.status}`);
        }
        return response.json();
      })
      .then((data: ChampionsIndexResponse) => data.pokemonPages)
      .catch(error => {
        indexPromise = null; // allow a retry on the next call rather than caching a failure forever
        throw error;
      });
  }
  return indexPromise;
}

/**
 * Resolves this app's species string to championsbattledata.com's own
 * `battleName`, or null if the species has no Champions usage page (not an
 * error - Champions' roster is materially smaller than mainline SV).
 */
export async function resolveChampionsBattleName(species: string): Promise<string | null> {
  const normalized = stripGenderSuffix(species).toLowerCase().trim();
  const index = await getBattleNameIndex();
  const match = index.find(page => page.name.toLowerCase() === normalized || page.slug.toLowerCase() === normalized);
  return match?.battleName ?? null;
}

/** Cache key for GameDataCache.usage - species, lowercased, gender-suffix stripped */
export function normalizeUsageCacheKey(species: string): string {
  return stripGenderSuffix(species).toLowerCase().trim();
}

function toStatPoints(row: ChampionsBattleDataRow): ChampionsUsageStatSpreadEntry {
  return {
    percentage: row.percentage_value ?? 0,
    points: {
      hp: row.hp_points || 0,
      atk: row.attack_points || 0,
      def: row.defense_points || 0,
      spa: row.sp_atk_points || 0,
      spd: row.sp_def_points || 0,
      spe: row.speed_points || 0,
    },
  };
}

function toRankedEntry(row: ChampionsBattleDataRow): ChampionsUsageRankedEntry {
  return { name: row.name ?? '', percentage: row.percentage_value ?? 0 };
}

function toNatureEntry(row: ChampionsBattleDataRow): ChampionsUsageNatureEntry {
  return { ...toRankedEntry(row), statUp: row.stat_up || undefined, statDown: row.stat_down || undefined };
}

function groupRowsByCategory(species: string, data: ChampionsBattleDataResponse): ChampionsUsageEntry {
  const byRank = (a: ChampionsBattleDataRow, b: ChampionsBattleDataRow) => a.rank - b.rank;
  const rowsFor = (category: string) => data.rows.filter(row => row.category === category).sort(byRank);

  const now = Date.now();
  return {
    species,
    season: data.season,
    moves: rowsFor('move').map(toRankedEntry),
    items: rowsFor('held_item').map(toRankedEntry),
    abilities: rowsFor('ability').map(toRankedEntry),
    natures: rowsFor('stat_alignment').map(toNatureEntry),
    statSpreads: rowsFor('stat_points').map(toStatPoints),
    cachedAt: now,
    expiresAt: now + USAGE_CACHE_DURATION_MS,
  };
}

/**
 * Fetches a species' Pokemon Champions ranked-Doubles usage snapshot.
 * Returns null (not an error) when the species has no Champions usage page.
 * Throws only on a genuine non-404 failure.
 */
export async function fetchChampionsUsage(species: string): Promise<ChampionsUsageEntry | null> {
  const battleName = await resolveChampionsBattleName(species);
  if (!battleName) return null;

  const response = await fetch(`${CHAMPIONS_BASE_URL}/api/battle/Doubles/${encodeURIComponent(battleName)}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Champions usage data request failed with status ${response.status}`);
  }

  const data: ChampionsBattleDataResponse = await response.json();
  return groupRowsByCategory(species, data);
}
