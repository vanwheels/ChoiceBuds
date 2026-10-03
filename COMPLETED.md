# ChoiceBuds - Completed Work Log

Archive of finished work, split out of `TODO.md` (2026-07-08) to keep the
active task list quick to scan. Newest entries first. Cross-references to
still-open items point to `TODO.md`; references to other entries here stay
local ("see below"/"see above").

Archived at milestone boundaries as of the 2026-09-30 split (Post-Parity
Polish - see `MILESTONES.md`), per CLAUDE.md's archiving rules: a shipped
milestone becomes the real cutoff instead of an arbitrary entry count.
Entries prior to this file's oldest are in:
- [docs/archive/completed-2026-06-17-to-2026-07-09.md](docs/archive/completed-2026-06-17-to-2026-07-09.md)
  (the 50 oldest entries as of the 2026-08-31 split)
- [docs/archive/completed-2026-07-09-to-2026-09-01.md](docs/archive/completed-2026-07-09-to-2026-09-01.md)
  (everything through the Battle Logger Re-eval + Data & Process Cleanup
  milestone, split out at the 2026-09-08 Card UI Polish boundary)
- [docs/archive/completed-2026-09-01-to-2026-09-13.md](docs/archive/completed-2026-09-01-to-2026-09-13.md)
  (Card UI Polish through Regular Calc Popup and everything shipped between
  them, split out at the 2026-09-13 Regular Calc Popup boundary)
- [docs/archive/completed-2026-09-13-to-2026-09-30.md](docs/archive/completed-2026-09-13-to-2026-09-30.md)
  (VGCPastes Real-Set Sourcing through Post-Parity Polish and everything
  shipped between them, split out at the 2026-09-30 Post-Parity Polish
  boundary)

- **[Calc Button Card Overlap] — Leg 1** (2026-10-03) - closed with no
  change: the user doesn't consider the floating Calc button covering the
  last card a problem, since the button isn't fixed in the layout. This
  closes the MacBook Pass milestone (see `MILESTONES.md`).

- **[SP Editor Overflow] — Leg 1** (2026-10-03) - the active stat's
  -/input/+ editor widened its `1fr` grid column and pushed the other stats
  out of the box on narrow cards. Columns are now fixed equal widths and
  the editor floats over its row, anchored by column. See commit `8c7aef7`.

- **[Team Card Grid Layout Re-check] — Leg 1** (2026-10-03) - the earlier
  1040px six-column breakpoint left ~170px cards on a real 14" MacBook,
  which wrapped the type badges and overflowed the move names/SP badge.
  Re-fixed by narrowing the sidebar, removing duplicated padding,
  compacting the card content and using a 1220px breakpoint. Confirmed by
  the user on device. See commit `997fb98`.

- **[Desktop Startup Sync Loop Fix] — Leg 1** (2026-10-03) - the
  LoadingScreen looping through its download phases on launch was
  concurrent `setCacheEntry` writes clobbering each other (stale closure),
  re-triggered by the missing-entry self-heal. Fixed with a functional
  update plus a once-per-session self-heal guard. See commit `8b2aada`.

- **[Web TeamCard Expand Infinite-Loop Bug] — Leg 2** (2026-09-30) - see
  commit `31b425e`. The fix Leg 1 scoped: `useGameData.ts`'s getters now
  read the cache through a ref (synced via a plain effect) instead of
  closing over the `cache` state value in each `useCallback`, so they no
  longer need `cache` in their own dependency arrays and keep a stable
  identity across renders - the self-healing forced-miss checks
  (hasChampionsMoveData, target/meta presence, spriteUrl placeholder) are
  unchanged since they read the same cache shape, just via the ref. Closes
  the item outright - both legs of this milestone's items are now shipped,
  closing out the Data Audit & Bug Fix Sweep milestone (see `MILESTONES.md`).

- **[Web TeamCard Expand Infinite-Loop Bug] — Leg 1** (2026-09-30). Pure
  root-causing pass, no app code changed - full reasoning is in
  `docs/investigations/web-teamcard-expand-infinite-loop.md` since no single
  diff captures it. Confirmed live (stack-trace capture in a disposable
  Playwright script against the web build) that the looping `setState` call
  originates inside `EditOverlays.tsx`'s per-Pokémon data-fetch effects, and
  confirmed via direct code reading that `useGameData.ts`'s
  `getEnrichedSpeciesOptions`/`getChampionsUsage` (and their whole dependency
  chain) get a brand-new identity on every single `setCache` call anywhere
  in the app - since those functions are listed in `EditOverlays.tsx`'s
  effect dependency arrays, one cache write from any mounted `PokemonCard`
  re-fires every other mounted `EditOverlays` instance's effects too. With
  4+ concurrently-mounted cards holding freshly-imported, never-cached
  species, that cascades. The narrow-width correlation isn't a second cause
  - no `ResizeObserver`/`matchMedia`/`IntersectionObserver` exists anywhere
  in `src/renderer` to branch on width - it's a timing effect: fewer grid
  columns below certain widths stacks more cards (and their Framer Motion
  layout-animation work) into the same render window as the cache-churn
  cascade, which is what tips total re-renders over React's loop-detection
  threshold. Leg 2 (the actual fix, not yet decided/implemented) is in
  `TODO.md`.

- **[Reg M-C Z-A-Exclusive Movepool Audit] — Leg 1** (2026-09-30) - see
  commit `b990967`. Re-ran Leg 4b's PokeAPI-vs-`learnsets.ts` diff
  methodology (see `docs/investigations/champions-showdown-mod-audit.md`)
  against the full current legal roster rather than just the 3 hand-picked
  indicator species - confirmed the zero-`hasChampionsMoveData` set is
  exactly all 25 Reg M-C-added species (no regressions elsewhere) and
  populated `CHAMPIONS_MOVEPOOL_ADDITIONS`/`CHAMPIONS_MOVEPOOL_REMOVALS` for
  all 25, superseding the 5 single-move entries hand-added during Reg M-C
  Prep. Closes the item outright - no further legs needed; the existing
  `hasChampionsMoveData !== true` self-heal already covers pruning this data
  once PokeAPI eventually back-fills Reg M-C.
</content>

## [Mega Stone Sprites] — Leg 1 (2026-10-03)
Not a regression: the 36 Champions-new Mega Stones never had PokeAPI sprites (null/404), only Fairy Feather had a Serebii fallback. Generalized it via `utils/itemSprite.ts` across the item box, picker, and poster tiles. See commit `PENDING`.
