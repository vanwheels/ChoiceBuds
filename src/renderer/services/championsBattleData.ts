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
 *  - The opponent species picker (SpeciesPickerCard) only ever offers
 *    species this app's own Reg M-A/M-B legality table
 *    (utils/pokemonRules.ts) allows - Iron Hands, every Paradox, Ogerpon,
 *    Landorus/Tornadus, every Tapu, Ursaluna, Mr. Mime, Indeedee, Oinkologne
 *    etc. can never actually reach this code at all (they're not "missing
 *    Champions pages" so much as never-selectable in the first place), so
 *    those aren't the right species to reason about real coverage against.
 *  - Phase 3 empirically checked coverage against the real, actually-
 *    reachable roster instead: every one of `pokemonRules.ts`'s 227 legal
 *    species/form slugs was checked against a live `/api/index` fetch, and
 *    all 227 resolve correctly after the fixes below (2026-07-16) - true
 *    100% coverage, not the "expect frequent misses" picture a naive check
 *    against the full national dex would suggest.
 *  - Regional forms (Alolan/Galarian/Hisuian/Paldean) use a PREFIX naming
 *    convention on this site ("Alolan Ninetales", slug "alolan-ninetales")
 *    - the opposite of this app's own SUFFIX convention inherited from
 *    PokeAPI ("Ninetales-Alola"). A plain name/slug match can never find
 *    these on its own, so `rewriteRegionalFormSlug` below retries with the
 *    prefix form rewritten in, after a direct match fails.
 *  - A handful of species (Aegislash, Vivillon, Florges, Furfrou, Palafin)
 *    have no page under their own bare species name at all - the site only
 *    pages one "canonical" specific forme (Aegislash Shield Forme, Vivillon
 *    Fancy Pattern, Florges Red Flower, Furfrou Natural Form, Palafin Zero
 *    Form), with every other cosmetic/battle-only forme's own page just
 *    pointing its `battleName` back to that same canonical one.
 *    `CANONICAL_FORM_SLUG_OVERRIDES` below maps each to it directly, since
 *    this app never tracks the cosmetic variant (Vivillon's pattern,
 *    Florges' flower color, Furfrou's trim) or the battle-only state
 *    (Aegislash's Blade stance, Palafin's Hero Form) as a separate value in
 *    the first place - it's always querying for the one form it does store.
 *  - Of this app's gendered-suffix species (config/pokemonRules.ts),
 *    Basculegion has its own distinct "Basculegion Male"/"Basculegion
 *    Female" pages (a direct slug match already finds either), but Meowstic
 *    does not - its bare/default page already *is* the male form, with only
 *    "Meowstic Female" getting a page of its own. `stripGenderSuffix` only
 *    strips this app's own "-F" convention up front (never a real species
 *    ending); resolveChampionsBattleName retries with the PokeAPI-style
 *    "-Male" suffix stripped as a last-resort fallback, purely for
 *    Meowstic - the strip only ever runs after a direct match on the
 *    unstripped string has already failed, so it can't accidentally mangle
 *    Basculegion-Male's own already-correct direct match.
 *  - There is currently no queryable per-season archive - the `season`
 *    query param only resolves for the exact "Current" season's own label
 *    (confirmed live: a same-day dated static-asset snapshot the site
 *    exposes is byte-identical to the live data), so it's never passed.
 */

import type { ChampionsUsageEntry, ChampionsUsageRankedEntry, ChampionsUsageNatureEntry, ChampionsUsageStatSpreadEntry } from '../types/pokemon';

const CHAMPIONS_BASE_URL = 'https://championsbattledata.com';

/**
 * Cache duration: 5 days in milliseconds. This is the only GameDataCache
 * section that still expires on a real TTL - every other section (moves/
 * items/abilities/learnsets) caches forever (see cacheExpiry.ts's
 * NEVER_EXPIRES) since it's static game data, but ranked-ladder usage is
 * the one thing here that's genuinely time-varying - it shifts meaningfully
 * week to week, so it needs periodic re-validation the rest of the cache
 * doesn't. 5 days refreshes at worst once per tournament weekend without
 * re-fetching every single session.
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

/** Champions' regional-form slug prefixes, keyed by this app's own suffix - see file header. */
const REGIONAL_FORM_SUFFIX_TO_PREFIX: Record<string, string> = {
  alola: 'alolan',
  hisui: 'hisuian',
  galar: 'galarian',
};

