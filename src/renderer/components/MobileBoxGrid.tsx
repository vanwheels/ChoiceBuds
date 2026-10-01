/**
 * MobileBoxGrid.tsx - Compact Mobile Box Grid (Sprite + Favorite + Name)
 *
 * Box Mobile: Compact Grid + Swipe Deck Leg 1 (see TODO.md's scoping doc,
 * docs/investigations/mobile-teams-box-card-view-scope.md) - renders instead
 * of BoxPage.tsx's desktop Reorder.Group grid below `md`. A shrunk version of
 * BoxCard.tsx's own collapsed tile (sprite + favorite overlay + label only,
 * no rename/drag/context-menu affordances - those live in the full-screen
 * card once a tile is opened, same precedent MobilePokemonCard.tsx set for
 * Teams' roster-slot actions). No drag-reorder here, matching
 * MobileTeamsList.tsx's own "out of scope" call for the same reason - Custom
 * sort mode still applies (BoxPage.tsx sorts `entries` before handing them
 * here), it just can't be rearranged from this view.
 *
 * Includes its own "+ New Build" tile (BoxPage.tsx's `onNewBuild`/
 * `isBuildingSpecies`) since the desktop grid this replaces had one and the
 * mobile top bar (Mobile Compact Top Bar: Teams & Box leg) doesn't - hiding
 * the desktop grid outright behind `md` without one here would silently
 * remove the only way to add a build on mobile.
 *
 * Tapping a tile opens MobileBoxSwipeOverlay.tsx at that tile's index within
 * `entries` - the same filtered/sorted list BoxPage.tsx's desktop grid
 * renders, not a separate sub-list, per the scoping doc ("Box has no
 * per-entry roster the way a team does, so the swipe deck's sequence there
 * is the whole filtered/sorted list").
 */

import { useState } from 'react';
import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import type { SavedPokemonEntry } from '../types/pokemon';
import type { UseSavedPokemonReturn } from '../hooks/useSavedPokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { RegulationId } from '../utils/pokemonRules';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import MobileBoxSwipeOverlay from './MobileBoxSwipeOverlay';

interface MobileBoxGridProps {
  entries: SavedPokemonEntry[];
  savedPokemonState: UseSavedPokemonReturn;
  gameDataState: UseGameDataReturn;
  rulesetId: RegulationId;
  resolveSprite: (remoteUrl: string) => string;
  showAnimatedSprites: boolean;
  onAddToTeam: (entryId: string) => void;
  onNewBuild: () => void;
  isBuildingSpecies: boolean;
  emptyStateContent: ReactNode | null;
}

export default function MobileBoxGrid({ entries, savedPokemonState, gameDataState, rulesetId, resolveSprite, showAnimatedSprites, onAddToTeam, onNewBuild, isBuildingSpecies, emptyStateContent }: MobileBoxGridProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleToggleFavorite = (e: ReactMouseEvent<HTMLButtonElement>, entryId: string) => {
    e.stopPropagation();
    savedPokemonState.toggleSavedPokemonFavorite(entryId);
  };

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={onNewBuild}
          disabled={isBuildingSpecies}
          className="flex items-center justify-center aspect-square rounded-lg border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-accent-gold hover:border-accent-gold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-wait"
        >
          <span className="text-[11px] font-semibold text-center px-1">{isBuildingSpecies ? 'Building…' : '+ New Build'}</span>
        </button>

        {entries.map((entry, idx) => (
          <div
            key={entry.id}
            onClick={() => setOpenIndex(idx)}
            title={entry.label}
            className="relative flex flex-col items-center justify-center gap-0.5 aspect-square p-1.5 rounded-lg bg-zinc-700 border border-zinc-600 active:bg-zinc-600 transition-colors cursor-pointer"
          >
            <img
              src={resolveSprite(getPixelSpriteUrl(
                entry.pokemon.pokedexNumber,
                entry.pokemon.showdownData.species,
                entry.pokemon.showdownData.gender || 'M',
                entry.pokemon.showdownData.shiny
              ))}
              alt={entry.pokemon.showdownData.species}
              draggable={false}
              className="w-10 h-10 object-contain [image-rendering:pixelated]"
            />
            <span className="text-[10px] font-semibold text-zinc-200 truncate w-full text-center">{entry.label}</span>

            <button
              type="button"
              onClick={(e) => handleToggleFavorite(e, entry.id)}
              title={entry.favorite ? 'Unfavorite' : 'Favorite'}
              className={`absolute top-0.5 right-0.5 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800/90 transition-colors cursor-pointer ${
                entry.favorite ? 'text-accent-gold' : 'text-zinc-500'
              }`}
            >
              <svg viewBox="0 0 24 24" width="11" height="11" fill={entry.favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3.5l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      {emptyStateContent && (
        <div className="flex flex-col justify-center text-zinc-400 px-2 py-6">
          {emptyStateContent}
        </div>
      )}

      {/* No upper-bound check against entries.length here beyond openIndex
          !== null - gating on openIndex < entries.length would re-evaluate
          the tap-time index against the live (possibly shrunk) array on
          every render and could unmount the overlay the instant a delete
          drops the list below that index, before MobileBoxSwipeOverlay's own
          clamp-and-repage logic ever runs. That overlay owns clamping
          currentIndex downward (and closing itself once entries is truly
          empty) - this guard only needs to keep from rendering it at all
          before a tile's ever been tapped. */}
      {openIndex !== null && (
        <MobileBoxSwipeOverlay
          entries={entries}
          initialIndex={openIndex}
          savedPokemonState={savedPokemonState}
          gameDataState={gameDataState}
          rulesetId={rulesetId}
          resolveSprite={resolveSprite}
          showAnimatedSprites={showAnimatedSprites}
          onAddToTeam={onAddToTeam}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </>
  );
}
