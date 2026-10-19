/**
 * profileGameData.ts - Optional Game-Data Lookups for Profile Pokémon Tiles/Rows
 * Shared by ProfilePokemonTile.tsx/ProfilePokemonRow.tsx (Profile Page
 * Sections & Layout, see TODO.md) so both components resolve an item icon/
 * move-type theme the same way instead of two hand-duplicated copies.
 * `gameDataState`/`spriteCacheState`/`databaseState` are optional -
 * ProfilePage.tsx (in-app) always has all three, PublicProfilePage.tsx (the
 * standalone, unauthenticated `/u/<username>` route) never does, since that
 * route deliberately pulls in nothing beyond the one profile fetch.
 * Cache-only reads (getCachedItem/getCachedMove/getCachedEntry), same as
 * TeamPosterTile.tsx/PokemonCard.tsx - never triggers a live PokeAPI fetch,
 * so viewing a profile never adds new network calls; a move/item/species
 * this viewer's own cache doesn't already have just falls back silently.
 */

import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import { getItemFallbackSpriteUrl, getItemSpriteUrl } from './itemSprite';
import { getTypeTheme, getTypeGlowColors, type TypeTheme } from '../config/pokemonTheme';

/**
 * Resolves a held item's icon URL. With a game-data cache available, this is
 * the same PokeAPI-sprite-or-Serebii-fallback resolution TeamPosterTile.tsx
 * uses (run through spriteCacheState.resolveSprite when that's available
 * too, for the same desktop local-cache benefit TeamCard.tsx's own sprites
 * get). Without one, falls back to the static Serebii-only set (Mega
 * Stones, Fairy Feather) - the same reduced coverage ProfilePokemonTile.tsx
 * always had before this cache was wired in. Returns '' (no icon) rather
 * than null so callers can use it directly as a truthiness check.
 */
export function resolveProfileItemSpriteUrl(
  item: string,
  gameDataState?: UseGameDataReturn,
  spriteCacheState?: UseSpriteCacheReturn,
): string {
  if (!gameDataState) return getItemFallbackSpriteUrl(item) || '';
  const apiSpriteUrl = gameDataState.getCachedItem(item)?.spriteUrl;
  const url = getItemSpriteUrl(item, apiSpriteUrl);
  if (!url) return '';
  return spriteCacheState ? spriteCacheState.resolveSprite(url) : url;
}

/** A move's type-colored chip theme, or null (render a neutral chip instead) without a game-data cache or on a cache miss. */
export function getProfileMoveChipTheme(
  move: string,
  gameDataState?: UseGameDataReturn,
): TypeTheme | null {
  if (!gameDataState) return null;
  const type = gameDataState.getCachedMove(move)?.type;
  return type ? getTypeTheme(type) : null;
}

/**
 * A species' type-glow gradient colors (same `.type-glow-ring` treatment as
 * every other Pokemon card in the app - PokemonCard.tsx/BoxCard.tsx/
 * MobileBoxPokemonCard.tsx), or null (render the tile/row's plain
 * border-zinc-700 fallback instead) without a database cache or on a cache
 * miss.
 */
export function getProfileTypeGlowColors(
  species: string,
  databaseState?: UseDatabaseReturn,
): [string, string] | null {
  if (!databaseState) return null;
  const types = databaseState.getCachedEntry(species)?.types;
  return types && types.length > 0 ? getTypeGlowColors(types) : null;
}
