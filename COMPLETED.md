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

- **[Web Bug Sweep: StatsColumn EVs Share Leg 4's Stale-Local-State Bug]
  — Leg 1** (2026-10-08) - See commit `c14df4c`. `StatsColumn.tsx`'s
  `localEVs` had the same unguarded-initializer shape Leg 4 fixed elsewhere
  - never resynced when `evs` changed from an externally-applied update
  (e.g. picking a Real Set bundle), so the EV grid kept showing stale
  values. Fixed with the same `prevProp*` render-time resync pattern Leg 4
  used in `EditOverlays.tsx`/`EditablePokemonCore.tsx`. Live-verified by
  Vanny on web.

- **[Web Bug Sweep: Real Set Sampling Is Slow to Populate] — Leg 12**
  (2026-10-08) - See commit `5006f13`. The sequential sample-paste fetch loop
  (kept sequential per CLAUDE.md's eighth exception's politeness requirement,
  not parallelizable) only showed an unexplained "Sampling..." message with
  no sense of progress until it finished entirely - now reports "(N/M pastes
  checked)" and populates the Real Sets list as bundles are found instead of
  only once the whole loop completes.

- **[Web Bug Sweep: Remove Existing-vs-Imported Set Picker on Team Creation]
  — Leg 11** (2026-10-08) - See commit `7cbd7ba`. Removed the "use saved
  build or keep pasted" review step from team creation entirely, since the
  same choice is already available per-Pokémon during editing.

