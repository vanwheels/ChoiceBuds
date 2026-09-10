# Post-mortem: UI Polish & Performance

**Date:** 2026-09-10 (single-day, 5-leg arc). **Status:** Shipped. Full
implementation detail lives in `COMPLETED.md`'s entries for each leg below
(`git log` range `d0116ee..9c28d29`) - this doc is the retrospective, not a
restatement.

## What shipped

A performance investigation plus two small, unrelated UI bug fixes, in 5
legs:

1. **Investigate App Lag** (`d0116ee`) - static analysis + real userData
   file measurements root-caused the app's growing lag to
   `useGameData.ts`/`useDatabase.ts` writing their *entire* cache object to
   disk on every single cache-entry mutation, with `useUsageSync.ts`'s
   whole-roster re-sync on launch as the main burst trigger against an
   already-2.1MB `game-data-cache.json`. Full analysis:
   [docs/investigations/app-lag-investigation.md](../investigations/app-lag-investigation.md).
2. **Debounce Game-Data/PokeAPI Cache Persistence** (`73d29b5`) - a shared
   `useDebouncedWrite` hook, used as the sole write-through path in both
   hooks, collapsing a burst of mutations into a handful of writes instead
   of one per entry.
3. **Team Card Collapse Animation Flicker** (`0997d17`) - fixed a
   `TeamCard.tsx` bug (unrelated to the performance work above) where
   collapsing a card snapped its grid column back to single-width before
   the exit transition had played, racing framer's FLIP-animated sibling
   reflow against the still-collapsing content's own `@container`
   breakpoint change.
4. **Move Tooltip Position Fix on 2x2 Grid** (`3fa6718`) - fixed
   `MoveBubbleGrid`'s shared tooltip flipping per-hovered-bubble instead of
   per-grid, so row 2's tooltip no longer overlapped row 1.
5. **Skip Redundant Unchanged-Cache Rewrite On Launch** (`89718de`) -
   follow-up to Leg 2: the debounced write-through effect still fired once
   on the very first (unchanged, freshly-loaded-from-disk) cache value it
   saw on every mount. `useDebouncedWrite` now takes a disk-snapshot string
   to compare against and skips the write when it matches.

## What went well

- **Static root-causing over live profiling.** The lag investigation
  reached a confident diagnosis from code inspection + real file-size/
  timing measurements without needing a live dev-vs-prod A/B - the
  mechanism (full-object `JSON.stringify` + write on every mutation) is
  identical in both, so a live repro would have cost real setup time
  without changing the answer. Documented as a deliberate scope call in
  the investigation doc itself, not an oversight.
- **The fix unified two hooks' divergent write-through logic** instead of
  patching each separately - `useDatabase.ts`'s several direct per-call-site
  writes collapsed into the same one-effect shape `useGameData.ts` now
  shares via `useDebouncedWrite`.
- **The follow-up leg got its own ticket instead of scope-creeping into
  Leg 2.** The debounce fix's known, disclosed tradeoff (a quit within the
  ~500ms window could lose the last unwritten mutation - accepted, since
  these are reconstructable API caches, not user data) was surfaced
  alongside a *separate* gap (the redundant first-mount write) that got
  filed as its own TODO item and picked up as Leg 5, rather than either
  being bundled into Leg 2 or left undiscovered.
- **Both UI bugs (Legs 3 and 4) were root-caused to the exact interaction**
  rather than patched symptomatically - the collapse flicker to a specific
  ordering between a CSS class flip and an exit-transition callback, the
  tooltip to positioning being computed per-anchor instead of per-container.

## What didn't go well / friction points

- **The debounce fix didn't fully close the "needless work on every
  launch" complaint by itself.** Leg 2's debounce collapsed a *burst* of
  mutations into fewer writes, but didn't address the separate case of a
  single write firing on mount for a value that was just read unchanged
  from disk - that took a second small leg (Leg 5) once the gap was
  noticed, rather than being caught during Leg 2's own design.

## Scope creep observed

None - each leg stayed inside its own defined fix. Legs 3/4 (unrelated UI
bugs) were opportunistically picked up in the same milestone rather than
deferred, but neither expanded scope once started; each was a single,
bounded root-cause-and-fix.

## What changes for the next milestone

- When debouncing/batching a write-through effect to fix a mutation-burst
  problem, explicitly check the "first mount with an already-correct,
  unchanged value" case as part of the same design pass, rather than
  treating it as symmetric with a later real mutation and discovering the
  gap as a follow-up.
- Two unrelated bugs this milestone (tooltip position, collapse flicker)
  both traced back to the same category of mistake: a layout/positioning
  calculation anchored to the wrong DOM node (an individual item instead of
  its shared container). Worth a quick "is this measuring the right
  element" check up front the next time a position/animation bug shows
  inconsistent behavior across sibling instances of the same component.
