# Box entry modal

Deep-dive split out of `ARCHITECTURE.md`; the summary there links here.

- `src/renderer/components/BoxPageGrid.tsx` mounts a single
  `BoxEntryModal.tsx` instance (not one per card) and swaps its `entry`
  prop on expand instead of reflowing the grid in place — the Box's
  previous expand-in-place behavior grew the grid cell itself, which
  reshuffled every tile after it. A single shared instance also makes
  prev/next navigation between box entries flicker-free: cycling swaps the
  prop instead of closing one card's popup and mounting the next one's.
  Navigation (Left/Right arrow keys or the modal's own flanking
  sprite-preview buttons) walks the box's current search-filtered order.
  `Modal.tsx` gained an opt-in `onOverlayClick` prop for this (every other
  modal keeps click-outside inert by default), and `ContextMenu.tsx`'s
  z-index sits above `Modal.tsx`'s so a right-click inside the popup still
  opens on top of it rather than behind its overlay.
