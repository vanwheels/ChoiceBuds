/**
 * MoveBubbleGrid.tsx - 2x2 Move Slot Grid
 * Renders the 4 type-themed move bubbles (fixed-width grid columns, wraps
 * long names). Picking a new move floats MovePickerPanel over this grid via
 * FloatingCardPanel (see EditOverlays.tsx) rather than this component
 * managing its own popover. Extracted from EditOverlays.tsx to keep it
 * under the project's 250-line component cap.
 */

import { useMemo, useState } from 'react';
import type { DragEvent, MouseEvent } from 'react';
import type { MoveData } from '../types/pokemon';
import { getTypeTheme, type TypeTheme } from '../config/pokemonTheme';
import { MOVE_REORDER_DRAG_TYPE, type MoveReorderDragPayload } from '../utils/moveReorderDragTypes';

const NEUTRAL_THEME: TypeTheme = { bg: 'bg-zinc-800', text: 'text-zinc-400' };

export type HoverKey = 'item' | 'ability' | `move${0 | 1 | 2 | 3}` | null;

interface MoveBubbleGridProps {
  moveDataSlots: Array<MoveData | null>;
  selectedMoves: string[];
  // Drag-to-reorder is permanently on (Move-Slot Drag Handle Leg 1, see
  // TODO.md) - reuses the mechanism that already shipped once under the old
  // global edit-mode toggle. A bubble is simultaneously the click target
  // (opens its move picker) and the drag source, disambiguated natively
  // since HTML5 only fires dragstart after real pointer movement and
  // suppresses the click event when a drag actually occurred. No isEditing
  // prop anymore - it was always true with no caller ever passing false.
  ownerId: string;
  onToggleMenu: (key: string, e: MouseEvent<HTMLDivElement>) => void;
  onHoverEnter: (key: HoverKey, triggerEl: HTMLElement) => void;
  onHoverLeave: (key: HoverKey) => void;
  onReorderMoves: (fromIndex: number, toIndex: number) => void;
}

export default function MoveBubbleGrid({
  moveDataSlots,
  selectedMoves,
  ownerId,
  onToggleMenu,
  onHoverEnter,
  onHoverLeave,
  onReorderMoves,
}: MoveBubbleGridProps) {
  // Move-type background/text classes only need recomputing when the 4
  // equipped moves actually change, not on every render during mount/hover.
  const themes = useMemo(
    () => moveDataSlots.map(move => (move ? getTypeTheme(move.type) : NEUTRAL_THEME)),
    [moveDataSlots]
  );

  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Each bubble is its own drag source (not just the outer card) so that
  // starting a drag here doesn't bubble up into PokemonCard's own
  // draggable card div and pick up the whole Pokemon slot instead -
  // stopPropagation on dragstart is what actually prevents that, since
  // the outer card would otherwise still receive the bubbled event.
  const handleDragStart = (index: number) => (e: DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const payload: MoveReorderDragPayload = { ownerId, fromIndex: index };
    e.dataTransfer.setData(MOVE_REORDER_DRAG_TYPE, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number) => (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes(MOVE_REORDER_DRAG_TYPE)) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(index);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setDragOverIndex(null);
  };

  const handleDrop = (index: number) => (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes(MOVE_REORDER_DRAG_TYPE)) return;
    e.preventDefault();
    e.stopPropagation();
    setDragOverIndex(null);
    const raw = e.dataTransfer.getData(MOVE_REORDER_DRAG_TYPE);
    if (!raw) return;
    try {
      const payload: MoveReorderDragPayload = JSON.parse(raw);
      if (payload.ownerId === ownerId && payload.fromIndex !== index) {
        onReorderMoves(payload.fromIndex, index);
      }
    } catch {
      // malformed/foreign drag payload - ignore
    }
  };

  return (
    <div className="grid grid-cols-2 gap-2 w-full">
      {([0, 1, 2, 3] as const).map(index => {
        const theme = themes[index];
        const key = `move${index}` as const;
        return (
          <div
            key={index}
            draggable
            onDragStart={handleDragStart(index)}
            onDragOver={handleDragOver(index)}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop(index)}
            onMouseEnter={(e) => onHoverEnter(key, e.currentTarget)}
            onMouseLeave={() => onHoverLeave(key)}
            onClick={(e) => onToggleMenu(key, e)}
            className={`w-full min-h-[2.75rem] flex items-center justify-center text-center whitespace-normal break-words p-1 rounded-xl text-xs font-bold transition-colors ${theme.bg} ${theme.text} hover:opacity-80 cursor-grab ${dragOverIndex === index ? 'ring-2 ring-accent-gold' : ''}`}
          >
            {selectedMoves[index] || `Move ${index + 1}`}
          </div>
        );
      })}
    </div>
  );
}
