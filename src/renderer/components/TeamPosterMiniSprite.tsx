/**
 * TeamPosterMiniSprite.tsx - One Pokemon's Sprite (+ Held Item Badge) for the
 * Notes-view of TeamExportImageModal.tsx. Deliberately not the full
 * TeamPosterTile - the Notes view is meant to hand nearly the whole poster
 * over to the strategy writeup, so each Pokemon is reduced to a single
 * recognizable icon (bigger than TeamCard.tsx's collapsed-header sprite row,
 * small enough that six of them stay a compact strip) with its held item as a
 * small corner badge, the way a lot of game UIs summarize a loadout.
 */

import type { ImportedPokemonInfo } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import { getPixelSpriteUrl } from '../utils/spriteUrl';

interface TeamPosterMiniSpriteProps {
  pokemon: ImportedPokemonInfo;
  gameDataState: UseGameDataReturn;
  spriteCacheState: UseSpriteCacheReturn;
}

export default function TeamPosterMiniSprite({ pokemon, gameDataState, spriteCacheState }: TeamPosterMiniSpriteProps) {
  const { showdownData, pokedexNumber } = pokemon;
  const spriteUrl = getPixelSpriteUrl(pokedexNumber, showdownData.species, showdownData.gender || 'M', showdownData.shiny);
  const itemData = showdownData.item ? gameDataState.getCachedItem(showdownData.item) : null;

  return (
    <div className="relative w-16 h-16 shrink-0" title={showdownData.nickname || showdownData.species}>
      <img
        src={spriteCacheState.resolveSprite(spriteUrl)}
        alt={showdownData.species}
        className="w-full h-full object-contain [image-rendering:pixelated]"
      />
      {itemData?.spriteUrl && (
        <img
          src={spriteCacheState.resolveSprite(itemData.spriteUrl)}
          alt={showdownData.item}
          className="absolute -bottom-0.5 -right-0.5 w-5 h-5 object-contain [image-rendering:pixelated] bg-zinc-900 rounded-full border border-zinc-700 p-0.5"
        />
      )}
    </div>
  );
}
