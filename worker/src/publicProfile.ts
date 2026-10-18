/**
 * Pure logic for filtering a stored sync blob (opaque per-account JSON, see
 * index.ts::SyncPayload) down to what GET /profile/:username is allowed to
 * expose publicly - split out of index.ts so it's unit-testable without a
 * KV/R2 harness, same pattern as merge.ts/crypto.ts/safetyFilter.ts.
 *
 * A team's own `visibility` (see the renderer's types/pokemon.ts -
 * TeamVisibility, Teamsheet Open/Closed Visibility Tiers, TODO.md/
 * COMPLETED.md) picks how much of its roster this exposes per Pokemon:
 * `closed` (species/nickname/sprite only, this endpoint's original/
 * pre-tiers behavior) or `open` (additionally the full competitive set -
 * item/ability/level/shiny/gigantamax/happiness/teraType/nature/EVs/moves/
 * gender). A `private` team (or a missing/unrecognized `visibility`) never
 * reaches this at all. Team names and Pokemon nicknames are user-authored
 * text that reach this endpoint without ever going through /signup's
 * safety-filter check, so they're checked here too (defense-in-depth
 * beyond the renderer's own entry-point validation) - see
 * docs/investigations/public-profiles-safety-filter-research.md. A
 * flagged team name excludes the whole team; a flagged nickname just drops
 * that one field (the "simplest safe default" that research leg left for
 * this leg to settle). The extra open-tier fields (item/ability/nature/
 * teraType/moves) never go through the safety filter - like
 * extractPublicFavoritePokemon's `species` field, they only ever come from
 * this app's own parser/pickers, never freeform user text.
 */

import { containsDisallowedContent } from './safetyFilter';

/** The Worker only ever needs `id`/`updatedAt` to merge a record - the rest of each collection's shape (Team/Battle/SavedPokemonEntry) is opaque to it. */
interface HasIdAndUpdatedAt {
  id: string;
  updatedAt: number;
  [key: string]: unknown;
}

/** Same idea as HasIdAndUpdatedAt, but for a singleton (no `id` to key by) - see PlayerProfile/FavoritePokemon. */
interface HasUpdatedAt {
  updatedAt: number;
  [key: string]: unknown;
}

/** The two tiers a team can actually be exposed at - `private` never reaches extractPublicTeam's output at all. */
export type PublicTeamVisibility = 'closed' | 'open';

/**
 * What a public team exposes per Pokemon. The open-tier fields are only
 * ever populated for an `open`-visibility team's entries - see
 * extractPublicPokemon's `includeSetData` param.
 */
export interface PublicPokemon {
  species: string;
  nickname?: string;
  spriteUrl: string;
  item?: string;
  ability?: string;
  level?: number;
  shiny?: boolean;
  gigantamax?: boolean;
  happiness?: number;
  teraType?: string;
  nature?: string;
  evs?: {
    hp: number;
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  };
  moves?: string[];
  gender?: string;
}

export interface PublicTeam {
  id: string;
  name: string;
  format: string;
  visibility: PublicTeamVisibility;
  pokemon: PublicPokemon[];
}

export interface PublicFavoritePokemon {
  species: string;
  spriteUrl: string;
}

/** Reads one EV stat off an opaque `evs` object, defaulting to 0 like a real EVSpread always has every key. */
function readEvStat(rawEvs: Record<string, unknown>, key: string): number {
  const value = rawEvs[key];
  return typeof value === 'number' ? value : 0;
}

/**
 * One opaque `pokemon` array entry (an `ImportedPokemonInfo`, per the
 * renderer's types/pokemon.ts) down to the public-safe fields - just
 * species/nickname/spriteUrl for a `closed` team, plus the full
 * competitive set when `includeSetData` is true (an `open` team - see
 * extractPublicTeam).
 */
