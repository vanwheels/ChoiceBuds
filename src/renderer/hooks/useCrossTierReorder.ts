/**
 * useCrossTierReorder.ts - 2D drag-reorder that can also flip an item
 * between two sibling containers
 * useGridReorder-adjacent sibling for Profile Section Drag-and-Drop Between
 * Open/Closed (see TODO.md): useGridReorder.ts's hit-testing is scoped to
 * one container's own ids, so it has no way to notice a drag crossing into
 * a sibling container. This hook snapshots both tiers' container rects on
 * drag start and, once the pointer leaves its current tier's rect and
 * enters the other tier's, moves the dragged id across (appended at the
 * end - no slot hit-testing against the far tier, since a card picked up
 * here was never snapshotted against that tier's own layout) instead of
 * reordering in place. Reuses useGridReorder's pure slot math
 * (pickSlotIndex/moveToIndex) for the in-tier case rather than duplicating
 * it.
 */

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import {
  pickSlotIndex,
  moveToIndex,
  type SlotRect,
  type GridReorderHandlers,
} from './useGridReorder';

export type ProfileTier = 'open' | 'closed';

interface TierBinding<T extends string> {
  ids: T[];
  setIds: (ids: T[]) => void;
}

interface Options<T extends string> {
  tiers: Record<ProfileTier, TierBinding<T>>;
  /** Fired once per completed drag that stayed in its starting tier. */
  onReorder: (tier: ProfileTier, ids: T[]) => void;
  /** Fired once per completed drag that ended in the other tier. */
  onMoveTier: (id: T, toTier: ProfileTier, ids: T[]) => void;
}

const OTHER_TIER: Record<ProfileTier, ProfileTier> = { open: 'closed', closed: 'open' };

/** Whether (x,y) falls inside rect - undefined (no such container, e.g. an
 * empty/unmounted tier) never counts as inside. */
export function pointInRect(x: number, y: number, rect: DOMRect | undefined): boolean {
  return !!rect && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/** `ids` with `id` moved out of `from` and appended to the end of the other
 * tier - no slot hit-testing against the far tier, since a card picked up
 * in `from` was never snapshotted against that tier's own layout. */
export function moveToOtherTier<T extends string>(
  ids: Record<ProfileTier, T[]>,
  id: T,
  from: ProfileTier,
): Record<ProfileTier, T[]> {
  const to = OTHER_TIER[from];
  return {
    ...ids,
    [from]: ids[from].filter((i) => i !== id),
    [to]: [...ids[to], id],
  };
}

export function useCrossTierReorder<T extends string>({
  tiers,
  onReorder,
  onMoveTier,
}: Options<T>) {
  const containerRefs: Record<ProfileTier, RefObject<HTMLDivElement | null>> = {
    open: useRef(null),
    closed: useRef(null),
  };

  // Always-current ids per tier, mirroring useGridReorder's own `latest`
  // ref - rapid onDrag calls would otherwise read the `tiers` closure
  // captured when getHandlers was created, which goes stale after the
  // first move of a gesture.
  const idsRef = useRef<Record<ProfileTier, T[]>>({
    open: tiers.open.ids,
    closed: tiers.closed.ids,
  });
  useEffect(() => {
    idsRef.current = { open: tiers.open.ids, closed: tiers.closed.ids };
  }, [tiers.open.ids, tiers.closed.ids]);

  const slotsRef = useRef<Record<ProfileTier, SlotRect[]>>({ open: [], closed: [] });
  const dragTierRef = useRef<ProfileTier | null>(null);

  const snapshotTier = (tier: ProfileTier) => {
    const container = containerRefs[tier].current;
    if (!container) {
      slotsRef.current[tier] = [];
      return;
    }
    const c = container.getBoundingClientRect();
    const byId = new Map<string, SlotRect>();
    container.querySelectorAll<HTMLElement>(':scope > [data-reorder-id]').forEach((el) => {
      const r = el.getBoundingClientRect();
      byId.set(el.dataset.reorderId ?? '', {
        left: r.left - c.left,
        top: r.top - c.top,
        width: r.width,
        height: r.height,
      });
    });
    slotsRef.current[tier] = idsRef.current[tier]
      .map((id) => byId.get(id))
      .filter((r): r is SlotRect => r !== undefined);
  };

  const getHandlers = (id: T, tier: ProfileTier): GridReorderHandlers => ({
    onDragStart: () => {
      dragTierRef.current = tier;
      snapshotTier('open');
      snapshotTier('closed');
    },
    onDrag: (clientX, clientY) => {
      const from = dragTierRef.current;
      if (!from) return;
      const to = OTHER_TIER[from];
      const toRect = containerRefs[to].current?.getBoundingClientRect();

      if (pointInRect(clientX, clientY, toRect)) {
        idsRef.current = moveToOtherTier(idsRef.current, id, from);
        dragTierRef.current = to;
        tiers[from].setIds(idsRef.current[from]);
        tiers[to].setIds(idsRef.current[to]);
        snapshotTier(from);
        snapshotTier(to);
        return;
      }

      const fromRect = containerRefs[from].current?.getBoundingClientRect();
      if (!fromRect || slotsRef.current[from].length !== idsRef.current[from].length) return;
      const target = pickSlotIndex(
        slotsRef.current[from],
        clientX - fromRect.left,
        clientY - fromRect.top,
      );
      if (target === -1) return;
      const next = moveToIndex(idsRef.current[from], id, target);
      if (next !== idsRef.current[from]) {
        idsRef.current = { ...idsRef.current, [from]: next };
        tiers[from].setIds(next);
      }
    },
    onDragEnd: () => {
      const from = dragTierRef.current;
      dragTierRef.current = null;
      if (!from) return;
      if (from === tier) {
        onReorder(from, idsRef.current[from]);
      } else {
        onMoveTier(id, from, idsRef.current[from]);
      }
    },
  });

  return { containerRefs, getHandlers };
}
