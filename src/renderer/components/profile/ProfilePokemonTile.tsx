/**
 * ProfilePokemonTile.tsx - One Pokémon's Grid-Layout Card on a Profile
 * Read-only visual mirror of TeamPosterTile.tsx's sprite/item/ability/moves
 * layout (the team-poster export), used by ProfileTeamCard.tsx's "grid"
 * layout for both open and closed teamsheet tiers (Profile Page Sections &
 * Layout, see TODO.md) - the visual-style redo flagged live during
 * Teamsheet Open/Closed Visibility Tiers Leg 3: a plain text row per field
 * read as a data dump next to the rest of the app's card-based language.
 *
 * `gameDataState`/`spriteCacheState`/`databaseState` are optional, unlike
 * TeamPosterTile's own required props - ProfilePage.tsx (in-app) always has
 * all three and threads them down for real type-colored move chips/item
 * sprites/the same `.type-glow-ring` card treatment PokemonCard.tsx/
 * BoxCard.tsx use (Profile Previews UI Consistency Pass, see TODO.md); the
 * standalone, unauthenticated `/u/<username>` route (PublicProfilePage.tsx)
 * never does, since that route deliberately pulls in nothing beyond the one
 * profile fetch (see ARCHITECTURE.md's Web build section). See
 * utils/profileGameData.ts for the shared fallback resolution (Serebii-only
 * item icons, neutral move chips, flat border instead of the type glow)
 * used without them.
 */

import type { CSSProperties } from 'react';
import type { PublicTeam } from '../../services/syncApi';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import type { UseDatabaseReturn } from '../../hooks/useDatabase';
import {
  resolveProfileItemSpriteUrl,
  getProfileMoveChipTheme,
  getProfileTypeGlowColors,
} from '../../utils/profileGameData';
import { formatStatAlignment } from '../../utils/statAlignment';

type PublicPokemon = PublicTeam['pokemon'][number];

interface ProfilePokemonTileProps {
  pokemon: PublicPokemon;
  /** Closed-tier teams only ever carry species/nickname/spriteUrl. */
  detailed: boolean;
  gameDataState?: UseGameDataReturn;
  spriteCacheState?: UseSpriteCacheReturn;
  databaseState?: UseDatabaseReturn;
}

export default function ProfilePokemonTile({
  pokemon,
  detailed,
  gameDataState,
  spriteCacheState,
  databaseState,
}: ProfilePokemonTileProps) {
  const itemSpriteUrl = pokemon.item
    ? resolveProfileItemSpriteUrl(pokemon.item, gameDataState, spriteCacheState)
    : '';
  const statAlignment = pokemon.evs ? formatStatAlignment(pokemon.nature, pokemon.evs) : '';
  const spriteUrl = spriteCacheState
    ? spriteCacheState.resolveSprite(pokemon.spriteUrl)
    : pokemon.spriteUrl;
  const glowColors = getProfileTypeGlowColors(pokemon.species, databaseState);

  // Outer type-glow-ring wrapper, same structure as PokemonCard.tsx/
  // BoxCard.tsx - the glow ring's own gradient background only shows through
  // its 2px padding, so it needs a separate opaque inner card rather than
  // being merged onto one div. Falls back to the tile's old flat border
  // when there's no cached species-type data to glow with (databaseState
  // absent, or a cache miss).
  const innerCard = (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-[11px] bg-zinc-800 p-3 w-full min-w-0 ${
        glowColors ? '' : 'border border-zinc-700'
      }`}
    >
      <img
        src={spriteUrl}
        alt={pokemon.species}
        className="h-16 w-16 object-contain [image-rendering:pixelated]"
      />
      <p className="w-full truncate text-center text-sm font-bold text-zinc-100">
        {pokemon.nickname || pokemon.species}
      </p>

      {detailed && pokemon.item && (
        <div className="flex w-full min-w-0 items-center justify-center gap-1.5">
          {itemSpriteUrl && (
            <img
              src={itemSpriteUrl}
              alt={pokemon.item}
              className="h-5 w-5 shrink-0 object-contain [image-rendering:pixelated]"
            />
          )}
          <span className="min-w-0 truncate text-[11px] text-zinc-400">{pokemon.item}</span>
        </div>
      )}

      {detailed && pokemon.ability && (
        <span className="w-full truncate text-center text-[11px] italic text-zinc-500">
          {pokemon.ability}
        </span>
      )}

      {detailed && pokemon.moves && pokemon.moves.length > 0 && (
        <div className="flex w-full min-w-0 flex-col gap-1">
          {pokemon.moves.map((move, idx) => {
            const theme = getProfileMoveChipTheme(move, gameDataState);
            return (
              <div
                key={idx}
                className={`truncate rounded px-1 py-1 text-center text-[10px] font-bold ${
                  theme ? `${theme.bg} ${theme.text}` : 'bg-zinc-700/60 text-zinc-300'
                }`}
              >
                {move}
              </div>
            );
          })}
        </div>
      )}

      {detailed && statAlignment && (
        <p className="w-full text-center text-[10px] text-zinc-500">{statAlignment}</p>
      )}
    </div>
  );

  if (!glowColors) return innerCard;

  return (
    <div
      className="type-glow-ring w-full min-w-0"
      style={{ '--glow-c1': glowColors[0], '--glow-c2': glowColors[1] } as CSSProperties}
    >
      {innerCard}
    </div>
  );
}
