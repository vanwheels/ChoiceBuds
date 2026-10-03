/**
 * useGridReorder.ts - 2D pointer hit-test drag-reorder for item grids
 * Shared by the roster grid (TeamCard), Box grid (BoxPage) and teams list
 * (TeamsPage) - Web Reorder Jank Leg 2, see TODO.md. Framer's Reorder.Group
 * only detects swaps along one axis, so a drag between rows never
 * registered. Instead, each item snapshots its sibling slot rects (relative
 * to the container) when a drag starts, and every onDrag picks the slot
 * under the pointer. Snapshotted rather than live rects, since live ones
 * are mid-FLIP-animation and lie (same reasoning as MoveBubbleGrid.tsx,
 * which hit-tests a fixed 2x2 instead). Items opt in by rendering
 * `data-reorder-id={id}` and wiring the returned handlers onto a framer
 * `motion.div` with `drag`.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { PanInfo } from 'framer-motion';

export interface SlotRect { left: number; top: number; width: number; height: number }

/** Spreads onto a motion.div: adapts the handlers to framer's drag callback signatures. */
export function toMotionDragProps(h: GridReorderHandlers) {
  return {
    onDragStart: h.onDragStart,
    // info.point is page-space; the container rect is viewport-space.
    onDrag: (_e: unknown, info: PanInfo) => h.onDrag(info.point.x - window.scrollX, info.point.y - window.scrollY),
    onDragEnd: h.onDragEnd,
  };
}

export interface GridReorderHandlers {
  onDragStart: () => void;
  onDrag: (clientX: number, clientY: number) => void;
  onDragEnd: () => void;
}

/** Slot containing the point, else the slot with the nearest center. -1 if no slots. */
export function pickSlotIndex(slots: SlotRect[], x: number, y: number): number {
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];
    if (x >= s.left && x <= s.left + s.width && y >= s.top && y <= s.top + s.height) return i;
    const dx = x - (s.left + s.width / 2);
    const dy = y - (s.top + s.height / 2);
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) { bestDist = dist; best = i; }
  }
  return best;
}

/** Returns a copy of `ids` with `id` moved to `target`; same array if already there. */
export function moveToIndex<T>(ids: T[], id: T, target: number): T[] {
  const from = ids.indexOf(id);
  if (from === -1 || from === target) return ids;
  const next = ids.filter(i => i !== id);
  next.splice(target, 0, id);
  return next;
}

interface Options<T extends string> {
  orderedIds: T[];
  setOrderedIds: (ids: T[]) => void;
  /** Fired once per completed drag with the final order. */
  onCommit: (ids: T[]) => void;
}

export function useGridReorder<T extends string>({ orderedIds, setOrderedIds, onCommit }: Options<T>) {
  const containerRef: RefObject<HTMLDivElement | null> = useRef(null);
  const slots = useRef<SlotRect[]>([]);
  // Latest order for onDragEnd, which would otherwise close over a stale one.
  const latest = useRef(orderedIds);
  useEffect(() => { latest.current = orderedIds; }, [orderedIds]);

  const snapshot = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const c = container.getBoundingClientRect();
    const byId = new Map<string, SlotRect>();
    container.querySelectorAll<HTMLElement>(':scope > [data-reorder-id]').forEach(el => {
      const r = el.getBoundingClientRect();
      byId.set(el.dataset.reorderId ?? '', { left: r.left - c.left, top: r.top - c.top, width: r.width, height: r.height });
    });
    slots.current = latest.current.map(id => byId.get(id)).filter((r): r is SlotRect => r !== undefined);
  }, []);

  const getHandlers = (id: T): GridReorderHandlers => ({
    onDragStart: snapshot,
    onDrag: (clientX, clientY) => {
      const c = containerRef.current?.getBoundingClientRect();
      if (!c || slots.current.length !== latest.current.length) return;
      const target = pickSlotIndex(slots.current, clientX - c.left, clientY - c.top);
      if (target === -1) return;
      const next = moveToIndex(latest.current, id, target);
      if (next !== latest.current) { latest.current = next; setOrderedIds(next); }
    },
    onDragEnd: () => onCommit(latest.current),
  });

  return { containerRef, getHandlers };
}
