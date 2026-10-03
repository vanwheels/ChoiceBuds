/**
 * MoveBubbleGrid.tsx - 2x2 Move Slot Grid
 * Renders the 4 type-themed move bubbles (fixed-width grid columns, wraps
 * long names). Picking a new move floats MovePickerPanel over this grid via
 * FloatingCardPanel (see EditOverlays.tsx) rather than this component
 * managing its own popover. Extracted from EditOverlays.tsx to keep it
 * under the project's 250-line component cap.
 *
 * Each bubble is its own MoveBubble subcomponent rather than inline JSX
 * inside the .map() below, so it can call useLongPress (touch's analog to
 * the mouse hover wired up alongside it - shows the same tooltip without
 * opening the picker a plain tap does; Touch-Accessible Hover Content Leg 1,
 * see TODO.md) - Hooks can only be called from a real component, not a bare
 * callback passed to .map().
 */

import { useMemo, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent, RefObject } from 'react';
import { motion } from 'framer-motion';
import type { MoveData } from '../types/pokemon';
import { getTypeTheme, type TypeTheme } from '../config/pokemonTheme';
import { DRAG_REORDER_TRANSITION } from '../config/motion';
import { useLongPress } from '../hooks/useLongPress';

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

interface MoveBubbleProps {
  originalIndex: number;
  theme: TypeTheme;
  label: string;
  gridRef: RefObject<HTMLDivElement | null>;
  onToggleMenu: (key: string, e: MouseEvent<HTMLDivElement>) => void;
  onHoverEnter: (key: HoverKey, triggerEl: HTMLElement) => void;
  onHoverLeave: (key: HoverKey) => void;
  onDrag: (originalIndex: number, clientX: number, clientY: number) => void;
  onDragEnd: () => void;
}

function MoveBubble({ originalIndex, theme, label, gridRef, onToggleMenu, onHoverEnter, onHoverLeave, onDrag, onDragEnd }: MoveBubbleProps) {
  const key = `move${originalIndex}` as `move${0 | 1 | 2 | 3}`;
  // Same grid-rect anchoring as onMouseEnter below.
  const longPress = useLongPress(
    () => { if (gridRef.current) onHoverEnter(key, gridRef.current); },
    () => onHoverLeave(key)
  );

  // Swallows the click a finished drag would otherwise fire on pointerup.
  const didDrag = useRef(false);

  return (
    <motion.div
      layout="position"
      drag
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0}
      transition={DRAG_REORDER_TRANSITION}
      whileDrag={{ scale: 1.05, zIndex: 1, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
      onDragStart={() => { didDrag.current = true; }}
      onDrag={(e, info) => onDrag(originalIndex, (e as globalThis.PointerEvent).clientX ?? info.point.x, (e as globalThis.PointerEvent).clientY ?? info.point.y)}
      onDragEnd={() => { onDragEnd(); setTimeout(() => { didDrag.current = false; }, 0); }}
      // Each bubble is its own drag source (not just the outer PokemonCard)
      // - stopPropagation on pointerdown is what stops a bubble drag from
      // also bubbling up into PokemonCard's own handlePointerDown and
      // picking up the whole roster slot at the same time (same fix shape
      // the old native-HTML5 implementation needed via dragstart's own
      // stopPropagation).
      onPointerDown={(e: PointerEvent<HTMLDivElement>) => e.stopPropagation()}
      onMouseEnter={() => {
        // Anchor the shared Tooltip to the whole 2x2 grid's rect, not this
        // individual bubble's - keeps the tooltip in the same fixed spot
        // whichever row is hovered, instead of jumping between rows and
        // covering row 1 when row 2 is hovered (also stops it from blocking
        // a slot mid drag-and-drop reorder).
        if (gridRef.current) onHoverEnter(key, gridRef.current);
      }}
      onMouseLeave={() => onHoverLeave(key)}
      onClick={(e: MouseEvent<HTMLDivElement>) => { if (!didDrag.current) onToggleMenu(key, e); }}
      {...longPress}
      className={`w-full min-h-[2.75rem] flex items-center justify-center text-center whitespace-normal break-words px-0.5 py-1 rounded-xl text-xs @max-[160px]:text-[10.5px] @max-[160px]:tracking-tight @max-[160px]:px-0 font-bold transition-colors select-none ${theme.bg} ${theme.text} hover:opacity-80 cursor-grab`}
    >
      {label}
    </motion.div>
  );
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
  // Bumped on every completed drag and used as the Reorder.Group's key, so
  // the whole grid remounts instead of keeping stale framer layout/drag
  // transforms: items are keyed by original index, and the identity reset
  // below swaps which component sits in which slot, which otherwise leaves
  // the dragged bubble rendered at an offset from its real grid cell.
  const [resetCount, setResetCount] = useState(0);

  // Tooltip anchors to the whole grid's own rect, not the individual hovered
  // bubble's - see onMouseEnter below.
  const gridRef = useRef<HTMLDivElement>(null);

  const handleDrag = (originalIndex: number, clientX: number, clientY: number) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    // Hit-test the pointer against the grid's own 2x2 cell geometry rather
    // than neighbors' live rects, which are mid-FLIP-animation and lie.
    const col = Math.min(1, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * 2)));
    const row = Math.min(1, Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * 2)));
    const target = row * 2 + col;
    setOrder(prev => {
      if (prev.indexOf(originalIndex) === target) return prev;
      const next = prev.filter(i => i !== originalIndex);
      next.splice(target, 0, originalIndex);
      return next;
    });
  };

  const handleDragEnd = () => {
    if (order.some((slot, i) => slot !== i)) {
      onReorderMoves(order);
      // Remount so the already-final layout doesn't animate back to
      // identity positions before the re-indexed content settles.
      setOrder([...IDENTITY_ORDER]);
      setResetCount(c => c + 1);
    }
  };

  return (
    // 2D hit-test reorder (Web Reorder Jank, see TODO.md): framer's Reorder
    // is 1D-only, so row-to-row moves never registered in this 2x2 grid.
    <div key={resetCount} ref={gridRef} className="@container grid grid-cols-2 gap-1.5 w-full">
      {order.map(originalIndex => (
        <MoveBubble
          key={originalIndex}
          originalIndex={originalIndex}
          theme={themes[originalIndex]}
          label={selectedMoves[originalIndex] || `Move ${originalIndex + 1}`}
          gridRef={gridRef}
          onToggleMenu={onToggleMenu}
          onHoverEnter={onHoverEnter}
          onHoverLeave={onHoverLeave}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
}
