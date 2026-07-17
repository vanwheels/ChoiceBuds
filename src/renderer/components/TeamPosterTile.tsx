/**
 * TeamPosterTile.tsx - One Pokemon's Entry on the Exported Team Poster
 * Read-only visual mirror of PokemonCard.tsx's sprite/item/ability/moves/EVs
 * layout, flattened into a single non-interactive tile for TeamExportImageModal.tsx
 * to rasterize. Item icons are routed through resolveSprite() (not the raw
 * PokeAPI URL ItemSpriteBox.tsx uses) so they're already a data: URL by the
 * time html-to-image reads the DOM - avoids a cross-origin canvas taint on
 * hosts that don't send CORS headers (e.g. the Fairy Feather Serebii fallback).
 */

import type { ImportedPokemonInfo } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import { getTypeTheme } from '../config/pokemonTheme';
import { formatStatAlignment } from '../utils/statAlignment';

interface TeamPosterTileProps {
  pokemon: ImportedPokemonInfo;
  gameDataState: UseGameDataReturn;
  spriteCacheState: UseSpriteCacheReturn;
  /** Open Team Sheet shows the Stat Alignment line (Nature + EV spread) below the
   * moves, matching what a real VGC Open Team Sheet reveals; Closed hides it, since
   * a Closed Team Sheet reveals species/item/ability/moves but never Stat Alignment. */
  showStatAlignment: boolean;
}

export default function TeamPosterTile({ pokemon, gameDataState, spriteCacheState, showStatAlignment }: TeamPosterTileProps) {
  const { showdownData, pokedexNumber } = pokemon;
  const spriteUrl = getPixelSpriteUrl(pokedexNumber, showdownData.species, showdownData.gender || 'M', showdownData.shiny);
  const itemData = showdownData.item ? gameDataState.getCachedItem(showdownData.item) : null;
  const statAlignment = formatStatAlignment(showdownData.nature, showdownData.evs);

  return (
    <div className="flex flex-col items-center gap-2 bg-zinc-800 rounded-lg border border-zinc-700 p-3 w-full min-w-0">
      <img
        src={spriteCacheState.resolveSprite(spriteUrl)}
        alt={showdownData.species}
        className="w-20 h-20 object-contain [image-rendering:pixelated]"
      />
      <p className="text-sm font-bold text-zinc-100 text-center truncate w-full">
        {showdownData.nickname || showdownData.species}
      </p>

      {showdownData.item && (
        <div className="flex items-center gap-1.5 w-full min-w-0 justify-center">
          {itemData?.spriteUrl && (
            <img src={spriteCacheState.resolveSprite(itemData.spriteUrl)} alt={showdownData.item} className="w-5 h-5 object-contain [image-rendering:pixelated] shrink-0" />
          )}
          <span className="text-[11px] text-zinc-400 truncate min-w-0">{showdownData.item}</span>
        </div>
      )}

      {showdownData.ability && (
        <span className="text-[11px] text-zinc-500 italic truncate w-full text-center">{showdownData.ability}</span>
      )}

      {/* One move per row (not the old 2x2 grid) - a move chip's full width is now the whole
          tile instead of half of it, which fits nearly every move name without truncating. */}
      <div className="flex flex-col gap-1 w-full min-w-0">
        {showdownData.moves.map((move, idx) => {
          const theme = getTypeTheme(gameDataState.getCachedMove(move)?.type ?? '');
          return (
            <div key={idx} className={`text-[10px] font-bold text-center rounded px-1 py-1 truncate min-w-0 ${theme.bg} ${theme.text}`}>
              {move}
            </div>
          );
        })}
      </div>

      {showStatAlignment && statAlignment && (
        <p className="text-[10px] text-zinc-500 text-center w-full">
          {statAlignment}
        </p>
      )}
    </div>
  );
}