/**
 * Rewrites this app's suffix-form regional slug (e.g. "ninetales-alola") to
 * Champions' own prefix-form slug ("alolan-ninetales"), or null if `normalized`
 * isn't a recognized regional-form slug. Paldean Tauros's 3 breeds are a
 * special case even among regional forms: this app's slug puts the region in
 * the middle ("tauros-paldea-combat", matching PokeAPI's own convention),
 * but the site prefixes the region AND appends "-breed"
 * ("paldean-tauros-combat-breed") - verified live that all 3 breeds' own
 * `battleName` collapses to the identical "Paldean Tauros Aqua Breed"
 * dataset regardless of which breed is looked up (the same shared-dataset
 * pattern `CANONICAL_FORM_SLUG_OVERRIDES` below relies on for Aegislash/
 * Vivillon/etc., not a bug in this rewrite).
 */
function rewriteRegionalFormSlug(normalized: string): string | null {
  for (const [suffix, prefix] of Object.entries(REGIONAL_FORM_SUFFIX_TO_PREFIX)) {
    if (normalized.endsWith(`-${suffix}`)) {
      return `${prefix}-${normalized.slice(0, -(suffix.length + 1))}`;
    }
  }
  const taurosBreed = normalized.match(/^tauros-paldea-(combat|blaze|aqua)(-breed)?$/);
  return taurosBreed ? `paldean-tauros-${taurosBreed[1]}-breed` : null;
}

/**
 * Species this app only ever stores as their "base"/default form, whose
 * Champions page for that literal base slug doesn't exist - see file header
 * for why each of these has no bare-name page of its own. Aegislash has 3
 * keys: the opponent species picker (useSpeciesRoster, PokeAPI's own
 * per-forme naming) offers "Aegislash-Shield" AND "Aegislash-Blade" as two
 * independently-selectable roster rows (confirmed live) - both need a Champions
 * page, and each has its own distinct one (unlike Vivillon/Florges/Furfrou's
 * single shared dataset). Bare "aegislash" is kept too since a
 * Showdown-parsed team Pokemon (utils/championsStats.ts::resolveCalcSpecies's
 * same quirk) would produce that instead, always meaning Shield Forme.
 */
const CANONICAL_FORM_SLUG_OVERRIDES: Record<string, string> = {
  aegislash: 'aegislash-shield-forme',
  'aegislash-shield': 'aegislash-shield-forme',
  'aegislash-blade': 'aegislash-blade-forme',
  vivillon: 'vivillon-fancy-pattern',
  florges: 'florges-red-flower',
  furfrou: 'furfrou-natural-form',
  palafin: 'palafin-zero-form',
};

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
 * `battleName`, or null if the species genuinely has no Champions usage
 * page. Tries, in order: a direct name/slug match; the regional-form and
 * canonical-form rewrites (see file header + the functions/tables above);
 * and finally, only for Meowstic, a "-Male" suffix strip (Champions has no
 * distinct male-form page for it - its bare/default page already is the
 * male form) - deliberately last and gated on every earlier attempt having
 * failed, so it can never mis-fire on Basculegion-Male, which already
 * resolves correctly via the very first direct match.
 */
export async function resolveChampionsBattleName(species: string): Promise<string | null> {
  const index = await getBattleNameIndex();
  const findBySlugOrName = (value: string) =>
    index.find(page => page.name.toLowerCase() === value || page.slug.toLowerCase() === value);

  const normalized = stripGenderSuffix(species).toLowerCase().trim();
  const direct = findBySlugOrName(normalized);
  if (direct) return direct.battleName;

  const rewritten = CANONICAL_FORM_SLUG_OVERRIDES[normalized] ?? rewriteRegionalFormSlug(normalized);
  const rewrittenMatch = rewritten ? index.find(page => page.slug.toLowerCase() === rewritten) : undefined;
  if (rewrittenMatch) return rewrittenMatch.battleName;

  if (normalized.endsWith('-male')) {
    const maleFallback = findBySlugOrName(normalized.slice(0, -'-male'.length));
    if (maleFallback) return maleFallback.battleName;
  }

  return null;
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
