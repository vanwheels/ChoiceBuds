/**
 * CalcBoxPanel.tsx - Bottom Box Picker for One Calc Side
 * Lists the same Box (useSavedPokemon.ts) entries on both sides; a click
 * loads that entry into this side only. Ordered like BoxPage's Alphabetical
 * mode (species, then label) with favorites first, so the two surfaces agree
 * on what comes first without the Calc side owning BoxPage's sort-mode setting.
 */

import { useMemo, useState } from 'react';
import type { SavedPokemonEntry } from '../../types/pokemon';
import { getPixelSpriteUrl } from '../../utils/spriteUrl';
import { sortSavedPokemonByFavorite } from '../../utils/savedPokemonSort';
import CalcBoxHoverCard from './CalcBoxHoverCard';

interface CalcBoxPanelProps {
  title: string;
  entries: SavedPokemonEntry[];
  /** This side's own `state.species` - a tile highlights when it matches, same derived-from-state convention CalcTeamTray.tsx uses. */
  currentSpecies: string;
  resolveSprite: (remoteUrl: string) => string;
  onLoadEntry: (entry: SavedPokemonEntry) => void;
}

/** Nearest scrolling ancestor beyond the tile grid itself (the Calc popup body); the window if none. */
function getHoverBounds(tile: HTMLElement): DOMRect {
  let el = tile.parentElement?.parentElement ?? null;
  while (el) {
    const overflowY = getComputedStyle(el).overflowY;
    if (overflowY === 'auto' || overflowY === 'scroll') return el.getBoundingClientRect();
    el = el.parentElement;
  }
  return new DOMRect(0, 0, window.innerWidth, window.innerHeight);
}

export default function CalcBoxPanel({
  title,
  entries,
  currentSpecies,
  resolveSprite,
  onLoadEntry,
}: CalcBoxPanelProps) {
  const [hovered, setHovered] = useState<{
    entry: SavedPokemonEntry;
    anchor: DOMRect;
    bounds: DOMRect;
  } | null>(null);
  const sorted = useMemo(() => {
    const alphabetical = [...entries].sort((a, b) => {
      const bySpecies = a.pokemon.showdownData.species.localeCompare(
        b.pokemon.showdownData.species,
      );
      return bySpecies !== 0 ? bySpecies : a.label.localeCompare(b.label);
    });
    return sortSavedPokemonByFavorite(alphabetical);
  }, [entries]);

  return (
    <div className="w-full bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3 flex flex-col gap-2">
      <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">{title}</h3>
      {sorted.length === 0 ? (
        <p className="text-xs text-zinc-400">
          Box is empty - use Save to Box on a Pokémon, or add builds from the Box tab.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
          {sorted.map((entry) => {
            const { species, gender, shiny } = entry.pokemon.showdownData;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => onLoadEntry(entry)}
                onPointerEnter={(e) =>
                  setHovered({
                    entry,
                    anchor: e.currentTarget.getBoundingClientRect(),
                    bounds: getHoverBounds(e.currentTarget),
                  })
                }
                onPointerLeave={() => setHovered(null)}
                className={`w-9 h-9 shrink-0 rounded bg-zinc-800 flex items-center justify-center cursor-pointer transition-colors ${
                  species === currentSpecies
                    ? 'border-2 border-accent-gold ring-1 ring-accent-gold'
                    : 'border border-zinc-600 hover:border-accent-gold'
                }`}
              >
                <img
                  src={resolveSprite(
                    getPixelSpriteUrl(entry.pokemon.pokedexNumber, species, gender || 'M', shiny),
                  )}
                  alt={species}
                  className="w-7 h-7 object-contain [image-rendering:pixelated]"
                />
              </button>
            );
          })}
        </div>
      )}
      {hovered && (
        <CalcBoxHoverCard entry={hovered.entry} anchor={hovered.anchor} bounds={hovered.bounds} />
      )}
    </div>
  );
}
