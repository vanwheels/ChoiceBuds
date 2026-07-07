/**
 * TooltipContent.tsx - Shared Item/Ability/Move Tooltip Body
 * Builds the content shown inside EditOverlays' single shared <Tooltip>,
 * based on whichever of the 6 elements is currently hovered. Extracted from
 * EditOverlays.tsx to keep it under the project's 250-line component cap.
 */

import { useState } from 'react';
import type { ItemData, MoveData, AbilityData } from '../types/pokemon';
import type { HoverKey } from './MoveBubbleGrid';
import { toReadableName } from '../utils/displayName';
import TypeBadge from './TypeBadge';
import { VISIBLE_MOVE_FLAGS, MOVE_FLAG_LABELS } from '../config/moveFlags';
import { getMoveFlagTheme } from '../config/pokemonTheme';

// Serebii.net category badge sprites (Physical path verified live via fetch;
// special/status follow the same /pokedex-dp/type/ folder + filename convention).
const MOVE_CATEGORY_BADGE: Record<string, string> = {
  physical: 'https://www.serebii.net/pokedex-dp/type/physical.png',
  special: 'https://www.serebii.net/pokedex-dp/type/special.png',
  status: 'https://www.serebii.net/pokedex-dp/type/other.png',
};

interface TooltipContentProps {
  hoveredKey: HoverKey;
  selectedItem: string;
  itemData: ItemData | null;
  selectedAbility: string;
  abilityData: AbilityData | null;
  selectedMoves: string[];
  moveDataSlots: Array<MoveData | null>;
}

export default function TooltipContent({
  hoveredKey,
  selectedItem,
  itemData,
  selectedAbility,
  abilityData,
  selectedMoves,
  moveDataSlots,
}: TooltipContentProps) {
  const [failedBadges, setFailedBadges] = useState<Record<string, boolean>>({});

  if (hoveredKey === 'item') {
    return (
      <>
        <div className="font-bold text-white mb-1">{selectedItem || 'No Item'}</div>
        {selectedItem && <div className="text-gray-300">{itemData?.description || 'Loading…'}</div>}
      </>
    );
  }

  if (hoveredKey === 'ability') {
    return (
      <>
        <div className="font-bold text-white mb-1">{selectedAbility || 'No Ability'}</div>
        {selectedAbility && <div className="text-gray-300">{abilityData?.description || 'Loading…'}</div>}
      </>
    );
  }

  if (hoveredKey?.startsWith('move')) {
    const index = Number(hoveredKey.slice(4));
    const move = moveDataSlots[index];
    if (!move) {
      return <div className="text-gray-400">{selectedMoves[index] || 'No move selected'}</div>;
    }
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">{toReadableName(move.name)}</span>
          <TypeBadge type={move.type} />
        </div>
        <div className="flex items-center gap-1.5 text-gray-300">
          {!failedBadges[move.category] ? (
            <img
              src={MOVE_CATEGORY_BADGE[move.category]}
              alt={move.category}
              loading="lazy"
              className="h-4 w-auto"
              onError={() => setFailedBadges(prev => ({ ...prev, [move.category]: true }))}
            />
          ) : null}
          <span className="capitalize">{move.category}</span> · PP {move.pp} · Pow {move.power ?? '—'} · Acc {move.accuracy != null ? `${move.accuracy}%` : '--'}
        </div>
        {move.flags.some(flag => VISIBLE_MOVE_FLAGS.includes(flag as typeof VISIBLE_MOVE_FLAGS[number])) && (
          <div className="flex flex-wrap items-center gap-1">
            {VISIBLE_MOVE_FLAGS.filter(flag => move.flags.includes(flag)).map(flag => {
              const theme = getMoveFlagTheme(flag);
              return (
                <span
                  key={flag}
                  className={`text-[9px] font-bold px-1 py-0.5 rounded-sm uppercase tracking-wide ${theme.bg} ${theme.text}`}
                >
                  {MOVE_FLAG_LABELS[flag]}
                </span>
              );
            })}
          </div>
        )}
        <div className="text-gray-400">{move.description}</div>
      </div>
    );
  }

  return null;
}
