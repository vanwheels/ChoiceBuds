# Post-mortem: Fixes & Adjustments

**Date:** 2026-10-03. **Status:** Shipped, 6 legs across 3 items plus 1
scoping-only leg. Implementation detail lives in each `COMPLETED.md` entry
and its commit. This doc is the retrospective.

## What shipped

1. **Mega Stone Sprites.** The 36 Champions-new Mega Stones never had
   PokeAPI sprites, so they showed blank. Generalized the Serebii fallback
   (previously only Fairy Feather) via `utils/itemSprite.ts`. See commit
   `7fd8f2d`.
2. **Team Add-Pokémon Species Search Parity (Legs 1-2).** Scoping showed
   desktop `TeamCard` and `BoxPage` already used the stat-table picker; the
   real gap was Roster Swap. It now opens `AddPokemonStatTable`. See commit
   `a6fc6e8`.
3. **Web Species Search Cold-Cache Stats (Legs 1-2).** The web stat table
   was empty until a species was picked because `AppWeb` never runs
   `useInitialSync`. Added a non-gating background stats prefetch. See
   commit `52096a9`.
4. **Web Reorder Jank (Legs 1-2).** Framer's 1D `Reorder` couldn't swap
   across rows, and the move grid snapped back on release. Replaced it with
   a 2D pointer hit-test, first in the move grid (`c0dd045`), then in the
   roster grid, Box and teams list through a shared `useGridReorder` hook
   (`e8bcfaf`). All user-verified live.

## What went well

- **Scoping legs corrected the premise before building.** Species Search
  Parity looked like three surfaces to fix and turned out to be one.
- **Splitting the reorder fix by surface.** Proving the hit-test on the
  small 2x2 grid first made the shared-hook port a mechanical second leg.
- **A pure helper for the hit-test.** Slot picking and reordering are
  unit-tested without a DOM or framer.

## What didn't go well / friction points

- **Lint rejected the first hook shape.** Returning the container ref and
  the handler factory in one object tripped `react-hooks/refs` at every call
  site; destructuring at the call site fixed it.
- **COMPLETED.md was left malformed.** Several entries had been appended
  below a stray `</content>` line in a different heading style, out of
  newest-first order. Repaired at close-out.

## Scope creep observed

None. Adjacent findings were logged as their own legs.

## What changes for the next milestone

- Add new COMPLETED.md entries at the top, in the file's bullet format.
- A shared hook that returns a ref should expose it separately from any
  function that is called during render.
