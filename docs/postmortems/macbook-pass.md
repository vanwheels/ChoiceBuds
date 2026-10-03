# Post-mortem: MacBook Pass

**Date:** 2026-10-03. **Status:** Shipped, 2 fixes plus 1 leg closed with
no change. Implementation detail lives in each `COMPLETED.md` entry and its
commit. This doc is the retrospective.

## What shipped

1. **Team Card Grid Layout Re-check.** The real 14" MacBook pass showed
   the earlier 1040px six-column fix was wrong. It was re-fixed with a
   narrower sidebar, the duplicated TeamsPage padding removed, compacted
   card content and a 1220px breakpoint. See commit `997fb98`.
2. **SP Editor Overflow.** The active stat editor widened its grid column
   and pushed the other stats out of the box. It now floats over its row.
   See commit `8c7aef7`.
3. **Calc Button Card Overlap.** Closed with no change: the user doesn't
   consider it a problem, since the button floats rather than being fixed
   in the layout.

## What went well

- **Measuring overflow instead of eyeballing it.** A `run-desktop` eval
  compared each card element's `scrollWidth` with its `clientWidth`, and
  its bounds with the card's, at the real 1512px width and at the
  breakpoint edge. That caught overflows a screenshot hid, and it showed
  "Flamethrower" was 77px at 11px, not the estimated 72.
- **Recovering width before shrinking content.** The ~64px of doubled
  padding and the 32px of sidebar width were free space. They did most of
  the work before any font or padding was reduced.

## What didn't go well / friction points

- **The previous leg's "verified" fix was wrong.** It checked one fixed
  floor (the sprite box) on a resized window and called it done. It never
  checked the content that wraps or overflows (type badges, move names,
  the SP row). The mono/dual-type height mismatch it caused looked like an
  old regression coming back, but it was a new side effect.
- **One wasted run-desktop call** happened because the driver launched
  before the teams list had rendered. `wait <selector>` before `click`
  fixed it.

## Scope creep observed

None. The Calc overlap was logged as its own leg rather than folded into
the grid fix, and it was then dropped on the user's call.

## What changes for the next milestone

- For any layout breakpoint or width tuning, verify with a DOM overflow
  check at the narrowest width the breakpoint allows, not only at the
  target device's width.
