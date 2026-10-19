/**
 * ProfilePokemonRow.tsx - One Pokémon's List-Layout Row on a Profile
 * Denser sibling to ProfilePokemonTile.tsx's grid tile - same data, same
 * card-not-text-dump treatment (bordered row, sprite thumbnail, chip
 * moves), just one Pokémon per line instead of one tile per grid cell, for
 * ProfileTeamCard.tsx's "list" layout (Profile Page Sections & Layout, see
 * TODO.md). See ProfilePokemonTile.tsx's own header comment for why
 * `gameDataState`/`spriteCacheState` are optional and
 * utils/profileGameData.ts for the shared fallback resolution used without
 * them.
 */

import type { PublicTeam } from '../../services/syncApi';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import { resolveProfileItemSpriteUrl, getProfileMoveChipTheme } from '../../utils/profileGameData';
import { formatStatAlignment } from '../../utils/statAlignment';

type PublicPokemon = PublicTeam['pokemon'][number];

interface ProfilePokemonRowProps {
  pokemon: PublicPokemon;
  detailed: boolean;
  gameDataState?: UseGameDataReturn;
  spriteCacheState?: UseSpriteCacheReturn;
}

export default function ProfilePokemonRow({
  pokemon,
  detailed,
  gameDataState,
  spriteCacheState,
}: ProfilePokemonRowProps) {
  const itemSpriteUrl = pokemon.item
    ? resolveProfileItemSpriteUrl(pokemon.item, gameDataState, spriteCacheState)
    : '';
  const statAlignment = pokemon.evs ? formatStatAlignment(pokemon.nature, pokemon.evs) : '';
  const spriteUrl = spriteCacheState
    ? spriteCacheState.resolveSprite(pokemon.spriteUrl)
    : pokemon.spriteUrl;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-2">
      <img
        src={spriteUrl}
        alt={pokemon.species}
        className="h-10 w-10 shrink-0 object-contain [image-rendering:pixelated]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate text-sm font-bold text-zinc-100">
            {pokemon.nickname || pokemon.species}
          </span>
          {detailed && pokemon.item && (
            <span className="flex min-w-0 shrink-0 items-center gap-1 text-[11px] text-zinc-400">
              {itemSpriteUrl && (
                <img
                  src={itemSpriteUrl}
                  alt={pokemon.item}
                  className="h-4 w-4 object-contain [image-rendering:pixelated]"
                />
              )}
              <span className="truncate">@ {pokemon.item}</span>
            </span>
          )}
        </div>

        {detailed && (pokemon.ability || statAlignment) && (
          <p className="truncate text-[11px] text-zinc-500">
            {[pokemon.ability, statAlignment].filter(Boolean).join(' · ')}
          </p>
        )}

        {detailed && pokemon.moves && pokemon.moves.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {pokemon.moves.map((move, idx) => {
              const theme = getProfileMoveChipTheme(move, gameDataState);
              return (
                <span
                  key={idx}
                  className={`truncate rounded px-1.5 py-0.5 text-[10px] font-bold ${
                    theme ? `${theme.bg} ${theme.text}` : 'bg-zinc-700/60 text-zinc-300'
                  }`}
                >
                  {move}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
