/**
 * MoveBubbleGrid.tsx - 2x2 Move Slot Grid
 * Renders the 4 type-themed move bubbles (fixed-width grid columns, wraps
 * long names). Picking a new move floats MovePickerPanel over this grid via
 * FloatingCardPanel (see EditOverlays.tsx) rather than this component
 * managing its own popover. Extracted from EditOverlays.tsx to keep it
 * under the project's 250-line component cap.
 */

import { useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';
import { Reorder } from 'framer-motion';
import type { MoveData } from '../types/pokemon';
import { getTypeTheme, type TypeTheme } from '../config/pokemonTheme';
import { DRAG_REORDER_TRANSITION } from '../config/motion';

const NEUTRAL_THEME: TypeTheme = { bg: 'bg-zinc-800', text: 'text-zinc-400' };
const IDENTITY_ORDER = [0, 1, 2, 3] as const;

export type HoverKey = 'item' | 'ability' | `move${0 | 1 | 2 | 3}` | null;

interface MoveBubbleGridProps {
  moveDataSlots: Array<MoveData | null>;
  selectedMoves: string[];
  onToggleMenu: (key: string, e: MouseEvent<HTMLDivElement>) => void;
  onHoverEnter: (key: HoverKey, triggerEl: HTMLElement) => void;
  onHoverLeave: (key: HoverKey) => void;
  // Drag-to-reorder is permanently on (Move-Slot Drag Handle Leg 1, see
  // TODO.md) - now via framer-motion's Reorder.Group/Item (Touch
  // Drag-and-Drop: Framer Motion Reorder Leg 1, see TODO.md) instead of
  // native HTML5 drag, which never fired on touch at all. A bubble is
  // simultaneously the click target (opens its move picker) and the drag
  // source, disambiguated by framer's own drag-vs-tap gesture detection
  // (same click/drag split HTML5 used to provide natively).
  // Called once per completed drag with the full new slot order (e.g.
  // [2, 0, 1, 3] means slot 0 now shows what was originally at index 2) -
  // not a single from/to pair, since Reorder.Group always resolves to a
  // complete final order rather than a single swap.
  onReorderMoves: (newOrder: number[]) => void;
}

export default function MoveBubbleGrid({
  moveDataSlots,
  selectedMoves,
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

  // Local visual order of original slot indices, permuted live during a
  // drag by Reorder.Group's onReorder. Resets to identity once a completed
  // drag is committed upstream (EditOverlays.tsx's handleMoveReorder
  // re-indexes moveDataSlots/selectedMoves themselves to match), so this
  // never drifts out of sync with the real slot content.
  const [order, setOrder] = useState<number[]>([...IDENTITY_ORDER]);

  // Tooltip anchors to the whole grid's own rect, not the individual hovered
  // bubble's - see onMouseEnter below.
  const gridRef = useRef<HTMLDivElement>(null);

  const handleDragEnd = () => {
    if (order.some((slot, i) => slot !== i)) {
      onReorderMoves(order);
    }
    setOrder([...IDENTITY_ORDER]);
  };

  return (
    // axis="x" (confirmed live via run-desktop, same root cause as
    // TeamCard.tsx's own roster grid fix) since Reorder only measures drag
    // offset along one axis to detect a swap - "y" never registered a
    // same-row swap (slot 0 -> slot 1) at all. This is a genuine 2D grid
    // with no single "predominant" direction (2 rows of 2), so either axis
    // choice only correctly supports swaps along that one axis (same-row
    // for "x", same-column for "y") - a known 1D-vs-2D-grid limitation of
    // the Reorder primitive itself, same as TeamCard.tsx/BoxPage.tsx's own
    // grids.
    <Reorder.Group
      as="div"
      axis="x"
      values={order}
      onReorder={setOrder}
      ref={gridRef}
      className="grid grid-cols-2 gap-2 w-full"
    >
      {order.map(originalIndex => {
        const theme = themes[originalIndex];
        const key = `move${originalIndex}` as `move${0 | 1 | 2 | 3}`;
        return (
          <Reorder.Item
            as="div"
            key={originalIndex}
            value={originalIndex}
            transition={DRAG_REORDER_TRANSITION}
            whileDrag={{ scale: 1.05, zIndex: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
            onDragEnd={handleDragEnd}
            // Each bubble is its own drag source (not just the outer
            // PokemonCard) - stopPropagation on pointerdown is what stops a
            // bubble drag from also bubbling up into PokemonCard's own
            // handlePointerDown and picking up the whole roster slot at the
            // same time (same fix shape the old native-HTML5 implementation
            // needed via dragstart's own stopPropagation).
            onPointerDown={(e: PointerEvent<HTMLDivElement>) => e.stopPropagation()}
            onMouseEnter={() => {
              // Anchor the shared Tooltip to the whole 2x2 grid's rect, not
              // this individual bubble's - keeps the tooltip in the same
              // fixed spot whichever row is hovered, instead of jumping
              // between rows and covering row 1 when row 2 is hovered (also
              // stops it from blocking a slot mid drag-and-drop reorder).
              if (gridRef.current) onHoverEnter(key, gridRef.current);
            }}
            onMouseLeave={() => onHoverLeave(key)}
            onClick={(e: MouseEvent<HTMLDivElement>) => onToggleMenu(key, e)}
            className={`w-full min-h-[2.75rem] flex items-center justify-center text-center whitespace-normal break-words p-1 rounded-xl text-xs font-bold transition-colors select-none ${theme.bg} ${theme.text} hover:opacity-80 cursor-grab`}
          >
            {selectedMoves[originalIndex] || `Move ${originalIndex + 1}`}
          </Reorder.Item>
        );
      })}
    </Reorder.Group>
  );
}
