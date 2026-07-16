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

interface TeamPosterTileProps {
  pokemon: ImportedPokemonInfo;
  gameDataState: UseGameDataReturn;
  spriteCacheState: UseSpriteCacheReturn;
}

const EV_STAT_LABELS: Array<{ key: keyof ImportedPokemonInfo['showdownData']['evs']; label: string }> = [
  { key: 'hp', label: 'HP' },
  { key: 'attack', label: 'Atk' },
  { key: 'defense', label: 'Def' },
  { key: 'specialAttack', label: 'SpA' },
  { key: 'specialDefense', label: 'SpD' },
  { key: 'speed', label: 'Spe' },
];

function formatEVs(evs: ImportedPokemonInfo['showdownData']['evs']): string {
  return EV_STAT_LABELS
    .filter(({ key }) => evs[key] > 0)
    .map(({ key, label }) => `${evs[key]} ${label}`)
    .join(' / ');
}

export default function TeamPosterTile({ pokemon, gameDataState, spriteCacheState }: TeamPosterTileProps) {
  const { showdownData, pokedexNumber } = pokemon;
  const spriteUrl = getPixelSpriteUrl(pokedexNumber, showdownData.species, showdownData.gender || 'M', showdownData.shiny);
  const itemData = showdownData.item ? gameDataState.getCachedItem(showdownData.item) : null;
  const evLine = formatEVs(showdownData.evs);

  return (
    <div className="flex flex-col items-center gap-2 bg-zinc-800 rounded-lg border border-zinc-700 p-3 w-[180px]">
      <img
        src={spriteCacheState.resolveSprite(spriteUrl)}
        alt={showdownData.species}
        className="w-20 h-20 object-contain [image-rendering:pixelated]"
      />
      <p className="text-sm font-bold text-zinc-100 text-center truncate w-full">
        {showdownData.nickname || showdownData.species}
      </p>

      {showdownData.item && (
        <div className="flex items-center gap-1.5 w-full justify-center">
          {itemData?.spriteUrl && (
            <img src={spriteCacheState.resolveSprite(itemData.spriteUrl)} alt={showdownData.item} className="w-5 h-5 object-contain [image-rendering:pixelated]" />
          )}
          <span className="text-[11px] text-zinc-400 truncate">{showdownData.item}</span>
        </div>
      )}

      {showdownData.ability && (
        <span className="text-[11px] text-zinc-500 italic truncate w-full text-center">{showdownData.ability}</span>
      )}

      <div className="grid grid-cols-2 gap-1 w-full">
        {showdownData.moves.map((move, idx) => {
          const theme = getTypeTheme(gameDataState.getCachedMove(move)?.type ?? '');
          return (
            <div key={idx} className={`text-[10px] font-bold text-center rounded px-1 py-1 truncate ${theme.bg} ${theme.text}`}>
              {move}
            </div>
          );
        })}
      </div>

      {(showdownData.nature || evLine) && (
        <p className="text-[10px] text-zinc-500 text-center w-full">
          {showdownData.nature ? `${showdownData.nature} - ` : ''}{evLine}
        </p>
      )}
    </div>
  );
}
