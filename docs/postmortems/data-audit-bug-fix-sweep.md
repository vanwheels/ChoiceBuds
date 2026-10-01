# Post-mortem: Data Audit & Bug Fix Sweep

**Date:** 2026-09-30 (same day as Post-Parity Polish, immediately after it
shipped). **Status:** Shipped, 2 items. Full implementation detail for each
item below lives in its own `COMPLETED.md` entry; this doc is the
retrospective, not a restatement.

## What shipped

Two already-ready items pulled out of `TODO.md`'s Unscheduled section once
Post-Parity Polish closed:

1. **Reg M-C Z-A-Exclusive Movepool Audit.** Re-ran the PokeAPI-vs-
   `learnsets.ts` diff methodology against the full current legal roster
   (not just 3 hand-picked indicator species), confirming the zero-
   `hasChampionsMoveData` set is exactly all 25 Reg M-C-added species and
   populating `CHAMPIONS_MOVEPOOL_ADDITIONS`/`CHAMPIONS_MOVEPOOL_REMOVALS`
   for all 25. See commits `b990967`, `51d6d00`.
2. **Web TeamCard Expand Infinite-Loop Bug.** A two-leg item: Leg 1
   root-caused a "Maximum update depth exceeded" crash on the web build
   (narrow-width/4+-Pokémon team expansion) to `useGameData.ts`'s public
   getters changing identity on every unrelated cache write, cascading
   through `EditOverlays.tsx`'s per-Pokémon effect dependency arrays. Leg 2
   fixed it by reading the cache through a ref instead of closing over the
   `cache` state value in each `useCallback`. See commits `7ba63d7`,
   `31b425e`.

## What went well

- **Leg 1/Leg 2 split on the infinite-loop bug** kept the root-causing pass
  (stack-trace capture via a disposable Playwright script, dependency-chain
  reading) separate from the fix itself, so the fix PR is a small, reviewable
  diff against an already-written, already-verified root cause rather than a
  combined "investigate and guess" change.
- **Both items were already fully scoped before this milestone opened** (one
  was a known audit follow-up, the other had its root cause pre-written in
  `docs/investigations/`), so there was no scoping overhead - straight to
  implementation for both.

## What didn't go well / friction points

- **No live/manual UI re-verification of the infinite-loop fix was done in
  this pass** - type-check, lint, and the full Vitest suite all pass, and the
  fix removes exactly the stale-closure mechanism Leg 1 identified, but the
  bug itself only reproduced under a specific live-resize timing condition
  (narrow width while already expanded, fresh/uncached species). Per project
  convention, visual/UI verification defaults to the user checking the
  running app themselves - flagged here since this particular bug's repro
  conditions are narrow enough that a quick resize-and-expand check with a
  fresh team is worth doing before considering it fully closed.

## Scope creep observed

- None. Both items shipped exactly as scoped going in - the Reg M-C audit's
  scope (full roster vs. the original 3 indicator species) was already
  decided before this milestone opened, and the infinite-loop fix's Leg 2
  stuck to the single mechanism Leg 1 identified (getter identity stability)
  without expanding into unrelated `useGameData.ts` cleanup.

## What changes for the next milestone

- No current milestone is scoped as of this close-out - `TODO.md`'s
  Unscheduled and Future Milestones sections carry several unscoped
  candidates (the UI Shift Assessment Sweep, the two Web Version
  fast-follows, the download/landing page, web content-area padding gap,
  Teams search bar, and Battle Logging events) - next session should scope
  one of these into a leg list before opening a new `## Current Milestone:`
  section.
- Have the user do a quick manual resize/expand check on the infinite-loop
  fix (narrow width, freshly-imported 4+-species team) the next time they're
  in the app, given the friction point noted above.
