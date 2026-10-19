/**
 * ProfilePokemonTile.tsx - One Pokémon's Grid-Layout Card on a Profile
 * Read-only visual mirror of TeamPosterTile.tsx's sprite/item/ability/moves
 * layout (the team-poster export), used by ProfileTeamCard.tsx's "grid"
 * layout for both open and closed teamsheet tiers (Profile Page Sections &
 * Layout, see TODO.md) - the visual-style redo flagged live during
 * Teamsheet Open/Closed Visibility Tiers Leg 3: a plain text row per field
 * read as a data dump next to the rest of the app's card-based language.
 *
 * Unlike TeamPosterTile, this has no `gameDataState`/`spriteCacheState` to
 * draw on - PublicTeam's pokemon (services/syncApi.ts) only carries what
 * GET /profile/:username serves, and the standalone, unauthenticated
 * `/u/<username>` route (PublicProfilePage.tsx) deliberately never pulls in
 * the PokeAPI-backed game-data cache (see ARCHITECTURE.md's Web build
 * section). Two consequences: the held item's icon only resolves for the
 * static Serebii-fallback set (utils/itemSprite.ts's
 * getItemFallbackSpriteUrl - Mega Stones, Fairy Feather), text-only
 * otherwise; and moves render as neutral chips rather than type-colored
 * ones, since a move's type isn't known without the game-data cache.
 */

import type { PublicTeam } from '../../services/syncApi';
import { getItemFallbackSpriteUrl } from '../../utils/itemSprite';
import { formatStatAlignment } from '../../utils/statAlignment';

type PublicPokemon = PublicTeam['pokemon'][number];

interface ProfilePokemonTileProps {
  pokemon: PublicPokemon;
  /** Closed-tier teams only ever carry species/nickname/spriteUrl. */
  detailed: boolean;
}

export default function ProfilePokemonTile({ pokemon, detailed }: ProfilePokemonTileProps) {
  const itemSpriteUrl = pokemon.item ? getItemFallbackSpriteUrl(pokemon.item) : null;
  const statAlignment = pokemon.evs ? formatStatAlignment(pokemon.nature, pokemon.evs) : '';

  return (
    <div className="flex flex-col items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800 p-3 w-full min-w-0">
      <img
        src={pokemon.spriteUrl}
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
          {pokemon.moves.map((move, idx) => (
            <div
              key={idx}
              className="truncate rounded bg-zinc-700/60 px-1 py-1 text-center text-[10px] font-bold text-zinc-300"
            >
              {move}
            </div>
          ))}
        </div>
      )}

      {detailed && statAlignment && (
        <p className="w-full text-center text-[10px] text-zinc-500">{statAlignment}</p>
      )}
    </div>
  );
}