export function extractPublicPokemon(raw: unknown, includeSetData: boolean): PublicPokemon | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const record = raw as Record<string, unknown>;
  const showdownData = record.showdownData;
  if (typeof showdownData !== 'object' || showdownData === null) return null;
  const sd = showdownData as Record<string, unknown>;

  const species = typeof sd.species === 'string' ? sd.species : '';
  const spriteUrl = typeof record.spriteUrl === 'string' ? record.spriteUrl : '';
  if (!species || !spriteUrl) return null;

  const rawNickname = typeof sd.nickname === 'string' ? sd.nickname : '';
  const nickname = rawNickname && !containsDisallowedContent(rawNickname) ? rawNickname : undefined;

  if (!includeSetData) return { species, nickname, spriteUrl };

  const rawEvs = sd.evs;
  const evs =
    typeof rawEvs === 'object' && rawEvs !== null
      ? {
          hp: readEvStat(rawEvs as Record<string, unknown>, 'hp'),
          attack: readEvStat(rawEvs as Record<string, unknown>, 'attack'),
          defense: readEvStat(rawEvs as Record<string, unknown>, 'defense'),
          specialAttack: readEvStat(rawEvs as Record<string, unknown>, 'specialAttack'),
          specialDefense: readEvStat(rawEvs as Record<string, unknown>, 'specialDefense'),
          speed: readEvStat(rawEvs as Record<string, unknown>, 'speed'),
        }
      : undefined;
  const rawMoves = sd.moves;
  const moves = Array.isArray(rawMoves)
    ? rawMoves.filter((m): m is string => typeof m === 'string')
    : undefined;

  return {
    species,
    nickname,
    spriteUrl,
    item: typeof sd.item === 'string' ? sd.item : undefined,
    ability: typeof sd.ability === 'string' ? sd.ability : undefined,
    level: typeof sd.level === 'number' ? sd.level : undefined,
    shiny: typeof sd.shiny === 'boolean' ? sd.shiny : undefined,
    gigantamax: typeof sd.gigantamax === 'boolean' ? sd.gigantamax : undefined,
    happiness: typeof sd.happiness === 'number' ? sd.happiness : undefined,
    teraType: typeof sd.teraType === 'string' ? sd.teraType : undefined,
    nature: typeof sd.nature === 'string' ? sd.nature : undefined,
    evs,
    moves,
    gender: typeof sd.gender === 'string' ? sd.gender : undefined,
  };
}

/**
 * One opaque `teams` array entry down to the public-safe shape, or null if
 * this team isn't `closed`/`open` or its name fails the safety filter. An
 * `open` team's entries additionally carry the full competitive set
 * (extractPublicPokemon's `includeSetData`) - a `closed` team keeps the
 * original species/nickname/sprite-only exposure.
 */
export function extractPublicTeam(team: HasIdAndUpdatedAt): PublicTeam | null {
  const visibility = team.visibility;
  if (visibility !== 'closed' && visibility !== 'open') return null;

  const name = typeof team.name === 'string' ? team.name : '';
  if (containsDisallowedContent(name)) return null;

  const rawPokemon = Array.isArray(team.pokemon) ? team.pokemon : [];
  const pokemon = rawPokemon
    .map((p) => extractPublicPokemon(p, visibility === 'open'))
    .filter((p): p is PublicPokemon => p !== null);

  return {
    id: team.id,
    name,
    format: typeof team.format === 'string' ? team.format : '',
    visibility,
    pokemon,
  };
}

/** The renderer's FavoritePokemon singleton down to the public-safe shape, or null if unset/not toggled public. */
export function extractPublicFavoritePokemon(
  favoritePokemon: HasUpdatedAt | undefined,
): PublicFavoritePokemon | null {
  if (!favoritePokemon || favoritePokemon.isPublic !== true) return null;

  const species = typeof favoritePokemon.species === 'string' ? favoritePokemon.species : '';
  const shiny = favoritePokemon.shiny === true;
  const spriteUrl = typeof favoritePokemon.spriteUrl === 'string' ? favoritePokemon.spriteUrl : '';
  const shinySpriteUrl =
    typeof favoritePokemon.shinySpriteUrl === 'string' ? favoritePokemon.shinySpriteUrl : '';
  const resolvedSpriteUrl = shiny ? shinySpriteUrl : spriteUrl;
  if (!species || !resolvedSpriteUrl) return null;

  // No safety-filter check needed here, unlike team names/nicknames above -
  // `species` only ever comes from the renderer's species-roster picker
  // (useSpeciesRoster.ts), never freeform user text.
  return { species, spriteUrl: resolvedSpriteUrl };
}
