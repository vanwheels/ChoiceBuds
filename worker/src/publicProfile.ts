/**
 * Pure logic for filtering a stored sync blob (opaque per-account JSON, see
 * index.ts::SyncPayload) down to what GET /profile/:username is allowed to
 * expose publicly - split out of index.ts so it's unit-testable without a
 * KV/R2 harness, same pattern as merge.ts/crypto.ts/safetyFilter.ts.
 *
 * Never exposes a team's own moves/items/EVs - only enough per Pokemon
 * (species/nickname/sprite) to render a public roster strip. Team names and
 * Pokemon nicknames are user-authored text that reach this endpoint without
 * ever going through /signup's safety-filter check, so they're checked
 * here too (defense-in-depth beyond the renderer's own entry-point
 * validation) - see
 * docs/investigations/public-profiles-safety-filter-research.md. A
 * flagged team name excludes the whole team; a flagged nickname just drops
 * that one field (the "simplest safe default" that research leg left for
 * this leg to settle).
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

/** What a public team exposes per Pokemon. */
export interface PublicPokemon {
  species: string;
  nickname?: string;
  spriteUrl: string;
}

export interface PublicTeam {
  id: string;
  name: string;
  format: string;
  pokemon: PublicPokemon[];
}

export interface PublicFavoritePokemon {
  species: string;
  spriteUrl: string;
}

/**
 * One opaque `pokemon` array entry (an `ImportedPokemonInfo`, per the
 * renderer's types/pokemon.ts) down to the three public-safe fields.
 */
export function extractPublicPokemon(raw: unknown): PublicPokemon | null {
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

  return { species, nickname, spriteUrl };
}

/**
 * One opaque `teams` array entry down to the public-safe shape, or null if
 * this team isn't toggled public or its name fails the safety filter.
 */
export function extractPublicTeam(team: HasIdAndUpdatedAt): PublicTeam | null {
  if (team.isPublic !== true) return null;

  const name = typeof team.name === 'string' ? team.name : '';
  if (containsDisallowedContent(name)) return null;

  const rawPokemon = Array.isArray(team.pokemon) ? team.pokemon : [];
  const pokemon = rawPokemon
    .map(extractPublicPokemon)
    .filter((p): p is PublicPokemon => p !== null);

  return {
    id: team.id,
    name,
    format: typeof team.format === 'string' ? team.format : '',
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