- **[Web Bug Sweep: Default Regulation Falls Back to the Oldest, Not the
  Current, Regulation] — Leg 10** (2026-10-08) - See commits `6494344`
  (fallback derived from `getLatestSeason()` instead of a hardcoded
  literal) and `4a49bff` (one-time migration for settings records that
  already had the old literal persisted to disk - the first fix alone
  didn't reach existing installs). Live-verified by Vanny.

- **[Web Bug Sweep: Regulation Filter Doesn't Persist Across Sessions] —
  Leg 9** (2026-10-08) - `TeamsPage.tsx`'s `activeFilter` was plain
  component-local `useState`, reset to `'All'` on every reload. Moved it
  into `settings.json` (a new `teamsFilter` field on `AppSettings`, read/
  written through `useSettings`'s existing `updateSettings`) alongside the
  other per-device UI preferences (`boxSortMode`, `showAnimatedSprites`) it
  already sits next to. See commit `954b706`. Not yet live-verified by
  Vanny.

- **[Web Bug Sweep: Team Drag-Reorder Reverts After a Few Seconds] — Leg 7**
  (2026-10-08) - Root cause turned out to be a sync-protocol gap, not the
  stale-render pattern the item originally suspected: `setTeamOrder` never
  bumped `updatedAt`, so the Worker's per-record last-write-wins merge
  (which has no concept of list position) discarded the reorder on the
  very next auto-sync (`useSync.ts`'s 5-second debounce - matching "a few
  seconds" exactly). Fixed by giving `Team` its own `sortOrder` field,
  bumped alongside `updatedAt` on every reorder so it rides along with
  that record's own merge resolution; `teamSort.ts` uses it as the
  regulation-group tiebreaker, falling back to stable array order for
  teams that don't have it yet. See commit `34bbc17`. Live-verified by
  Vanny on web.

- **[Web Bug Sweep: Teams List Should Always Sort by Regulation (Newest
  First)] — Leg 8** (2026-10-08) - `utils/teamSort.ts`'s
  `sortTeamsByFavorite` had no regulation awareness; renamed to `sortTeams`
  and added regulation (newest first) as a secondary sort key under
  favorite, with drag-order as the tiebreaker within each regulation group.
  Also let this resolve the standing "grip handle disabled while a format
  filter is active" gate in `TeamCard.tsx`/`TeamsPage.tsx` - removed
  outright, since a filtered view is now always one contiguous regulation
  group and reordering within it is well-defined. See commit `b2f5177`.
  Live-verified by Vanny on web.

- **[Web Bug Sweep: Real Sets Panel Hides Info Behind a Destructive Click]
  — Leg 5** (2026-10-08) - Clicking a bundle row in
  `CalcRealSetsSection.tsx` used to call `onPickBundle` immediately just to
  preview a truncated set, overwriting the user's current entry. Now
  expands the row in place instead; a separate "Apply This Set" button is
  the only thing that still calls `onPickBundle`. See commit `10fdec3`.
  Live-verified by Vanny on web.

- **[Web Bug Sweep: Real Set Import Not Visually Reflected] — Leg 4**
  (2026-10-08) - Separate root cause from Legs 1/2: `EditOverlays.tsx`'s
  `selectedItem`/`selectedAbility`/`selectedMoves` and
  `EditablePokemonCore.tsx`'s `localNickname`/`isLocalShiny`/`localGender`
  each initialized once via `useState(pokemon.showdownData.X)` and never
  resynced when the `pokemon` prop changed from an externally-applied
  update (e.g. Real Set import) that bypasses the components' own
  optimistic on-click handlers. Fixed with the same "adjust state during
  render" prop-resync pattern `TeamCard.tsx`'s `rosterIdsKey` already uses.
  Live-verified on desktop via `run-desktop`: picking a Real Set bundle
  updated the ability pill and all 4 move bubbles immediately with no
  remount needed. Surfaced a related bug in `StatsColumn.tsx` during that
  same verification pass, tracked separately in `TODO.md`. Not yet
  confirmed by Vanny on the live web deploy.

- **[Web Bug Sweep: Item Selector Spawns Off-Screen] — Leg 3** (2026-10-08) -
  Separate root cause from Legs 1/2: the picker panel's max-height was
  measured against the wrong side (always "space below the trigger") while
  `FloatingCardPanel` independently flips the panel above the trigger
  whenever there's room, letting it grow past the top of the card/viewport;
  chrome (search input/padding) also wasn't counted in the height budget.
  User-verified live on web after the `deploy-web.yml` GitHub Pages deploy
  picked up the fix. See commit `a4598cc`.

- **[Web Bug Sweep: Export Shows Stale Data, Reverts on Refresh] — Leg 2**
  (2026-10-08) - Same root cause as Leg 1's lost-update race; resolved by
  the same fix, user-verified live. See commit `1f51dac`.

- **[Web Bug Sweep: Team Edit Needs Double Action] — Leg 1** (2026-10-08) -
  `useTeams.ts`'s mutators rebuilt "next state" from a closured `teams`
  value with no serialization between concurrent calls, so two edits fired
  before a re-render (e.g. EV hold-to-repeat) could race and silently drop
  one. Fixed with a synchronously-updated ref + serializing write queue;
  `useActiveEditor`, the original suspect, confirmed to be unrelated dead
  code (now its own cleanup TODO). User-verified live. See commit
  `1f51dac`.

- **[Web Reorder Jank] — Leg 2** (2026-10-03) -
  Ported the 2D pointer hit-test reorder to the roster grid, Box and teams list via a shared `useGridReorder` hook (slot rects snapshotted at drag start). User-verified live: snap-back, cross-row swaps and mixed-height targeting all behave. See commit `e8bcfaf`.

- **[Web Reorder Jank] — Leg 1** (2026-10-03) -
  Move-slot reorder was broken because framer's 1D `Reorder` can't swap across rows of the 2x2 grid, and the identity reset animated bubbles back before shifting. Replaced with a 2D pointer hit-test reorder, user-verified live. See commit `c0dd045`.

- **[Web Species Search Cold-Cache Stats] — Leg 2** (2026-10-03) -
  Added `useSpeciesStatsPrefetch`, a non-gating web pass (concurrency 3, one
  per session) that backfills missing legal-roster species stats. User-verified
  live; no batching needed. See commit `52096a9`.

- **[Web Species Search Cold-Cache Stats] — Leg 1** (2026-10-03) -
  scoping only. Cause: `AppWeb` never runs `useInitialSync`, so the stat
  table's cache join is empty until a species is picked. Decision: background
  stats-only prefetch; plan recorded in `TODO.md`'s Leg 2. See commit `90cf55c`.

- **[Team Add-Pokémon Species Search Parity] — Leg 2** (2026-10-03) -
  Roster Swap on `PokemonCard`/`MobilePokemonCard` now opens
  `AddPokemonStatTable` (as a modal, card stays in place) instead of
  `SpeciesPickerCard`, with `#tag` search, Mega rows (stone pre-equipped via
  `swapSlot`'s new `itemOverride`) and other-slot Species Clause filtering.
  Confirmed by the user in the app. See commit `a6fc6e8`.

- **[Team Add-Pokémon Species Search Parity] — Leg 1** (2026-10-03) -
  scoping only. Desktop `TeamCard` and `BoxPage` already use
  `AddPokemonStatTable`; the real gap is Roster Swap still using plain
  `SpeciesPickerCard`. Plan recorded in `TODO.md`'s Leg 2. See commit `b386ce0`.

- **[Mega Stone Sprites] — Leg 1** (2026-10-03) -
  Not a regression: the 36 Champions-new Mega Stones never had PokeAPI sprites (null/404), only Fairy Feather had a Serebii fallback. Generalized it via `utils/itemSprite.ts` across the item box, picker, and poster tiles. See commit `7fd8f2d`.

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
