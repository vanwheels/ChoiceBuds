/**
 * ProfilePokemonRow.tsx - One Pokémon's List-Layout Row on a Profile
 * Denser sibling to ProfilePokemonTile.tsx's grid tile - same data, same
 * card-not-text-dump treatment (bordered row, sprite thumbnail, chip
 * moves), just one Pokémon per line instead of one tile per grid cell, for
 * ProfileTeamCard.tsx's "list" layout (Profile Page Sections & Layout, see
 * TODO.md). See that file's own header comment for why there's no
 * type-colored move chips or PokeAPI-sourced item icon here.
 */

import type { PublicTeam } from '../../services/syncApi';
import { getItemFallbackSpriteUrl } from '../../utils/itemSprite';
import { formatStatAlignment } from '../../utils/statAlignment';

type PublicPokemon = PublicTeam['pokemon'][number];

interface ProfilePokemonRowProps {
  pokemon: PublicPokemon;
  detailed: boolean;
}

export default function ProfilePokemonRow({ pokemon, detailed }: ProfilePokemonRowProps) {
  const itemSpriteUrl = pokemon.item ? getItemFallbackSpriteUrl(pokemon.item) : null;
  const statAlignment = pokemon.evs ? formatStatAlignment(pokemon.nature, pokemon.evs) : '';

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-2">
      <img
        src={pokemon.spriteUrl}
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
            {pokemon.moves.map((move, idx) => (
              <span
                key={idx}
                className="truncate rounded bg-zinc-700/60 px-1.5 py-0.5 text-[10px] font-bold text-zinc-300"
              >
                {move}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
