/**
 * MoveBubbleGrid.tsx - 2x2 Move Slot Grid
 * Renders the 4 type-themed move bubbles (fixed-width grid columns, wraps
 * long names) and their ShowdownPopover selectors. Extracted from
 * EditOverlays.tsx to keep it under the project's 250-line component cap.
 */

import { useMemo } from 'react';
import type { MoveData } from '../types/pokemon';
import type { RegulationId } from '../utils/pokemonRules';
import { ShowdownPopover } from './ShowdownPopover';
import { getTypeTheme, type TypeTheme } from '../config/pokemonTheme';

const NEUTRAL_THEME: TypeTheme = { bg: 'bg-gray-800', text: 'text-gray-400' };

export type HoverKey = 'item' | 'ability' | `move${0 | 1 | 2 | 3}` | null;

interface MoveBubbleGridProps {
  moveDataSlots: Array<MoveData | null>;
  selectedMoves: string[];
  legalMoves: MoveData[];
  activeMenu: string | null;
  isEditing: boolean;
  rulesetId: RegulationId;
  onToggleMenu: (key: string) => void;
  onCloseMenu: () => void;
  onHoverEnter: (key: HoverKey, rect: DOMRect) => void;
  onHoverLeave: (key: HoverKey) => void;
  onMoveSelect: (index: number, move: MoveData) => void;
}

export default function MoveBubbleGrid({
  moveDataSlots,
  selectedMoves,
  legalMoves,
  activeMenu,
  isEditing,
  rulesetId,
  onToggleMenu,
  onCloseMenu,
  onHoverEnter,
  onHoverLeave,
  onMoveSelect,
}: MoveBubbleGridProps) {
  // Move-type background/text classes only need recomputing when the 4
  // equipped moves actually change, not on every render during mount/hover.
  const themes = useMemo(
    () => moveDataSlots.map(move => (move ? getTypeTheme(move.type) : NEUTRAL_THEME)),
    [moveDataSlots]
  );

  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      {([0, 1, 2, 3] as const).map(index => {
        const theme = themes[index];
        const key = `move${index}` as const;
        return (
          <div key={index} className="relative">
            <div
              onMouseEnter={(e) => onHoverEnter(key, e.currentTarget.getBoundingClientRect())}
              onMouseLeave={() => onHoverLeave(key)}
              onClick={isEditing ? () => onToggleMenu(key) : undefined}
              className={`w-full min-h-[2.75rem] flex items-center justify-center text-center whitespace-normal break-words p-1 rounded-xl text-xs font-bold transition-colors ${theme.bg} ${theme.text} ${isEditing ? 'cursor-pointer hover:opacity-80' : ''}`}
            >
              {selectedMoves[index] || `Move ${index + 1}`}
            </div>
            {activeMenu === key && (
              <ShowdownPopover mode="move" data={legalMoves} rulesetId={rulesetId} onSelect={(move) => onMoveSelect(index, move)} onClose={onCloseMenu} />
            )}
          </div>
        );
      })}
    </div>
  );
}
