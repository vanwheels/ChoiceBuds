/**
 * RosterRow.tsx - One TeamRosterColumn Row
 * Extracted out of TeamRosterColumn.tsx as a real component (not a plain
 * .map() callback) specifically so useMegaSprite - a hook - has a stable
 * per-row lifecycle, same Rules-of-Hooks reasoning as Battlefield.tsx's
 * BattlefieldSlot.tsx extraction: a hook can't be called inside a callback
 * passed to .map().
 */

import type { DragEvent } from 'react';
import type { BattleSide } from '../../types/pokemon';
import { getMegaApiSlug } from '../../config/megaEvolution';
import { useMegaSprite } from '../../hooks/useMegaSprite';
import { POKEMON_DRAG_TYPE, pokemonDragTypeForSide } from '../../utils/dragTypes';
import type { RosterRowData } from './TeamRosterColumn';

interface RosterRowProps {
  row: RosterRowData;
  side: BattleSide;
  activeColorClass: string;
  resolveSprite: (remoteUrl: string) => string;
  onRowClick: (id: string) => void;
  enableDrag?: boolean;
}

export default function RosterRow({ row, side, activeColorClass, resolveSprite, onRowClick, enableDrag }: RosterRowProps) {
  const isBenched = row.isBrought === false;
  const usesBroughtSemantics = row.isBrought !== undefined;
  const rowTitle = usesBroughtSemantics
    ? (isBenched ? 'Not brought - click to bring' : 'Brought - click to remove, or drag onto the field')
    : (row.isActive ? 'Active - click to bench' : 'Click to mark active');
  const isDraggable = !!enableDrag && !isBenched && !row.isActive && !row.isFainted;

  const megaSprite = useMegaSprite(row.isMega ? getMegaApiSlug(row.item, row.species) : null);
  const spriteUrl = megaSprite ? megaSprite.spriteUrl : resolveSprite(row.spriteUrl);

  const handleDragStart = isDraggable
    ? (e: DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData(POKEMON_DRAG_TYPE, JSON.stringify({ side, pokemonId: row.id }));
        // Side-only marker, readable during dragover unlike the payload above - see dragTypes.ts.
        e.dataTransfer.setData(pokemonDragTypeForSide(side), '');
      }
    : undefined;

  return (
    <div
      draggable={isDraggable}
      onDragStart={handleDragStart}
      className={`relative p-1 rounded-lg border-2 transition-colors ${isDraggable ? 'cursor-grab' : ''} ${
        row.isFainted
          ? 'border-gray-800 bg-gray-900/40 opacity-40'
          : isBenched
            ? 'border-gray-800 bg-gray-900/40 opacity-50'
            : row.isActive
              ? activeColorClass
              : 'border-gray-700 bg-gray-800'
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onRowClick(row.id)}
          disabled={row.isFainted}
          className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer disabled:cursor-not-allowed"
          title={rowTitle}
        >
          <img
            src={spriteUrl}
            alt={row.species}
            className="w-7 h-7 object-contain [image-rendering:pixelated] shrink-0"
          />
          <span className="text-xs text-gray-100 truncate">{row.displayName}{row.isMega ? ' ⚡' : ''}</span>
        </button>

        {row.isFainted && <span title="Fainted" className="text-sm shrink-0 opacity-70">{'💀'}</span>}
      </div>

      {/* Ability | Move 1 + Move 2, then Item | Move 3 + Move 4 - same compact
          grid for both sides, matching the Platinum Kaizo calc's fieldset
          layout (see TODO). Each cell just renders whatever the caller gave
          it - plain text for the player side, editable controls for the
          opponent (OpponentRowFields.tsx). */}
      <div className="grid grid-cols-2 gap-0.5 mt-1">
        <div className="min-w-0">{row.ability}</div>
        <div className="grid grid-cols-2 gap-0.5 min-w-0">
          <div className="min-w-0">{row.moves[0]}</div>
          <div className="min-w-0">{row.moves[1]}</div>
        </div>
        <div className="min-w-0">{row.itemDisplay}</div>
        <div className="grid grid-cols-2 gap-0.5 min-w-0">
          <div className="min-w-0">{row.moves[2]}</div>
          <div className="min-w-0">{row.moves[3]}</div>
        </div>
      </div>

      {row.extra}
    </div>
  );
}
