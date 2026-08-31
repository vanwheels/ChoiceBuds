# ChoiceBuds - Completed Work Log

Archive of finished work, split out of `TODO.md` (2026-07-08) to keep the
active task list quick to scan. Newest entries first. Cross-references to
still-open items point to `TODO.md`; references to other entries here stay
local ("see below"/"see above").

Rolling ~50-entry window as of 2026-08-31 (no milestone reached yet to anchor
a real archive cutoff, so this rolls instead - see CLAUDE.md's archiving
rules): once this file exceeds ~50 entries, the oldest are split out to
`docs/archive/completed-<oldest-date>-to-<newest-date-in-that-split>.md` and
this note's list grows by one line. Entries prior to this file's oldest are
in:
- [docs/archive/completed-2026-06-17-to-2026-07-09.md](docs/archive/completed-2026-06-17-to-2026-07-09.md)
  (the 50 oldest entries as of the 2026-08-31 split)

- **Pokemon Picker Ability Search - Leg 1** (2026-08-31). Extends the
  species picker's `#tag` search (see Move-Name Search below) with a third
  kind: an ability name, e.g. `#flashfire` surfacing every species that can
  have Flash Fire, via PokeAPI's `/ability/{name}` endpoint (`pokemon`
  field). New `usePokemonAbilityFilter` hook mirrors `usePokemonMoveFilter`'s
  cache/loading shape. Tag disambiguation in `SpeciesPickerCard.tsx` is
  sequential: a type match wins outright, then a move name is tried, and
  only once the move lookup confirms a 404 (not just "hasn't loaded yet")
  does it fall back to an ability lookup — the new `isMoveResolved` export
  from `usePokemonMoveFilter.ts` is what lets the fallback tell "still
  loading" apart from "confirmed not a move" using the hook's existing
  cache, without changing its own return contract. See commit `09dfd34`.

- **Pokemon Picker Move-Name Search - Leg 1** (2026-08-31). The species
  picker's `#tag` convention (previously type-only, e.g. `#fire`) now also
  accepts a move name (e.g. `#dragon dance`): a `#tag` that isn't one of the
  18 real types is looked up via PokeAPI's `/move/{name}` endpoint, whose
  `learned_by_pokemon` field already lists every species that can learn it,
  surfacing all of them instead of requiring an exact species-name match.
  New `usePokemonMoveFilter` hook mirrors `usePokemonTypeFilter`'s
  cache/loading shape. See commit `b994422`.

- **Calc Mega Toggle Ability Revert - Leg 1** (2026-08-31). Toggling a Mega
  off left the ability field stuck on the Mega-forced ability instead of
  restoring whatever was set beforehand. Fixed in `CalcPokemonPanel.tsx` by
  capturing the pre-Mega ability into a ref (keyed to the forme family, so a
  stale value can't survive an unrelated species swap) when toggling into a
  Mega, and restoring it when toggling back to the base forme. See commit
  `3070c35`.

- **Mega Eligibility Team Builder vs Calc Mismatch - Leg 1** (2026-08-31).
  Root cause: the two surfaces read Mega eligibility from two unrelated
  data sources - the team builder from a Serebii-verified curated list,
  Calc from `@smogon/calc`'s own bundled species dex, which turned out to
  model a broader mainline/Legends Z-A roster than Champions actually
  supports (15 extra species, plus a spurious duplicate Mega form for
  Absol/Garchomp/Lucario). Fixed by gating Calc's forme detection on the
  same curated list. See commit `e9680f1`.

- **Offline Item/Mega Sprite Caching - Leg 1** (2026-08-31). Root cause was
  two-fold: item sprites were bulk-downloaded by `useInitialSync` but the
  components rendering them (`ItemSpriteBox`, `ItemPickerPanel`) never asked
  for the resolved local path, and Mega form sprites weren't part of the
  bulk sync at all (plus the Battle Log roster rendered them unresolved even
  when cached). See commit `37f984e`.

- **Post-Mortem + Milestones System - Leg 1** (2026-08-31). Set up
  `MILESTONES.md` at repo root and `docs/postmortems/<milestone-slug>.md`
  per CLAUDE.md's archiving convention, anchored to the first real
  milestone (user's call, over waiting for the next version bump): the
  UI/UX overhaul that wrapped 2026-08-29 (color palette, Teams-carousel/
  grid, sidebar/menuing, window sizing, animation/motion - see entries
  below). First post-mortem covers what shipped, what went well (design-
  approval-first workflow, "read the source not the screenshot," live-
  verification catching real bugs pre-merge, disposable-team testing
  discipline), what didn't (several bugs needing multiple root-cause
  passes, a mockup placeholder breakpoint shipping unvalidated and needing
  a user-reported follow-up fix, `run-desktop`'s recurring resize/hover
  driver gap), and scope creep observed (Framer Motion's role expanding
  from "just the coverflow" to "general-purpose animation library" mid-arc,
  a data-model bug fixed inline rather than deferred) - see
  [docs/postmortems/ui-ux-overhaul.md](docs/postmortems/ui-ux-overhaul.md).

- **UI/UX overhaul - sidebar/menuing rework** (design approved 2026-08-29,
  same artifact as the Teams-carousel/color-palette entries below -
  `SidebarExpanded.dc.html`/`SidebarCollapsed.dc.html` artboards). Replaced
  the old `App.tsx` sidebar (flat 128px-wide text-only nav list, plain
  "ChoiceBuds" wordmark, debug-y status footer). Implementation:
  - New `components/Sidebar.tsx` (extracted out of `App.tsx`, which now
    just renders `<Sidebar activeTab={...} onTabChange={goToTab} />`) plus
    a standalone `components/icons/SidebarIcons.tsx` icon set (grid for
    Teams, calculator for Calc, crossed swords for Battle Log, ascending
    bars for Statistics, shield for Type Matchup, gear for Settings, plus
    the collapse-rail toggle glyph) ported directly from the mockup's
    inline SVGs - kept as standalone exports (not colocated private
    components) per the mockup note that these are fair game to reuse
    elsewhere later for icon-language consistency, still not locked in as
    permanent metaphors.
  - Collapsible via a new `hooks/useSidebarCollapsed.ts` (localStorage-backed,
    same pattern `useSpeciesRoster.ts` already uses for a similar
    not-quite-app-data cache, since this is a pure UI-chrome preference
    rather than real app data through settings.json) - toggle row collapses
    the 208px (`w-52`) expanded rail to a 68px icon-only rail, with a
    hover flyout tooltip (Tailwind `group`/`group-hover`, first use of
    that pattern in this codebase) showing the label when collapsed. Rail
    width transitions over 320ms ease-out - matches the "sidebar width"
    bucket of the animation/motion pass's duration scale (see below), plain
    CSS at the time since Framer Motion itself wasn't wired into the app
    yet (later migrated to Framer Motion in the animation/motion pass's own
    leg 3, see below). Icon hover-scale (150ms, `scale(1.18)`) also
    implemented, matching the motion pass's micro-interaction bucket.
  - `build/icon.png` copied to `public/mascot.png` (Vite's static-asset
    dir, same convention as the existing `vg-team-list-template.pdf`) and
    rendered in the sidebar header next to the "ChoiceBuds" wordmark
    (mascot-only, no wordmark, in the collapsed rail).
  - Active nav-item indicator: tinted background + 3px left accent bar,
    using `accent-gold`/`accent-gold/15` rather than the mockup's literal
    blue - once the color palette pass shipped gold/purple (see below),
    translated the mockup's colors generally (not just the active accent)
    into this app's real zinc/gold tokens rather than copied verbatim,
    since the mockup predates the palette rework and used its own
    then-current gray-800/900/700 + blue. One deliberate departure from the
    mockup's literal hex: inactive nav-item hover uses `zinc-700`, not the
    mockup's `#27272a` - that hex is indistinguishable from this app's
    zinc-800 sidebar background itself and would render as no visible
    hover at all.
  - The old status footer (Cache Status / Teams Loaded / Ver X) moved out
    of the sidebar into a new `components/AppStatusSection.tsx` card at
    the bottom of the Settings page (same card pattern as
    `UpdateCheckSection.tsx` etc.) - sidebar is now pure navigation, per
    the original spec's explicit call.
  - New tests: `hooks/useSidebarCollapsed.test.ts` (5 cases - default
    state, reading a persisted value, toggling+persisting, and an
    unrecognized stored value falling back to expanded).
    `type-check`/`lint`/`test`/`build` all clean; live-verified via
    `run-desktop` - all 6 tabs switch correctly, collapse/expand
    round-trips cleanly (including a second full cycle), the Settings
    page's new App Status card renders with live values, and no
    console/page errors surfaced beyond the expected Electron dev-mode
    CSP warning.

- **UI/UX overhaul - animation/motion language** (design approved
  2026-08-29, same artifact, four new artboards built as **live, clickable
  demos** (real CSS transitions standing in for the actual Framer Motion
  timings/easings, since motion can't be judged from a static screenshot) -
  `ModalDemo.dc.html`, `CardExpandDemo.dc.html`, `SidebarDemo.dc.html`,
  `DragReorderDemo.dc.html`. Baseline confirmed by grepping the renderer
  beforehand: the app had almost no motion - a few Tailwind
  `transition-all`/`transition-colors` hover fades, two loading spinners,
  one `animate-pulse` badge; no modal enter/exit, no tab-switch transition
  (`App.tsx` just flipped `display:none`/`block`), no card expand/collapse
  animation, no drag-reorder repositioning animation. Approved spec:
  - **Framer Motion becomes the app's general-purpose animation library**
    (not scoped to just the Teams-carousel coverflow as originally
    planned) - one consistent motion engine/vocabulary for modal
    transitions, card expand/collapse, sidebar collapse, and drag-reorder,
    instead of ad hoc CSS per interaction.
  - **Duration/easing scale** (demoed live, not just described): micro
    ~150ms for hover/press micro-interactions; standard 200-280ms for
    modals, card-expand height, and content fades; deliberate 320-340ms
    for sidebar width and drag-reorder list repositioning (bigger layout
    shifts get more time). Entrances ease-out (decelerate in); exits
    ease-in and noticeably faster than the matching entrance (a modal's
    150ms close vs. its 200ms open, for instance) - dismissal should feel
    snappier than appearance.
  - **`prefers-reduced-motion` should collapse all of the above toward
    near-instant** - explicitly not built into any of the demos (those are
    for judging feel), but a firm rule carried into implementation.
  - **Card expand/collapse** uses a `grid-template-rows: 0fr -> 1fr` CSS
    trick in the demo for a genuinely transitionable height (plain
    `height: auto` isn't animatable); the real implementation ended up
    using Framer's own native `height: 'auto'` measurement instead (see
    leg 2 below), which needed no CSS trick.
  - **Drag-reorder** demoed with up/down buttons instead of real HTML5
    drag events (unreliable in the sandboxed iframe the preview ran in) -
    the actual thing demonstrated (both the moved row and whichever row it
    swaps with animating to their new slot via a shared position
    transition, not an instant re-sort) is exactly what Framer Motion's
    `layout` animation gives for free on a real drop.
  - **Small addition approved same session**: sidebar nav icons get a
    150ms hover-magnify (`scale(1.18)`), same micro-interaction duration
    bucket as everything else at that scale - added retroactively to all
    three sidebar artboards (`SidebarExpanded`/`SidebarCollapsed`/
    `SidebarDemo`), plus a subtle background-tint hover state for inactive
    nav items that hadn't had one before.
  - **Implementation sequenced into 4 legs** with the user (modal
    transitions / card expand-collapse / sidebar collapse migration /
    drag-reorder animation); modal transitions picked as leg 1, with a
    decision to extract a shared `Modal.tsx` first rather than animate
    each of the 5 modals in place (no shared wrapper existed before this -
    each modal duplicated its own overlay/panel markup).
    - **Leg 1: Modal transitions** - done 2026-08-29. `framer-motion` added
      as a dependency (first real user of it in the app). `config/motion.ts`
      is the new central home for the approved duration/easing scale
      (`MICRO_DURATION`/`STANDARD_ENTER_DURATION`/`STANDARD_EXIT_DURATION`/
      `DELIBERATE_DURATION` plus the modal-specific transition objects) -
      every future Framer Motion `transition` prop should pull from here
      rather than inlining ad hoc numbers, matching the project's usual
      config-table convention. New `components/Modal.tsx` owns the overlay
      fade + panel scale/opacity/y enter-exit (panel exit faster + ease-in
      than its enter, per spec) via `variants`, and is a pure animation
      shell (no overlay-click/Escape-to-close - none of the 5 modals
      supported that before, so none was added). Mount/unmount of `<Modal>`
      IS open/close (no `open` prop) - each caller's own
      `{isOpen && <SomeModal/>}` conditional still drives visibility
      exactly as before, just now wrapped in an `AnimatePresence` at the
      call site (`TeamsPage.tsx`, `PokemonCard.tsx`, `TeamCard.tsx` x3,
      `calc/CalcPage.tsx`) so the exit animation gets to play before the
      real unmount - deliberately not the alternative design (Modal always
      mounted, gated by an internal `open` prop), since that would have
      eagerly mounted every modal's content (e.g. `TeamExportImageModal`'s
      full 6-tile poster grid) on every team card whether or not it's ever
      opened. All 5 modals ported: `ImportTeamModal` (dropped its
      now-redundant `isOpen` prop entirely), `ExportTeamModal`,
      `TeamSheetPdfModal`, `TeamExportImageModal`, `CalcSavedSetsModal` -
      each just supplies its own `panelClassName` (max-width/max-height) to
      `<Modal>`, content unchanged. `App.tsx`'s root is now wrapped in
      Framer Motion's own `<MotionConfig reducedMotion="user">` - handles
      the spec's prefers-reduced-motion requirement globally for every
      current and future Framer Motion animation in the app, rather than
      each component checking for it itself. `type-check`/`lint`/`test`/
      `build` all clean; live-verified via `run-desktop` - all 5 modals
      open/close cleanly with no console/page errors, and the sidebar
      collapse (already shipped) still works correctly alongside the new
      `MotionConfig` wrapper.
    - **Leg 2: Card expand/collapse** - done 2026-08-29. `TeamCard.tsx`'s
      expanded-roster section (previously a plain `{isExpanded && <div>...}`
      conditional, snapping open/closed with no animation) now animates via
      Framer Motion instead of the design demo's plain-CSS
      `grid-template-rows: 0fr -> 1fr` trick - Framer measures `height:
      'auto'` natively, so no CSS-side trick is needed in real React. New
      `CARD_EXPAND_ENTER_TRANSITION`/`CARD_EXPAND_EXIT_TRANSITION` added to
      `config/motion.ts` (both the standard 200-280ms bucket, enter
      ease-out, exit faster ease-in, matching the modal transition
      constants' shape). `TeamCard.tsx`'s `cardExpandVariants` animates
      height 0->auto + opacity 0->1, with `overflow: 'hidden'` held only
      while a transition is actually in flight and a `transitionEnd`
      flipping both `overflow` back to `'visible'` *and* `height` back to
      literal `'auto'` once settled - the height half of that
      `transitionEnd` turned out load-bearing, not just belt-and-suspenders:
      an early version that only reset `overflow` left the wrapper's inline
      height frozen at whatever pixel value Framer measured during the
      transition, so opening the trailing "+ Add Pokémon" species picker
      afterward grew the content but not the frozen-height wrapper - the
      picker visually overflowed past the card's own bottom edge and got
      painted over by the next team card in the list (confirmed live via
      `run-desktop`, screenshotted before and after the fix). Also hit a
      misleading-if-not-understood artifact while diagnosing it: reading
      the wrapper's inline style via `eval` immediately after firing a click
      (no real delay) caught Framer's animation mid-flight (`opacity: 0`,
      a tiny interpolated height) even though the click handler had already
      returned - Framer's `requestAnimationFrame`-driven tweening doesn't
      finish synchronously with the event handler, so a real
      `setTimeout`-based wait was needed before asserting on post-transition
      state, both here and in any future live-verification of a Framer
      animation's settled DOM. `type-check`/`lint`/`build`/`test` all clean;
      live-verified via `run-desktop` - expand/collapse animates smoothly,
      `overflow`/`height` correctly resolve to `visible`/`auto` after
      settling, and the full edit -> open picker -> add a Pokémon -> exit
      edit -> collapse round-trip works with no clipping and no
      console/page errors (exercised against a disposable team created and
      deleted for the test - the two real teams were untouched).
    - **Leg 3: Sidebar collapse migration to Framer Motion** - done
      2026-08-29. `Sidebar.tsx`'s rail (`<aside>`) is now `motion.aside`,
      animating `width` between 68px (collapsed) and 208px (expanded) via a
      new `SIDEBAR_WIDTH_TRANSITION` in `config/motion.ts` (deliberate
      320ms bucket, same duration/easing the plain-CSS
      `transition-[width]` it replaced already used) - symmetric ease-out
      in both directions rather than the modal/card-expand enter/exit
      split, since this is a toggle between two steady states, not a
      mount/unmount, and the approved `SidebarDemo.dc.html` only ever
      specified one timing for the rail width itself. Deliberately left
      as plain CSS/Tailwind (unchanged from the original sidebar/menuing
      rework): icon hover-scale and nav-item hover backgrounds - the
      motion pass's own note already called out the micro-interaction
      bucket as not worth porting to Framer Motion, and nothing here
      needed AnimatePresence (no mount/unmount involved, just a numeric
      style toggle on an already-mounted element).
      `type-check`/`lint`/`test`/`build` all clean; live-verified via
      `run-desktop` - collapse and expand both animate smoothly through
      Framer Motion, the active-tab gold accent and collapsed-state hover
      tooltips still render correctly, tab switching (Teams/Calc/Settings)
      still works, and no console/page errors surfaced beyond the
      expected Electron dev-mode CSP warning.
    - **Leg 4: Drag-reorder animation** - done 2026-08-29. Scoped down with
      the user before starting: covers the teams list
      (TeamsPage.tsx/TeamCard.tsx) and the Pokemon-within-a-team roster
      (PokemonCard.tsx) - both true "N items in a list, order changes"
      cases, exactly what the approved `DragReorderDemo.dc.html` modeled.
      MoveBubbleGrid.tsx's move-slot reorder was explicitly left out - it's
      a fixed 4-slot content swap (position IS the slot identity), a
      different interaction shape from a traveling list item, deferred to
      its own future decision rather than bundled in here.

      Used Framer's `layout="position"` (not plain `layout`) on
      TeamCard.tsx's and PokemonCard.tsx's root elements, with a new
      `DRAG_REORDER_TRANSITION` in `config/motion.ts` (deliberate 320ms
      bucket, symmetric ease-out - same shape/rationale as
      `SIDEBAR_WIDTH_TRANSITION`, a position swap between two settled
      states rather than a mount/unmount). `layout="position"` specifically
      (not the full `layout` prop) so this only animates the FLIP position
      delta from a reorder, leaving each card's own size-driven animations
      (TeamCard's expand/collapse height from leg 2, either card reacting
      to its own content changes) alone instead of fighting them for the
      same box.

      Uncovered a real correctness bug on the way in: the roster grid was
      keying each `PokemonCard` by `` `${idx}-${p.importedAt}` `` - since
      `idx` was part of the key, swapping two Pokemon's array positions
      changed both their keys, so React unmounted/remounted both cards on
      every reorder instead of moving them - no `layout` prop can animate
      a remount into a slide. Fixed at the data-model level rather than
      papering over it: added a real `id: string` field to
      `ImportedPokemonInfo` (`types/pokemon.ts`), generated once via
      `crypto.randomUUID()` at the single choke point every roster slot is
      built through (`services/pokeapi.ts::enrichPokemonWithAPI` - covers
      import, add, and swap alike), and keyed the roster map by `p.id`
      instead. Teams persisted before this field existed are backfilled at
      the read boundary (`useTeams.ts::loadTeamsFromDisk`'s new
      `normalizeTeam`), same pattern as `useBattles.ts`'s `normalizeBattle`
      - never written back proactively, a team just picks up real ids next
      time it's saved through any normal mutation. `useActiveEditor.ts`'s
      explicit (non-spread) draft-clone field list picked up the new field
      too. Six test fixture files needed a `crypto.randomUUID()` id added
      to their `ImportedPokemonInfo` literals now that the field is
      required (`calcTeamImport.test.ts`, `useActiveEditor.test.ts`,
      `teamValidation.test.ts`, `useSavedPokemon.test.ts`,
      `useRosterActions.test.ts`, `useTeamMoveTypes.test.ts`) - every real
      (non-test) construction path already went through
      `enrichPokemonWithAPI`, so no other call site needed a manual id.

      `type-check`/`lint`/`test` (399 passed)/`build` all clean.
      Live-verified via `run-desktop` against disposable teams (created
      and fully deleted afterward, both confirmed via a direct
      `teams.json` read before and after - the user's own 2 real teams
      were never touched): the roster reorder screenshot sequence caught
      Framer's FLIP animation genuinely mid-flight (the dragged card
      visibly overlapping the card it was sliding past, not an instant
      snap), settled into the correct new order with no clipping: a
      before/after DOM-node-identity check (tagging each card with a
      custom `dataset` attribute pre-drag) confirmed all 3 cards stayed
      attached to the DOM through the reorder (no remount) with each
      marker's species mapping unchanged - proof the same node traveled
      with its Pokemon rather than the grid slot keeping a fixed node and
      swapping content into it. The teams-list reorder got the same
      attached/position-delta check (first attempt happened to drag onto
      an already-adjacent slot, a same-position no-op that looked like a
      failure until repeated with a real position change - both cards
      confirmed to swap places and stay attached, not remount). No
      console/page errors in either pass.

- **Window sizing rework - decisions approved 2026-08-29, implemented same
  day** - leg 1 of the UI/UX overhaul's three remaining pieces (see
  TODO.md's "UI/UX overhaul" entry), picked over sidebar/menuing or
  animation/motion as the smaller, purely-behavioral piece (no mockup
  needed - nothing here was a visual design question). Baseline before this
  leg (`main.ts`): the window was created at exactly `1280x720` with
  `minWidth`/`minHeight` both also `1280x720` - it always launched at its
  own floor, at whatever position Electron/the OS defaulted to, and could
  never be resized smaller (no cap on growing larger). All three approved
  decisions:
  - **Keep the 1280x720 floor as-is, for now** - explicit user call, no
    code change needed (already true). Real tension surfaced before
    deciding: the sidebar rail + more compact Teams cards free up
    horizontal room that could justify a smaller floor, but Calc and
    Battle Log already scroll a bit at today's exact 1280x720 floor (see
    the 2026-07-07 review-pass entries in TODO.md - both stopped short
    deliberately, not fully solved) - they're still the binding constraint
    regardless of the other pieces' wins, so lowering the floor now would
    just make their existing scroll worse. Revisit if/when Calc/Battle Log
    get their own tightening pass.
  - **Persist window size/position across launches** - implemented in
    `main.ts` via a dedicated `window-state.json` in the userData
    directory, main-process-owned end to end (never round-tripped through
    the renderer/`useSettings`, despite the original TODO wording
    suggesting `AppSettings`/`settings.json`) - a deliberate deviation, not
    an oversight: `useSettings` persists by writing its whole in-memory
    `AppSettings` object back to disk on every change, so a field only the
    main process ever updates (window resize/move happens entirely outside
    the renderer) would risk getting clobbered back to a stale value by the
    next unrelated settings write from the renderer (e.g. toggling default
    regulation mid-session after a resize). A dedicated file sidesteps that
    race entirely and matches the existing main/renderer file-ownership
    split elsewhere in the app. Bounds are saved debounced (500ms) on
    `resize`/`move` (so a drag doesn't hammer disk every frame), plus a
    synchronous (`fs.writeFileSync`, not the queued atomic-rename path) save
    on `close` so a resize immediately followed by quitting isn't lost to
    the debounce. Restored bounds are clamped to the 1280x720 floor, and a
    remembered `x`/`y` is only honored if it still intersects a currently-
    connected display (via `screen.getAllDisplays()`'s `workArea`) -
    otherwise Electron's own default centering kicks in, so an unplugged
    second monitor since last launch can't strand the window off-screen.
    Live-verified with a standalone Playwright-Electron script (not the
    `run-desktop` skill itself, which only exposes renderer-side `eval` -
    this needed main-process `BrowserWindow.setBounds`/`getBounds` control
    the skill's driver doesn't expose): resize+move -> close -> relaunch
    correctly restored the exact saved bounds, and a hand-written
    sub-floor (400x300) state file was correctly clamped back to 1280x720
    on load.
  - **Teams-page grid caps at 2 columns, no matter how wide the window
    gets** - already implemented as part of the earlier Teams-carousel leg
    (`TeamsPage.tsx`'s `@[1360px]:grid-cols-2`, no 3rd-column tier exists)
    - confirmed still correct while scoping this leg, no separate work
    needed here.

- **Adopt testing + verification workflow from GW2 Squaded: Vitest coverage**
  (decided 2026-08-29): this repo had no wired-up test runner before this -
  matched the same combination (Vitest unit tests + eventually a
  standalone data-completeness audit script, see TODO.md) the user runs on
  GW2 Squaded.
  1. **Leg 1** - Vitest wired up (`vitest.config.ts` + `npm run
     test`/`test:watch`), config matched to the GW2 Squaded project's own
     setup (Node environment, `@` alias carried over from `vite.config.ts`
     even though nothing needs it yet). `services/parser.ts` is the first
     module covered - its old placeholder console.log-assertions script
     (`parser.test.ts`) is now 18 real `describe`/`it` Vitest cases, all
     passing; `type-check`/`build` still clean.
  2. **Leg 2** - the rest of `utils/`'s pure functions now covered:
     `tagSearch`, `displayName`, `spriteUrl`, `measureDropdownHeight`,
     `statAlignment`, `pokemonRules`, `teamValidation`, `typeCoverage`,
     `battleSets`, `calcFormes`, `championsStats`, `calcExport`,
     `calcTeamImport`, `cacheManager` (including `runCachedFetch`'s
     async/error-branch orchestration via `vi.fn()`-mocked setState
     functions - no real React needed), and `battleStats` (the Statistics
     page's aggregations) - 15 new test files, 159 new cases, all passing;
     `type-check`/`lint`/`build` all still clean. Deliberately skipped:
     `appVersion.ts`/`cacheExpiry.ts` (single constants, nothing to assert)
     and the `*DragTypes.ts` files (just react-dnd MIME-type
     constants/interfaces, same reasoning); services/ (besides `parser.ts`)
     are all live-`fetch` wrappers (`pokeapi.ts`, `pokeapiService.ts`,
     `syncApi.ts`, `github.ts`, `pokepaste.ts`, `championsBattleData.ts`)
     or PDF generation (`teamSheetPdf.ts`), not pure functions, so out of
     scope for unit tests without a mocking layer not yet built. Also
     deliberately skipped: `battleLookup.ts` and `battleCalcReview.ts` -
     both are Battle-Logger-turn-log-internals (see TODO.md's "Battle
     Logger: retire live turn-by-turn logging" entry, which drops this
     exact code from active use) - not worth investing test-writing effort
     into what's slated to be archived soon.
  3. **Leg 3** - hooks coverage started. New test infra first:
     `vitest.config.ts` switched from `environment: 'node'` to `'jsdom'`
     (hooks render real effects/refs against a DOM; the existing
     pure-function tests run fine under jsdom too, so one shared
     environment was simpler than splitting by glob) plus
     `@testing-library/react` (`renderHook`/`act`) and `jsdom` added as
     devDependencies. A new `src/renderer/test/setupElectronMock.ts`,
     wired in via `setupFiles`, stubs `window.electron` with `vi.fn()`
     mocks (reset fresh before every test) since jsdom has no real
     Electron main process to back the preload bridge. Sequencing decided
     with the user before writing any tests: skip the 3
     Battle-Logger-only hooks (`useBattleLogActions.ts` - 1001 lines,
     `useBattles.ts`, `useMoveNameList.ts`) for the same
     already-slated-for-retirement reason leg 2 skipped
     `battleLookup.ts`/`battleCalcReview.ts`; and size this leg to the ~8
     simplest/self-contained remaining hooks, saving the big
     stateful/IPC-heavy ones for a future leg. Covered this leg: 8 new
     test files, 54 new cases, all passing - `useDismissable`,
     `useHoldRepeat` (fake timers), `usePokemonTypeFilter`/`useMegaSprite`
     (mocked `pokeapiService.fetchJSON`, module-level-cache-aware via
     never-reused-per-test cache keys), `useSeasonDataCheck` (fake
     `Date.now()` via `vi.setSystemTime`), `useTeamMoveTypes` (mocked
     `UseGameDataReturn.getMoveData`, verifies status-move exclusion +
     `typeChangingAbilities.ts` integration), `useSpriteCache` and
     `useUpdateCheck` (both exercise the `window.electron` mock directly,
     the latter also mocks `services/github.ts`). `type-check`/`lint`/
     `build` all still clean. Remaining at the time: 11 hooks (`useTeams`,
     `useSettings`, `useDatabase`, `useGameData`, `useSync`,
     `useInitialSync`, `useSavedPokemon`, `useSpeciesRoster`,
     `useRosterActions`, `useActiveEditor`, `useDamageCalc`) - sized down
     into sub-legs below.
  4. **Leg 4a** - leg 4 (2822 lines across the 11 hooks above) sized down
     into sub-legs by kind (decided with the user before writing any
     tests): 4a covers the simpler CRUD/load-on-mount hooks (`useSettings`,
     `useSpeciesRoster`, `useRosterActions`, `useSavedPokemon`, `useTeams`);
     4b (persisted-cache/IPC: `useDatabase`, `useGameData`), 4c
     (sync-orchestration: `useSync`, `useInitialSync`), and 4d
     (draft/editor-state: `useActiveEditor`, `useDamageCalc` - the biggest
     and most complex) followed below. 5 new test files, 40 new cases, all
     passing - `useSettings` (default-merge-over-persisted-partial,
     write-failure-leaves-state-untouched), `useSpeciesRoster` (mocked
     `pokeapiService.fetchJSON`, real `localStorage` exercised directly -
     Mega-form filtering, display-name casing, cache-hit-skips-refetch,
     corrupted-cache-JSON treated as a miss), `useRosterActions` (mocked
     `updateTeam`/cache getter-setter/`getEnrichedSpeciesOptions`/
     `getChampionsUsage` injected params - `getCachedEntry` always returns
     a hit so `enrichPokemonWithAPI`'s real code runs with no network
     needed; covers usage-based move/ability sort overriding learnset
     order, the 6-Pokemon-cap refusal, remove/reorder index math),
     `useSavedPokemon` and `useTeams` (both mirror the already-covered
     load/persist/CRUD shape, covering the batch-label-dedupe logic and
     reorder-insert-before-target semantics unique to each).
     `type-check`/`lint`/`build` all still clean.
  5. **Leg 4b** - persisted-cache/IPC hooks: `useDatabase` (12 cases) and
     `useGameData` (25 cases), 37 new cases, all passing. `useDatabase`:
     SWR init (instant-serve-then-background-clean), empty-cache bootstrap
     + persist when nothing's on disk, read-failure still initializes,
     background revalidation actually deletes expired entries once
     `lastCleaned` is 7+ days stale, species-key normalization,
     expired-entry-is-a-miss, write-failure leaves state untouched,
     `cleanExpiredEntries`/`clearCache`/`refreshCache`, and
     `createCacheEntry`'s never-expires sentinel. `useGameData` (the
     bigger one - `vi.mock`s `services/pokeapiService`/
     `services/championsBattleData`'s fetch functions only, via
     `importOriginal` to keep their real pure helpers like
     `normalizeNameForAPI`): legacy-cache migration
     (`lastSyncedSpeciesNames` backfilled to `[]`), read-failure fallback,
     write-through-on-change, and per-section self-healing-cache-miss
     behavior for moves (`target`/`meta` presence), items (empty
     `spriteUrl` placeholder), and learnsets (`hasChampionsMoveData`
     undefined) - each proven to actually trigger a re-fetch, not just
     documented in a comment. Also covers the PP-retier + Champions
     move/ability override application, `applyChampionsMovepoolChanges`
     only firing when `hasChampionsMoveData` is false (confirmed via Tera
     Blast survival/removal), `getEnrichedSpeciesOptions`' usage-percentage
     sort overriding learnset order (mirrors `useRosterActions.test.ts`'s
     equivalent case), the VGC-items background-fill effect synthesizing
     empty-`spriteUrl` placeholders for every configured item PokeAPI has
     no data for (real `VGC_ITEMS` imported, not hand-picked) and
     confirming those placeholders are excluded from the computed `items`
     list, `getChampionsUsage`'s null-is-not-an-error contract, and
     `getUnsyncedSpecies`/`markSpeciesSynced`. One real testing gotcha hit
     and fixed: calling `result.current.someAsyncFn()` and then
     immediately reading a `getCached*` getter in the same tick raced
     ahead of React's state flush and saw stale cache (a second
     `getMoveData` call still re-fetched instead of hitting the freshly-
     written cache) - fixed by asserting the post-write cache read through
     `waitFor(...)` instead of reading `result.current` synchronously
     right after the awaited call, rather than wrapping every such call in
     `act()` (which also hit an unrelated TS control-flow quirk narrowing
     the awaited result to `never` when reassigned from inside an
     `act(async () => ...)` closure). `type-check`/`lint`/`build` all
     still clean.
  6. **Leg 4c** - sync-orchestration hooks: `useSync` (26 cases) and
     `useInitialSync` (9 cases), 35 new cases, all passing. `useSync`
     takes its 3 collaborator hooks' full return objects
     (`UseSettingsReturn`/`UseTeamsReturn`/`UseBattlesReturn`) as params,
     so `setup()` builds hand-rolled fakes for all three rather than
     mocking a service boundary; `services/syncApi.ts`'s
     `pushSyncData`/`pullSyncData` are the only real `vi.mock`. Covers all
     4 status branches (never-synced short-circuiting before any network
     call when push/pull timestamps are both still null, up-to-date,
     unpulled-changes, unpushed-changes) plus a throw-during-refresh case
     proving a failed status check degrades to 'unknown' silently rather
     than crashing or surfacing as `error`; `createIdentifier`'s username
     sanitization, discriminator-collision retry (asserts the retried
     candidate actually differs from the first, not a specific value), and
     exhausting all `MAX_DISCRIMINATOR_ATTEMPTS`, and availability-check-
     throws paths; `pairExistingIdentifier`/`forgetIdentifier`; and
     `push`/`pull`'s needs-pull-first/needs-push-first refusals, `force`
     actually bypassing the freshness check (proven by configuring the
     remote as if always newer and asserting a forced push still succeeds,
     rather than a brittle call-count assertion, since a successful push's
     own post-hoc status refresh legitimately calls `pullSyncData` too),
     and error-path handling. One real gotcha: an early "force skips" case
     asserted `pullSyncData` was never called at all under `force: true`,
     which flaked - `push()`'s own trailing
     `refreshStatus({ lastPushedAt })` call still invokes it as part of
     computing post-push status, so absence-of-call was the wrong signal;
     asserting the outcome instead (succeeds despite a remote that would
     otherwise block) is what's actually being guaranteed. Also had to add
     an explicit `await waitFor(() => status !== 'unknown')` before
     exercising `forgetIdentifier` in isolation - without it, the
     mount-time status refresh (already in flight) could resolve after
     `forgetIdentifier`'s own `setStatus('never-synced')`, and clobber it
     back to whatever the mount computed. `useInitialSync` mocks only
     `validateSpeciesLegality` (`utils/pokemonRules`) and
     `fetchPokemonData` (`services/pokeapi`, kept `normalizeSpeciesForAPI`
     real via `importOriginal`) - the 4 collaborator hooks it takes as
     params are the same hand-rolled-fake pattern as `useSync`. Covers the
     not-ready gate (each of roster-loading/empty-roster/gameData-
     uninitialized/database-uninitialized), the zero-network
     already-synced fast path, REG-MB legality filtering before diffing
     against `getUnsyncedSpecies`, a full sync pass asserting every stage
     (sprite downloads for both normal+shiny per species, learnset+species-
     stats fetch per species, real `VGC_ITEMS` iterated for item sprites,
     final `markSpeciesSynced` call and terminal progress state), the
     already-cached-species skip in `syncSpeciesStats`, an item with no
     `spriteUrl` never reaching `downloadSprite`, and one species failing
     mid-sync not aborting the rest (per-item `runWithConcurrency` catch).
     `type-check`/`lint`/`build` all still clean.
  7. **Leg 4d** - draft/editor-state hooks, closing out leg 4 (and the
     hooks pass as a whole): `useActiveEditor` (22 cases) and
     `useDamageCalc` (30 cases), 52 new cases, all passing.
     `useActiveEditor`: deep-clone isolation on `enterEditMode` (mutating
     the original after cloning doesn't leak into the draft, verified on
     the nested `evs`/`moves` arrays specifically, not just a shallow
     `toEqual`), tolerating a missing `calculatedStats`, every `update*`
     setter (including the empty-string-clears-to-`undefined` convention
     shared by nickname/gender/item/ability/teraType/nature, the level
     1-100 and happiness 0-255 clamps, the 4-move truncation on
     `updateMoves`, and `updateMove`'s out-of-range-index no-op), `update*`
     calls before `enterEditMode` being a no-op (no draft to mutate),
     `getCommittableData`/`hasUnsavedChanges`/`discardChanges`, and
     re-entering edit mode for a different Pokemon replacing the draft and
     resetting `isDirty`. `useDamageCalc` (the big one - real
     `@smogon/calc` Gen 9 data used throughout, not mocked, matching the
     file's own doc comment on why: `calculate()` matches names against
     its own internal data layer, so a fake would risk testing nothing
     real): regulation-filtered `speciesOptions` via the real
     `validateSpeciesLegality` allowlists (Gengar REG-MA-legal, Swampert
     REG-MB-only, Mewtwo legal in neither), sorted item/ability/nature
     option lists, `setPokemon1/2`/`setPokemon1Move/2`/`setField`/
     `setPokemon1Side/2` all merging partial updates without disturbing
     sibling state, `pokemon*BaseStats`/`NatureEffect` wiring, and
     `computeBoostedStats`'s full stack proven against real computed
     numbers (not just "it changed"): a known base+SPs+nature raw stat
     (Gengar's level-50 zero-SP Speed is 130), a stage-boost multiplier
     floored both up and down, a weather-matching ability doubling Speed
     only when the field weather actually matches, paralysis halving, and
     weather-boost-before-paralysis-halving as a single combined case
     (floor(floor(130*2)/2) lands back on 130, which wouldn't happen if the
     order were reversed) - matching the function's own doc comment on
     real-game modifier ordering. `p1Results`/`p2Results`: empty entries
     with no species set, a real Gengar-vs-Garchomp Shadow Ball
     calculation asserted against hand-verified numbers (range, percent
     string, kochance text, deduped/sorted possibleDamages - all pulled
     from a one-off Node probe script run directly against the installed
     `@smogon/calc` package rather than hand-computed, so the fixture
     itself is real-engine-verified), a crit slot producing a higher
     range, a multihit move's `multihitRange`/engine-default
     `effectiveHits` and an explicit `hits` override, and an unresolvable
     species string producing an error entry for every move slot on that
     side (proven via `buildPokemon` actually throwing on a garbage
     species, not asserted from reading the code). `selectedResult`/
     `selectedEntry` including the out-of-range-index case. The
     learned-moveset-filtering effect (`pokemon1MoveOptions`/
     `pokemon2MoveOptions`): same-reference passthrough when unfiltered
     (`toBe`, not `toEqual` - the hook returns `moveOptions` itself rather
     than a copy when there's no learned-set to filter by), the real
     filter applying once the fetch resolves, falling back to the full
     list on a no-real-move-name-intersects miss and on a rejected fetch,
     the render-time-effect clear-on-empty-species behavior, and (the one
     real gotcha worth calling out) a stale in-flight fetch losing a race
     against a newer species change - built with hand-rolled deferred
     promises so the stale fetch could be resolved *after* the newer one
     had already been kicked off, proving the `cancelled` flag in the
     effect's cleanup actually suppresses the stale write rather than just
     asserting the final state is correct by coincidence. `type-check`/
     `lint`/`build` all still clean. This closed out leg 4 (2822 lines
     across all 11 hooks) and the hooks-coverage pass entered in leg 3 -
     every hook in `src/renderer/hooks/` is now covered except the 3
     Battle-Logger-only ones deliberately skipped in leg 3 for the same
     already-slated-for-retirement reason. Still open: a standalone
     data-completeness audit script for the hand-curated config tables -
     see TODO.md.

- **PokeAPI now has a real `champions` version group - dedicated pass to
  map out how much hand-maintained config it could replace** (investigated
  2026-07-19, resolved as "keep both layers, PokeAPI data can't fully
  replace either"). Full findings (queried live, not guessed):
  - **Species legality**: the `champions` pokedex (`/api/v2/pokedex/36`,
    208 entries) is a **perfect 1:1 match** with the combined REG-MA +
    REG-MB base-species set in `utils/pokemonRules.ts` - zero species
    missing either direction. Strong live validation that the
    Serebii-sourced allowlist is accurate. But the pokedex only models
    base species, not regulation history (M-A vs M-B split) or per-variety
    legality (regional forms, gender-locked movesets, Palafin Zero-only,
    Aegislash Blade/Shield) - so it can confirm the hand list, not replace
    it; the app needs granularity PokeAPI's pokedex doesn't carry.
  - **Move-learnability (`champions`-tagged moves)**: real per-species
    data, but coverage is incomplete in a very specific, explicable way -
    checked all 231 legal species/varieties live, 208 (90%) have at least
    one `champions`-tagged move, and the 23 with zero are **exactly the 22
    Regulation M-B-added species plus Floette**. PokeAPI's tagging clearly
    lags the newest regulation's additions specifically - confirms
    `championsMovepoolChanges.ts`'s hand table still earns its keep, most
    of all for M-B's new species, on top of the narrow-fix fallback
    already live in `pokeapiService.ts`.
  - **Sharpedo/Thief conflict, resolved same day**: spot-checked Sharpedo
    (which PokeAPI does tag) - its `champions` move list still includes
    `thief`, but `championsMovepoolChanges.ts`'s
    `CHAMPIONS_MOVEPOOL_REMOVALS.sharpedo` (RoiDadadou-spreadsheet-sourced)
    said Champions removed Thief from Sharpedo. User confirmed in-game:
    Sharpedo does have Thief - PokeAPI was right, the spreadsheet was
    wrong. User's call: trust PokeAPI over the spreadsheet wherever
    PokeAPI has live `champions`-tag coverage; the spreadsheet was only
    ever load-bearing for the gap PokeAPI hasn't back-filled (Reg M-B's
    new species). Acted on immediately (same day) rather than left open:
    `useGameData.ts` now only applies `championsMovepoolChanges.ts`'s
    corrections when `SpeciesLearnsetEntry.hasChampionsMoveData` is false
    (a new field set by `fetchSpeciesLearnset`), and the file itself was
    pruned from ~208 species down to exactly the 22 Reg M-B species +
    Floette found above - unreachable entries for PokeAPI-covered species
    were deleted outright rather than left as dead weight/a future
    footgun. Also separately found Sharpedo's PokeAPI move data has zero
    `scarlet-violet`-tagged moves (an unrelated PokeAPI data gap, doesn't
    affect the above). Live-verified post-fix: Sharpedo/Mimikyu now trust
    PokeAPI directly (Thief present, hand table not consulted);
    Gholdengo/Pyroar still correctly get the hand table's corrections
    (Gholdengo gains Surf/loses Thunder Wave, Pyroar gains Iron
    Tail/Payback/Scorching Sands and loses Work Up) since PokeAPI still
    has no `champions` tag data for either. Old 30-day-cached learnset
    entries predating the new field are treated as a cache miss (same
    pattern as `getCachedMove`'s `target`/`meta` self-heal) so this takes
    effect on next fetch rather than waiting out the cache TTL. Revisit
    `championsMovepoolChanges.ts` (or delete it outright) once PokeAPI
    back-fills `champions` tags for these 23 species too - the live
    coverage check from this pass is easy to re-run to find out.
  - **Real bug found as a side effect, fixed same day**: auditing
    `normalizeSpeciesForAPI` (`services/pokeapi.ts`) for this pass
    surfaced that Gourgeist, Lycanroc, Maushold, **Mimikyu**, Morpeko, and
    Pyroar all have no bare PokeAPI `/pokemon/` slug (only their
    default-variety forme, e.g. `mimikyu-disguised`) - same class of gap
    as the already-handled Aegislash/Palafin cases, just never caught for
    these six. Confirmed live 404s before the fix. Since Showdown/
    pokepast.es exports these by bare name for their default forme, this
    was a real, silent import-enrichment failure - notably for Mimikyu, an
    extremely common VGC pick. Also fixed the 3 Paldean Tauros breeds'
    non-"-breed" spelling (`tauros-paldea-combat` etc., the form
    `@smogon/calc` uses) the same way. All 9 added to
    `normalizeSpeciesForAPI`'s `formMappings`.

- **RoiDadadou spreadsheet - reliability is mixed, tab by tab**: got direct
  sheet access via its CSV export endpoint (19 tabs total). Two tabs
  processed and trusted (`Pokémon Ch.`); one tab actively distrusted and
  dropped (`Moves Deleted` - conflated roster gaps with real move
  deletions, flagged real moves like Rage Fist/Make It Rain as "not in
  Champions"); one tab fetched but superseded by a better one (`Learnset`
  - a raw per-species dump, not a diff; `Pokémon Ch.` has the same info
  pre-diffed against SV/historical movepools, so `Learnset` isn't needed).
  The user's own read on the source overall: "the more we look at this
  spreadsheet the less reliable I am finding it" - so still worth
  spot-checking any single entry against Serebii/Bulbapedia/in-game play
  if something looks off, rather than trusting it blindly just because one
  tab (`Pokémon Ch.`) held up well. Untouched tabs if ever needed: `Items`,
  `Ability Ch.`, `Mégas`, `New Moves`, `New Abilities`, `Tierlist`, `Dex
  Entries`, `Update Status`.

- **Teams page carousel/grid rework - design approved 2026-08-29**, mockup
  at `https://claude.ai/code/artifact/66752fbf-5e68-456a-bfff-564ba4a5d67f`
  (private Claude artifact, 6 artboards). Approved spec:
  - Each collapsed team's old mini sprite-strip is replaced by a compact
    3D coverflow (~240x84px, real CSS `rotateY`/scale/opacity keyframes,
    not a static image) cycling through all 6 roster Pokémon.
    Auto-rotates while idle, pauses crisp on hover (small pause badge).
  - Header's action-icon row is reworked into a pill-shaped control
    cluster: only Edit (pencil) and Expand (chevron) stay always-visible;
    Validate/Export (text)/Export Image/Export PDF/Delete move into a new
    `⋮` overflow menu (Delete visually distinguished in red).
  - Team name/author move out of the far-right button cluster (where
    they oddly live today) to sit directly under the regulation badge in
    the header's left column.
  - Expand/collapse stays **independent per card** (no accordion) -
    explicit user call to keep the diff smaller; revisit later if
    several teams expanded at once takes up too much space.
  - Drag-to-reorder the teams list changes from "always active on the
    collapsed header regardless of state" (today's behavior) to **gated
    behind both expanded AND edit-mode** - only draggable once the edit
    pencil is toggled on an expanded card.
  - Expanded+edit-mode roster cards keep the full existing feature set
    (don't drop these for the new layout): SP-spread grid + nature pill
    (matching `StatsColumn.tsx`'s exact per-stat colors), gender toggle,
    shiny toggle - plus a new drag-handle affordance icon per card.
  - Teams list becomes a responsive grid instead of always one column:
    2 columns on wide windows, 1 on narrow, via a **container query**
    on the teams-list wrapper (not a viewport media query - same
    reasoning as the existing `@container`/`@[1760px]` roster-grid
    breakpoint in `TeamCard.tsx`: viewport width alone doesn't account
    for the sidebar eating into actual content width). Exact breakpoint
    not yet chosen - mockup used "~1160px+ content width -> 2 columns"
    as a placeholder, needs tuning once real. When a team expands inside
    the 2-column grid, it spans the full row width (explicit user
    call - grid-column 1/-1), pushing subsequent cards down rather than
    squeezing the roster grid into a half-width column.
  - Likely supersedes/relates to the "Team cards render as 2x3 grid
    instead of 1x6" regression noted in the 2026-08-28 manual-testing
    batch above - that whole static-grid layout is being replaced by
    this rework, so worth checking whether that bug report is even still
    relevant once this lands.
  - **Implementation started 2026-08-29** - sequenced into 4 legs with the
    user (coverflow component, header/controls rework, expanded-grid
    stats restoration, responsive grid + drag-reorder gating change),
    confirmed via `AskUserQuestion` before writing any code; coverflow
    picked as leg 1.
    - **Leg 1 done (2026-08-29)** - the 3D coverflow itself, replacing
      `TeamCard.tsx`'s old flat mini-sprite-strip. New
      `TeamCoverflow.tsx` (presentational, takes `pokemon`/
      `resolveSprite`) + `index.css`'s `.coverflow*` rules reproduce the
      approved mockup's exact `cfOrbit` keyframe values (translate/
      rotateY/scale/opacity/z-index at the 0/16.667/33.333/50/66.667/
      83.333/100% stops, pulled by parsing the design artifact's own
      `Main.dc.html`/`Hover.dc.html` source rather than eyeballing the
      screenshots) - plain CSS `animation`, not Framer Motion: the loop
      is purely time-driven with no interactive state, so CSS handles it
      natively and correctly for the continuous 12s cycle (a discrete
      Framer Motion `animate`-per-slot approach was considered and
      rejected - modeling the cyclic sweep as 6 discrete slot-swaps loses
      the necessary 7th "fade out past the far edge" waypoint between the
      83.333% and 100% keyframes, causing a card to visibly snap/streak
      across the whole container at the wrap point instead of fading out
      invisibly). Stagger scales with roster size (`12s / pokemon.length`
      per-card delay step) rather than assuming a full 6-mon roster, since
      a mid-build team can have fewer. Pause-on-hover is
      `animation-play-state: paused` (immediate/"crisp" by construction,
      no snap-to-nearest-beat logic). The pause badge and center
      highlight ring don't track which Pokemon index is currently
      centered (no JS state) - both are single fixed-position overlays at
      the container's own center coordinate, which works because every
      card's orbit passes through that exact same `translateX(0) scale(1)`
      point, so the overlay always lands on whichever card is currently
      front-most regardless of which one that is. `type-check`/`lint`/
      `build` all clean. Live-verified via `run-desktop`: confirmed the
      animation's computed transform actually changes over a 1.5s window
      (not frozen), and - since CSS `:hover` doesn't activate from a
      synthetic dispatched event, only real pointer input - wrote a
      one-off Playwright script using `page.hover()` directly (not the
      driver's own `eval`-based click/hover) to confirm the pause badge
      and gold center ring both actually reach `opacity: 1` on real hover
      and stay scoped to just the hovered team's own coverflow, not both
      teams' cards on the page. Header's fixed `h-16` height swapped for
      `min-h-[116px] py-4` to fit the coverflow's 84px height (was clipped
      otherwise) - the only other layout change this leg made; the
      header's control-cluster/name-position rework is still leg 2, not
      touched here.
    - **Leg 2 done (2026-08-29)** - header/controls rework. Two new
      components: `TeamOverflowMenu.tsx` (the "⋮" trigger + dropdown,
      self-contained open/close state via `useState`+`useDismissable`,
      same pattern as `RegulationBadge.tsx`) and `TeamValidationButton.tsx`
      rewritten from a standalone round icon button into a menu row (its
      only remaining consumer is now the overflow dropdown, so no variant
      prop needed - just restyled in place, self-contained result-popup
      logic unchanged). All row icons/copy/order (Validate Team/Export
      (Showdown text)/Export Image/Export PDF/divider/Delete Team in red)
      and the pill cluster's Edit/divider/Expand/divider/More layout
      pulled verbatim from the approved mockup's `Main.dc.html`/
      `Overflow.dc.html` artboard source (parsed out of the design
      artifact's own embedded `canvas.json`, same "read the source, don't
      eyeball the screenshot" approach leg 1 used for the coverflow
      keyframes) rather than guessed - exact SVG path data, `.controls`/
      `.ctrl`/`.menu`/`.menu-row` CSS values translated 1:1 to Tailwind
      classes. `TeamCard.tsx`'s header reordered to match: a new identity
      column (`RegulationBadge` + team name + author, was previously split
      across the name up front and author/badge in the old far-right
      cluster) sits left of the coverflow, which now centers in the
      remaining flex space instead of sitting flush left; the far-right
      cluster is now just the one pill (`bg-zinc-800 border-zinc-700
      rounded-full`) holding Edit + Expand (both gain a `.ctrl.active`-
      equivalent highlight - `bg-zinc-700` + accent text - when
      editing/expanded, matching the mockup's active-state class) and
      `TeamOverflowMenu`. `type-check`/`lint`/`build`/`test` (395 cases)
      all clean. Live-verified via `run-desktop`: screenshotted the
      collapsed header (identity column/coverflow/pill all in the right
      positions), the overflow menu open (row order/icons/red Delete
      divider match the mockup exactly), a live Validate Team result
      popping inside the still-open menu, and the Edit pill's active gold
      highlight while expanded with the menu still open on top.
    - **Follow-up bug found + fixed same day (2026-08-29), three passes**:
      leg 2's new overflow menu (and expanding a team) could push content
      past one viewport height, and the vertical scrollbar popping in
      shrank the team card's own width by the scrollbar's track width -
      visibly narrowing/shifting every card the instant it appeared.
      1st pass added `scrollbarGutter: 'stable'` to `App.tsx`'s `<main>`
      (the outer scroll container shared by every tab) - a real fix for
      *that* container, verified via `main.clientWidth` staying identical
      across expand/collapse, but **user reported the shrink still
      happened from the overflow menu specifically**, which turned out to
      be a second, different scroll container: walking the DOM ancestor
      chain and diffing each one's `scrollHeight`/`clientHeight`
      before/after opening the dropdown found `TeamsPage.tsx`'s own
      nested `overflow-y-auto` content div was the one actually
      overflowing, not `<main>` - correcting the 1st pass's (wrong)
      assumption that div could never get height-constrained on its own;
      it does, via `TeamsPage`'s own `h-full flex flex-col` flexbox
      layout fixing that div's height independently of `<main>`'s. Since
      the dropdown is `position:absolute`, it doesn't affect layout height
      but does still count toward `scrollHeight`, so it can push past this
      inner div's already-fixed `clientHeight` and trigger a scrollbar
      there specifically, even while `<main>` above it has room to spare
      and shows none. 2nd pass added the same `scrollbarGutter: 'stable'`
      fix to that inner div too. **User then found the actual root cause**
      from a screenshot: a lower team's open overflow menu was visibly cut
      off mid-list, not just growing the container's scrollable area -
      `overflow-y-auto` on that div forces `overflow-x` to `auto` too per
      the CSS spec's "if one axis is visible and the other isn't, the
      visible one gets coerced to auto" rule (confirmed live via
      `getComputedStyle`), so the div was clipping the dropdown on both
      axes the whole time, not just inflating scrollHeight - the
      `scrollbarGutter` passes were reserving space for a symptom, not
      fixing the real defect. 3rd pass: `TeamOverflowMenu.tsx` rewritten
      to render its dropdown through a `createPortal` to `document.body`,
      `position: fixed` and positioned off the trigger button's own
      `getBoundingClientRect()` (computed in a `useLayoutEffect` so it
      never flashes at the wrong spot) instead of a plain `absolute` child
      - not a DOM descendant of the clipping/scrolling div any more, so it
      can neither be clipped by it nor count toward its `scrollHeight`,
      fixing both symptoms at their actual source. Since a portaled node
      isn't a DOM descendant of the trigger's own wrapper either,
      `useDismissable`'s single-ref `contains()` check no longer works for
      it - outside-click/Escape dismissal reimplemented inline with two
      refs (trigger + portaled menu content), and the menu now also
      dismisses on scroll/resize (a capturing `window` listener, so it
      still catches a nested scrolling container's own scroll) rather than
      trying to keep its position live-tracking the trigger while open.
      The two `scrollbarGutter` passes above were left in place - they're
      still doing real work for genuine content-driven overflow (many
      teams, several expanded at once), just no longer load-bearing for
      the overflow-menu case specifically. `type-check`/`lint`/`build`/
      `test` (395 cases) all clean. Live-verified via `run-desktop`:
      confirmed the portaled menu's parent actually is `document.body`,
      confirmed the teams-list div's `scrollHeight`/`clientHeight` now
      stay exactly equal with the menu open (no overflow induced at all,
      vs. the 2nd pass's still-genuine-but-now-moot 308-vs-296 gap),
      re-confirmed Escape and clicking a menu item (Validate Team) both
      still work correctly now that the menu's DOM location moved.
    - **Leg 3 done (2026-08-29)** - expanded-grid stats restoration. Turned
      out to already be almost entirely in place: `StatsColumn.tsx`/
      `EVStatCell.tsx` (SP grid + nature pill), `PokemonCard.tsx`'s gender/
      shiny footer toggles, and drag-to-reorder (`draggable={isEditing}` +
      `handleDragStart`/`Over`/`Drop`) all predate the coverflow rework and
      were never actually dropped by legs 1-2 - confirmed by reading the
      code rather than assuming from the TODO wording, and cross-checked
      against the approved mockup's `Expanded.dc.html` artboard (parsed out
      of the design artifact the same "read the source" way legs 1-2 did):
      `pokemonTheme.ts`'s `STAT_LABEL_COLORS` (red/orange/yellow/blue/
      green/pink-400) already match the mockup's per-stat hexes exactly.
      The one actually-missing piece was the mockup's `.grip` element - a
      22x22px rounded top-left drag-handle icon (6-dot grid SVG) that
      didn't exist in the live app (the whole card was already draggable/
      `cursor-grab` while editing, just with no visible handle affordance
      for it) - added to `PokemonCard.tsx`, edit-mode-gated same as the
      delete button, exact SVG path/positioning/colors pulled from the
      mockup source rather than guessed. `type-check`/`lint`/`build`/`test`
      (395 cases) all clean. Live-verified via `run-desktop`:
      screenshotted an expanded team's roster grid in edit mode (grip
      icon top-left on every card,
      SP/EV grid + nature pill + gender/shiny footer all rendering
      correctly, matching the mockup) and again with edit mode toggled
      back off (grip icon and delete button both gone, only the export
      button remains, same as before this leg).
    - **Leg 4 done (2026-08-29)** - responsive grid + drag-reorder gating
      change, closing out the Teams-carousel rework's implementation
      sequence. Exact breakpoint pulled from the approved mockup's own
      `GridWide.dc.html`/`GridNarrow.dc.html` artboard source (same
      "read the source, don't eyeball the screenshot" approach legs 1-3
      used) rather than guessed - confirmed both artboards use
      `grid-template-columns: repeat(2, minmax(0, 1fr))`/`1fr` with a
      `.span-full { grid-column: 1 / -1; }` rule, at mockup content widths
      of 1600px (2-col) and 820px (1-col); the TODO's own "~1160px+"
      placeholder wasn't pinned to anything more specific in the mockup
      itself (both artboards are static snapshots, not a live-resizing
      container-query demo), so `@[1160px]` was kept as the real value
      rather than re-guessed. `TeamsPage.tsx`'s scrollable content div
      gained `@container` (Tailwind v4 container-query root, same pattern
      `TeamCard.tsx`'s own `@[1760px]` roster-grid breakpoint already
      uses) and the teams-list wrapper changed from `flex flex-col gap-3`
      to `grid grid-cols-1 @[1160px]:grid-cols-2 gap-4` - keyed off this
      wrapper's own container width, not viewport width, for the same
      reason the roster-grid breakpoint is container-based (the sidebar
      eats into actual content width, so raw viewport width lies).
      `TeamCard.tsx`'s root div now adds `col-span-full` whenever
      `isExpanded` is true, so an expanded card spans the full grid row
      width in the 2-column layout (pushing subsequent cards down) rather
      than being squeezed into a half-width column - no prop threading
      needed since `isExpanded` was already local state on the card
      itself. Drag-to-reorder gating changed from "the collapsed header
      is always draggable regardless of state" to gated behind **both**
      expanded AND edit-mode (`canReorder = isExpanded && isEditingTeam`):
      the header row's `draggable` attribute, its `cursor-grab` styling,
      and a new `title="Drag to reorder"` hint all read off `canReorder`
      now instead of being unconditional, and `handleDragStart` itself
      also early-returns (`e.preventDefault()`) as defense-in-depth if
      somehow invoked while `canReorder` is false. Only the drag *source*
      is gated - `onDragOver`/`onDrop` stay unconditional so any card can
      still be a drop target regardless of its own expand/edit state,
      matching how `reorderTeam` already resolves against the full teams
      array regardless of which card triggered the drop.
      `type-check`/`lint`/`build`/`test` (395 cases) all clean.
      Live-verified via a one-off Playwright script (same precedent as
      leg 2's real-hover script - needed direct `BrowserWindow.setSize()`
      access via `electronApp.evaluate()` to actually resize the OS
      window, which the shared `run-desktop` driver doesn't expose):
      created two disposable empty teams, confirmed
      `getComputedStyle(gridEl).gridTemplateColumns` is a single track at
      the app's 1280x720 floor size (992px container width, under the
      1160px breakpoint - screenshotted showing 1 column) and two tracks
      once resized to 1900x900 (1612px container width - screenshotted
      showing 2 columns), confirmed the expanded card's computed
      `gridColumn` is actually `1 / -1` with `offsetWidth` matching the
      full row rather than a half column (screenshotted), and walked the
      full gating state machine on the same card: `draggable="false"`
      while collapsed, still `"false"` once expanded but not editing,
      `"true"` only once both expanded AND editing (screenshotted), and
      back to `"false"` after toggling edit off again - matching the
      approved spec exactly at every step. Cleaned up both disposable
      teams afterward and confirmed the user's real 2 teams were
      untouched throughout. This closes out all 4 legs of the
      Teams-carousel/grid rework's implementation.
    - **Follow-up bug found + fixed same day (2026-08-29)**: user reported
      (with a screenshot) a window size where the two 2-column team cards
      looked visibly squeezed - coverflow icons crowding the controls
      pill with no breathing room. Root cause was leg 4's own
      `@[1160px]` breakpoint being too low for the header's actual
      hard-minimum content width: the header row's three sections
      (identity column, the coverflow's fixed 240px box, the controls
      pill) are all effectively non-shrinking (`flex-shrink:0` on the
      coverflow, `shrink-0` on the other two), so once total available
      column width drops below their combined minimum the row has to
      overflow rather than compress - and 1160px put each column right
      at ~570px, under that floor. Live-measured the real floor via a
      one-off Playwright script (same `BrowserWindow.setSize` +
      `electronApp.evaluate` approach as the leg-4 verification script):
      ~574px of hard-minimum header content width. A second, related bug
      surfaced during that measurement: the identity column (`min-w-
      [190px] shrink-0`, no `max-w`) could grow past its intended 190px
      for a long team name/author, since the `truncate` class on the name
      `<h2>` never had a bounded width to truncate against - so a long
      name was quietly making the true minimum worse than the 190px the
      layout was designed around. Fixed both: identity column gained
      `max-w-[190px]` (now a true fixed 190px, `truncate` actually
      engages), and the author `<span>` switched from `whitespace-nowrap`
      to `truncate block` (needs `block` since `truncate` requires a
      non-inline box to respect a bounded width) so a long author name
      also ellipsizes instead of pushing width. With identity capped, the
      real measured floor came down slightly and became name-length-
      independent; re-measured live across a full window-size sweep
      (1400-2000px) to find where the 2-column layout stays comfortably
      clear of it, landing on `@[1360px]` (~50px+ slack once 2 columns
      activate, vs. the mockup's own placeholder ~1160px which was never
      pinned to anything more specific than two static snapshot widths).
      Re-verified the full sweep shows zero header overflow at every
      tested width including right at the new crossover (1650px window),
      and specifically re-tested a window size matching the user's
      reported screenshot (1466px) - now stays single-column with the
      team name visibly truncating ("Shock me like an elect...") instead
      of squeezing into a broken 2-column layout. `type-check`/`lint`/
      `build`/`test` (395 cases) all clean.

- **Color palette rework - design approved 2026-08-29**, same artifact,
  two new artboards (`Palette.dc.html`/`TypedGrid.dc.html`). Approved
  spec, replacing `blue-600` as the app's primary accent everywhere and
  standardizing the gray/zinc inconsistency already present in the live
  app today (`App.tsx`/`PokemonCard.tsx`/`StatsColumn.tsx` use
  `gray-700/800/900`; `TeamCard.tsx` already uses `zinc-800/900/950` -
  picking one family resolves that split, doesn't introduce a new one):
  - **Primary accent -> gold**, sampled directly from the Gholdengo
    sprite (not eyeballed from the mascot art) - `#f0c840` base
    (96%+ pixel agreement between the small PokeAPI pixel sprite and the
    official-artwork version, sampled programmatically with Pillow) and
    `#c09830` deep/shadow tone, both real sampled values. Replaces
    `blue-600` for buttons, active states, focus rings, etc. app-wide.
  - **Secondary accent -> royal purple**, sampled from `build/icon.png`'s
    own background fill - `#381070` (99.8% of background pixels are this
    exact value) for deep surface/badge tints, plus a lightened
    same-hue derived shade `#6d25d0` for interactive uses where the raw
    sampled purple is too dark to read on dark surfaces. Reg M-B's
    existing purple badge color can keep doing double-duty (explicit
    user non-objection) rather than being reassigned.
  - **Neutral base standardized on zinc** app-wide (Zinc 950/900/800/
    700/500/100 - `#09090b`/`#18181b`/`#27272a`/`#3f3f46`/`#71717a`/
    `#f4f4f5`), replacing every remaining `gray-*` usage.
  - **Semantic colors (success green, danger red) stay as-is** - not
    brand color, kept for conventional legibility (danger = red, etc.).
  - **Real design tokens, not another hardcoded-class sweep** - explicit
    user call for scope: introduce named CSS custom properties (a
    Tailwind v4 `@theme` block in `index.css`, e.g. `--color-accent-*`)
    so this palette lives in one place; a future tweak becomes a
    one-file change instead of resweeping every component again like
    this pass has to.
  - **New idea layered on top, also approved**: individual Pokémon cards
    (the expanded roster grid, not the team-card level) get a per-type
    accent instead of a flat `gray-600` border - a soft colored glow/ring
    around the card (not a full-card tint, not a flat border) using the
    real type colors already in `pokemonTheme.ts`'s `TYPE_THEMES`. A
    dual-type Pokémon (e.g. Water/Flying) gets a diagonal gradient
    blending both type colors rather than showing only its primary type.
  - **Two real bugs found and fixed live during this pass, both
    instructive for implementation**:
    1. The dual-type glow was built as two separate stacked
       `box-shadow`s (one per type color) - CSS renders the *first*
       listed shadow visually on top, so whichever type happened to be
       listed first silently dominated regardless of the actual
       gradient, reading as "favors one type" rather than a 50/50 blend.
       Fix: a single blurred `::before` pseudo-element using the exact
       same `linear-gradient` as the ring itself (not two independent
       shadows) - inherently balanced since it's one gradient, not a
       stacking order.
    2. Some type colors are too close to the app's own near-black
       surfaces to read as a glow at all regardless of compositing -
       Dark (`#1f2937`) most severely (nearly identical to the app's own
       dark grays), Dragon (`#4f46e5`) more subtly (indigo reads muted
       against dark backgrounds even at reasonable lightness). Fix: a
       **glow-safe variant rule** - same hue, lightness floor raised
       (Dark -> `#524267`, Dragon -> `#6366f1` used for the glow only,
       *not* the type-badge pill color, which reads fine as plain text
       on a dark pill and stays unchanged) - documented as a general
       rule to check against all 18 types during implementation, not a
       one-off fix for just these two.
    3. The glow's blur/spread was initially too strong (`inset:-9px`,
       `blur(15px)`, `opacity:0.6`) and visibly bled across the roster
       grid's 24px gap into neighboring cards' glows, muddying the
       effect - tightened to `inset:-3px`, `blur(7px)`, `opacity:0.38`,
       confirmed to stay within each card's own footprint.
  - **Implementation started 2026-08-29** - sequenced into legs with the
    user (A+B combined, then C, then D):
    - **Leg A+B done (2026-08-29)** - token infrastructure + the
      blue-600-as-primary-accent sweep, together since sweeping to gold
      needs the token to exist first. `index.css` gained a Tailwind v4
      `@theme` block (`--color-accent-gold: #f0c840`,
      `--color-accent-gold-deep: #c09830`, `--color-accent-purple:
      #381070`, `--color-accent-purple-light: #6d25d0` - purple tokens
      defined now, not yet consumed anywhere pending a future leg). Swept
      ~50 files: every `bg-blue-600`/`hover:bg-blue-700`/`focus:ring-
      blue-500`/`focus:border-blue-500`/active-picker-panel `border-
      blue-500`/drag-over `ring-blue-400` instance that was acting as
      the app's primary interactive accent (buttons, active tab/toggle
      states, focus rings, popover borders, the "ChoiceBuds" wordmark)
      now uses `accent-gold`/`accent-gold-deep`; a solid `bg-accent-gold`
      pairs with `text-zinc-900` instead of `text-white` since the gold
      base is light (poor contrast with white). Deliberately left blue
      alone where it wasn't the primary accent but a separate existing
      color convention: the player(blue)/opponent(red) identity pairing
      throughout Battle Log (`TurnLog`/`BattlefieldSlot`/
      `MoveOutcomePrompt`/`SideConditionsRow`/`PlayerFieldPanel`/
      `Battlefield`'s "Your Side" label), the male-gender ♂ symbol
      (`PokemonCard`/`CalcPokemonPanel`, blue/pink is a fixed convention
      paired with female pink), nature-lowered-stat text color
      (`CalcStatRows`), the Water-type badge and SpA stat-label colors
      (`pokemonTheme.ts`), and Reg M-A's own blue regulation-badge theme
      (kept as a category-identity color the same way Reg M-B's purple
      badge was explicitly kept in the approved spec above) - this was an
      assumption at the time, **confirmed correct by the user afterward**:
      regulation-badge colors are just a quick visual indicator, not
      significant enough to matter, and can be swapped to something else
      entirely in a later pass if wanted. `type-check`/`lint`/`build` all
      clean; live-verified via
      `run-desktop` (Teams page nav/buttons/active filter, Settings page
      active toggles all render gold with dark text; Reg M-B badge purple
      untouched).
    - **Leg C done (2026-08-29)** - gray/zinc neutral-standardization
      sweep. Mechanical, not a redesign: every remaining `gray-{100-900}`
      Tailwind class across `src/renderer` (63 files, 9 shades in use -
      100/200/300/400/500/600/700/800/900, no `gray-50`/`gray-950` were
      present) renamed 1:1 to the matching `zinc-*` shade
      (`sed -E 's/gray-([0-9]+)/zinc-\1/g'`), preserving every existing
      bg/text/border/hover/placeholder/opacity-modifier prefix and
      lightness relationship rather than re-picking shades by eye -
      confirmed by diff (exactly one token swapped per line, nothing else
      touched) and by a `grep -rn gray` sanity pass turning up only
      unrelated hits (`grayscale` CSS utility/comment mentions, not
      Tailwind color classes). This includes `pokemonTheme.ts`'s
      `TYPE_THEMES` Dark/Steel/Normal/Electric/Ice/Bug/Fairy entries,
      which used `gray-*` as their type-badge color - in scope per the
      approved spec's "every remaining gray-* usage," and visually
      identical since zinc is the same neutral family. `type-check`/
      `lint`/`build`/`test` (395 cases) all clean after the sweep.
      Live-verified via `run-desktop`: Teams page (collapsed list, filter
      pills, expanded roster grid), Settings, Calc, and Battle Log's empty
      state all render consistent zinc surfaces with no leftover
      mismatched gray.
    - **Leg D done (2026-08-29)** - per-type Pokémon card glow effect,
      closing out the color-palette rework's implementation. `TypeTheme`
      (`config/pokemonTheme.ts`) gained an optional `glow` hex field
      alongside the existing `bg`/`text` Tailwind classes (a plain hex,
      not a class, since it feeds a dynamic per-instance CSS custom
      property rather than a static badge) - all 18 types reuse their
      badge hex directly except Dark and Dragon, which use the
      design-approved glow-safe overrides (`#524267`/`#6366f1`) instead
      of their actual badge hexes (`#27272a`/`#4f46e5`) per the spec's
      finding; a new `getTypeGlowColors(types)` returns the 2-color tuple
      (single-type Pokémon get the same color twice, degenerating the
      gradient to solid). Re-audited all 18 against the app's actual
      (post-Leg-C zinc) near-black surfaces while implementing, not just
      assumed from the design pass's pre-sweep swatch - confirmed only
      Dark/Dragon still need the floor-raise, same as originally found.
      `index.css` gained the shared `.type-glow-ring`/`.type-glow-ring::before`
      rule (2px gradient-background padding for the ring itself, plus a
      `blur(7px)`/`opacity:0.38`/`inset:-3px` blurred copy of the *same*
      gradient for the outer glow - one gradient blurred twice, not two
      stacked `box-shadow`s, per the spec's own bug-fix finding) reading
      `--glow-c1`/`--glow-c2` custom properties. `PokemonCard.tsx` wraps
      its existing card in this ring (outer wrapper carries the ring +
      `max-w-[280px]`, drag handlers/`data-pokemon-card` stayed on the
      inner content div which lost its old flat `border-zinc-600` in favor
      of the ring) and sets those two properties inline via
      `getTypeGlowColors(types)` - the `isDragOver` gold highlight became
      a `ring-2 ring-accent-gold` on the inner div, layering on top of the
      outer glow rather than replacing it. `type-check`/`lint`/`build`/
      `test` (395 cases) all clean. Live-verified via `run-desktop`:
      screenshotted the roster grid with mono-type (Eelektross, plain
      yellow ring), dual-type same-family (Whimsicott Grass/Fairy, visible
      green-to-pink diagonal blend), and both glow-safe cases in the same
      real roster (Incineroar Fire/Dark and Garchomp Dragon/Ground) -
      confirmed via computed-style read that `--glow-c1`/`--glow-c2`
      actually carry the glow-safe hexes (not the raw badge hexes) for
      those two, and confirmed visually the ring/glow stays legible against
      the dark card background instead of vanishing. Also re-screenshotted
      with edit mode toggled on - ring persists, no double-border with the
      new gold drag-over ring, delete button and drag-handle affordance
      unaffected. This closes out the color-palette rework's Leg A+B/C/D
      implementation sequence in full - all three legs done.

- **Battle Logger stat-inference, Phase 3's 3rd polish item: TTL tuning**
  (2026-07-20) - the only remaining Phase 3 item (see below), closing out
  the whole stat-inference thread. "TTL tuning" was ambiguous enough to ask
  the user what it should actually mean rather than guess; they picked two
  of the four options offered (adjusting `USAGE_CACHE_DURATION_MS`'s 5-day
  value itself was explicitly not one of them):
  1. **Fixed a stale comment** - `services/championsBattleData.ts`'s
     duration constant justified 5 days as "shorter than PokeAPI-sourced
     sections' 30 days," but that comparison predates 79fa952's offline-
     caching rework, which moved every other `GameDataCache` section
     (moves/items/abilities/learnsets) to `NEVER_EXPIRES` - there's no more
     30-day baseline to be shorter than. Reworded to justify the 5 days on
     its own terms: usage is the only section here that's genuinely
     time-varying (ranked-ladder standings shift week to week) rather than
     static game data, so it's the only one that still needs a real TTL at
     all.
  2. **Surfaced staleness in the UI** - `LikelySetsPopover.tsx`'s footer
     line ("Champions ranked usage · {season}") had no indication of how
     old the cached data was, and there's no manual-refresh control, so a
     user had no way to judge whether a shown percentage might already be
     a few days stale. Added a small `formatCacheAge(cachedAt)` helper
     (just-now / Xh ago / Xd ago) inline in the component - no new shared
     util file, since this is its only consumer - appended to the footer
     as "· updated Xh/d ago".
  Live-verified via `run-desktop` against a disposable test battle: added
  Kingambit as an opponent (cached from 2026-07-16 testing, ~4 days old),
  opened the Likely Set popover, confirmed the footer read "Champions
  ranked usage · Current · updated 14h ago" - the fetch had actually
  refreshed sometime after the original 2026-07-16 cache (14h, not ~4
  days), consistent with something re-warming the cache in the interim
  rather than a bug in the new display code. Test battle cleaned up
  afterward by cross-referencing `battles.json` directly (found by exact
  opponent-roster/timestamp match, not a blind first-row click) to confirm
  the right two disposable battles were deleted and a real pre-existing
  battle was left untouched.

- **2026-07-20 manual-testing batch** (raised after a testing session the
  night of 2026-07-19, all 6 items worked through the same day):
  1. **Move Stat Effects: Make It Rain's missing -2 Sp. Atk self-drop** -
     `config/moveStatEffects.ts` had every other Draco Meteor-family move
     (Overheat/Leaf Storm/Psycho Boost/Fleur Cannon) but not Make It Rain
     itself, so the Battle Logger never auto-applied its stat drop when
     logged. Confirmed the effect against the existing
     `championsMoveOverrides.ts` entry for the move (its own description
     already said "Lowers the user's Sp. Atk by 2 stages") before adding
     the missing row.
  2. **Calc page: abilities weren't updating when a Pokemon's Mega toggle
     was switched** - `CalcPokemonPanel.tsx`'s Mega Evolution `FormeToggle`
     only called `onChange({ species })`, never touching `ability`, unlike
     the Battle Logger's equivalent `setMegaEvolved` (which already used
     `config/megaAbilities.ts::getMegaAbility`). Wired the same lookup into
     the Calc panel's toggle handler so selecting e.g. Charizard-Mega-X now
     also sets Ability to Tough Claws. Live-verified: selecting Mega X
     updates the field to "Tough Claws" immediately.
  3. **Battle Logger: a post-faint replacement sent in at the end of a turn
     displayed as if switched in at the start of the turn** -
     `TurnLog.tsx`'s `sortByPhase` unconditionally hoisted every
     `sendIn`/`switch` action above that turn's `move` actions (correct for
     a real start-of-turn switch, since real turns resolve switches before
     moves) - but a forced replacement for a Pokemon that fainted *that
     same turn* would get hoisted the same way, burying it above the very
     moves that caused the faint. Fixed by detecting whether a `sendIn`/
     `switch` action's natural (logged) position comes after a `'Fainted'`
     note earlier in the turn; if so it now sorts alongside/after the
     turn's moves in real chronological order instead of always floating
     to the top.
  4. **Calc page state reset on every tab switch** - `App.tsx` rendered
     only the active tab (a ternary chain), so switching away and back
     fully unmounted/remounted `CalcPage`, discarding its `useDamageCalc`
     state (intentionally *not* lifted to `App.tsx`, to keep `@smogon/calc`
     - the app's heaviest dependency - behind the `React.lazy()` boundary
     for Teams-only sessions - see `CalcPage.tsx`'s header comment). Fixed
     without lifting that state: `App.tsx` now tracks `visitedTabs` and
     keeps every tab a user has opened this session mounted permanently
     (toggled via CSS `display:none` instead of unmounting), while a tab
     never opened yet still pays nothing (no `React.lazy()` import, no
     mount at all) until first visited. Live-verified: set Calc species/
     item, switched to Battle Log and back, values persisted.
  5. **Battle Logger: no way to wake a sleeping Pokemon, no sleep-turn
     counter** - added `Battle.statusSetOnTurn: Record<string, number>`
     (mirrors `FieldState.weather`'s `setOnTurn` pattern), set/cleared in
     lockstep with `statusConditions` by `setStatusCondition`.
     `BattlefieldSlot.tsx`'s status badge now shows a live turn count next
     to Sleep specifically (e.g. "SLP (2)") - the one status worth a
     counter, since Sleep is turn-limited while Burn/Paralysis/Poison just
     persist until cured. Added a one-tap "Wake Up" chip (visible whenever
     a mon is asleep, same visual tier as the existing switch-in/reactive-
     ability chips) that clears the status in one click, and relabeled the
     existing `StatusConditionPopover`'s clear button from "None" to "Wake
     Up" specifically when the current status is Sleep. Also backfilled a
     pre-existing gap surfaced while touching this code: `statusConditions`
     itself had no `normalizeBattle` default for battles saved before that
     field existed - would have thrown on `battle.statusConditions[id]` for
     a legacy record. Live-verified end-to-end in a disposable battle: SLP
     (1) -> (2) -> (3) advancing one per turn, Wake Up chip clears it with
     a "Woke up" log note, cleaned up afterward.
  6. **Team editor: moves/abilities weren't ordered by Champions usage %,
     and no percentage was shown** - two layers:
     - `useGameData.ts::getEnrichedSpeciesOptions` (the single shared
       source for the Ability/Move picker panels, the Team Builder's
       "Smart Slot Initialization" default-picking, the Battle Logger's
       opponent ability dropdown/move-blocking-ability suggestions, and
       `useInitialSync`'s bulk sync) now sorts its returned moves/abilities
       most-used-first whenever Champions usage data is already *cached*
       for that species (`getCachedChampionsUsage` - never a live fetch
       here, since this same function runs across the whole legal roster
       during first-launch sync, where per-species usage fetches would be
       a real network-cost regression). Anything with no cached usage entry
       keeps its original learnset-order position, pushed after every
       ranked entry.
     - `EditOverlays.tsx` (feeds the team editor's `AbilityPickerPanel`/
       `MovePickerPanel`) additionally live-fetches usage data for the
       specific Pokemon being edited (`getChampionsUsage`, same on-demand
       tier as the Calc page's own auto-fill), re-sorts client-side with
       that guaranteed-fresh data, and passes a percentage lookup down so
       both picker panels now show a "NN.N%" badge next to each option.
     - `useRosterActions.ts::buildSlot` (a freshly-added team slot's
       "first legal ability"/"first 4 legal moves" defaults) now also
       live-fetches usage before picking defaults, for the same
       first-time-species-view correctness reason as `EditOverlays.tsx` -
       `getEnrichedSpeciesOptions`'s own cached-only sort is a nice best
       effort but can't guarantee a species nobody's looked at yet is
       already cached.
     - Live-verified end-to-end in a disposable team: adding a fresh
       Incineroar defaulted to Intimidate/Fake Out/Flare Blitz/Parting
       Shot/Darkest Lariat - exactly matching the Calc page's own
       usage-based auto-fill for the same species (same underlying data,
       cross-checked as the correctness signal instead of guessing
       real-world meta). Ability picker showed "Intimidate 99.7%" /
       "Blaze 0.3%" in that order; Move picker showed "Fake Out 99.3%" /
       "Flare Blitz 91.5%" in that order.

- **2026-07-19 Offline support: one-time live sync + no auto-expiry** (TODO.md
  items 2 and 7, resolved after an initial mis-scoped plan - a build-time
  data snapshot bundled inside the installer - was proposed and rejected;
  the user clarified the actual want: no data ships in the installer, the
  app does one comprehensive **live** sync on first launch, and after that
  needs zero network for anything except two explicit exceptions). Three
  changes:
  1. **`useInitialSync.ts` now also syncs `pokeapi-cache.json` species
     stats/types** (`fetchPokemonData`/`setCacheEntry`, the same functions
     `enrichPokemonWithAPI` uses at import time), closing a real gap where
     it previously only synced `game-data-cache.json`'s moves/abilities/
     learnsets - importing a never-touched species still needed network
     even after "sync" completed.
  2. **`GameDataCache.initialBulkSyncCompletedAt` (a one-shot boolean)
     replaced with `lastSyncedSpeciesNames: string[]`.** `useInitialSync`
     diffs the current legal roster against this list every launch and
     syncs only what's missing - the full roster on a fresh install, just
     the delta after a future regulation update adds species. One
     mechanism covers both cases with no separate "detect regulation
     change" logic.
  3. **Cached species/move/item/ability/learnset data never expires once
     synced** - new `utils/cacheExpiry.ts::NEVER_EXPIRES` sentinel
     (`Number.MAX_SAFE_INTEGER`, since `Infinity` isn't JSON-serializable)
     replaces every `expiresAt: now + <TTL>` write site across
     `services/pokeapiService.ts`, `services/pokeapi.ts`,
     `hooks/useDatabase.ts`, and drops `useSpeciesRoster.ts`'s localStorage
     TTL check entirely. No `expiresAt` *read* site needed to change - they
     already just compare against `Date.now()`, which the sentinel always
     satisfies, and `useDatabase.ts`'s periodic cleanup pass naturally
     becomes a no-op. Champions usage data (`championsBattleData.ts`'s
     `USAGE_CACHE_DURATION_MS`, 5 days) is explicitly untouched - it's the
     one thing meant to keep auto-refreshing. Synthesized item placeholders
     (Mega Stones PokeAPI doesn't have yet) needed a different fix since a
     permanent `NEVER_EXPIRES` would freeze them broken forever: `useGameData
     .ts`'s `getCachedItem` now treats `spriteUrl === ''` as a cache miss,
     the same self-healing-on-read pattern already used for
     `hasChampionsMoveData`/`target`/`meta`, so they keep retrying every
     launch instead of relying on TTL.

  Also added a manual **"Refresh Game Data" button** (Settings ->
  `GameDataResetSection.tsx`) as the escape hatch now that nothing
  auto-revalidates - wraps both `useDatabase`/`useGameData`'s `clearCache()`.
  Live-tested (`run-desktop`) clicking it twice in the same session surfaced
  a real bug in the first pass: `useInitialSync`'s `hasStarted`/
  `heavySyncDone` were a permanent one-shot latch, so a second in-session
  resync would silently no-op instead of re-running - fixed by making the
  guard "a sync is currently running" (`isSyncing` ref, reset at the end of
  each run) instead of "has ever run," and resetting `heavySyncDone` to
  `false` at the start of each new sync so the LoadingScreen gate correctly
  reflects the new run in progress. Also caught and fixed live: reading a
  cache file written before `lastSyncedSpeciesNames` existed left the field
  `undefined` (not an empty array), which crashed `markSpeciesSynced`'s
  array spread (`prev.lastSyncedSpeciesNames is not iterable`) - fixed by
  normalizing it to `[]` once, at the mount-read boundary in `useGameData.ts`,
  rather than defending against `undefined` at every call site. Both bugs
  were caught by actually running the app against the real (old-schema,
  225-species) cache file rather than trusting type-check alone - confirmed
  live: the migration self-heals silently on first launch after the update
  (harmless full re-pass, but every individual lookup is a cache hit so it
  completes in seconds, not a real network re-fetch), a targeted
  single-species delta-sync correctly re-syncs just that one species, and
  Calc/Battle Log/Teams pages all render normally afterward with sprites
  intact.

- **2026-07-19 Type Matchup - type-changing abilities in Offensive Coverage**
  (follow-up explicitly deferred at the standalone-calculator/Offensive-
  Defensive-Coverage rebuild, see below/TODO.md item 9). New
  `config/typeChangingAbilities.ts::getEffectiveMoveType(moveName, baseType,
  ability)`, called from `hooks/useTeamMoveTypes.ts` against each Pokemon's
  equipped `showdownData.ability` (always known for a saved team - no
  revealed/unrevealed ambiguity like Battle Logger opponents) before a move's
  type feeds `utils/typeCoverage.ts`. Covers all 6 real type-changing
  abilities: Pixilate/Aerilate/Refrigerate/Galvanize (retype Normal-only to
  Fairy/Flying/Ice/Electric), Normalize (retypes every damaging move to
  Normal), and Liquid Voice (retypes sound-based moves to Water - reused
  `config/moveBlockingAbilities.ts`'s existing `SOUND_BASED_MOVES` list,
  exported for the purpose, rather than duplicating it for Soundproof's
  block-list use). Deliberately excluded (documented in the config file's
  header, not silently dropped): moves whose *effective* type varies by
  user/field/item state but default to a fixed type in this app's static
  move data (Weather Ball, Judgment, Techno Blast, Natural Gift, Multi-
  Attack, Raging Bull, Ivy Cudgel, Revelation Dance, Terrain Pulse, Aura
  Wheel, Tera Blast) - Bulbapedia confirms these are excluded from the
  ability's effect in-game too, but applying the ability naively on top of
  this app's single-fixed-type-per-move model would show a permanently wrong
  type instead of the real conditional one. Tera typing generally isn't
  factored into either Coverage table at all, a pre-existing gap not
  introduced by this change. Live-verified via `run-desktop` against a
  disposable Pixilate Sylveon (Hyper Voice/Mystical Fire/Shadow Ball) built
  and deleted for the test: before the fix Hyper Voice would score neutral
  against Fighting/Dragon-type defenders (Normal has no super-effective
  matchups); after the fix, Offensive Coverage's Fighting and Dragon rows
  both correctly light up 2x (Fairy's real super-effective matchups),
  confirming the ability-based retype actually drives the table.

- **2026-07-19 team edit mode: drag-to-reorder the 4 moves within a Pokemon's
  moveset** (follow-up to the existing whole-card drag-to-reorder, raised and
  built same day). New `utils/moveReorderDragTypes.ts`
  (`MOVE_REORDER_DRAG_TYPE` MIME type + `MoveReorderDragPayload` - separate
  from `teamRosterDragTypes.ts` since the payload shape/feature are
  unrelated); payload carries an `ownerId` (React's own `useId()`, one per
  `EditOverlays` instance) rather than a team/index pair, since a stray drag
  from one Pokemon card's move grid onto a different card's move grid has no
  other way to tell them apart. `MoveBubbleGrid.tsx`'s 4 slots are now each
  their own drag source/drop target (`draggable`, `onDragStart`/`onDragOver`/
  `onDragLeave`/`onDrop`), swapping the two move-name strings (and their
  paired `moveDataSlots` entries, to keep type-theming in sync without a
  refetch) via a new `onReorderMoves` callback wired up in `EditOverlays.tsx`
  (`handleMoveReorder`), which commits through the same `onUpdatePokemon`
  path `handleMoveClick` already uses - not `useActiveEditor.ts`'s
  `updateMoves()` as originally scoped in the TODO item, since that hook
  turned out to already be vestigial for this per-card edit flow (its
  `editorState` is passed into `TeamsPage` but never actually read there;
  `EditOverlays` keeps its own local `selectedMoves`/`moveDataSlots` state
  and calls `onUpdatePokemon` directly instead). Also fixes the companion bug
  named in the TODO: `PokemonCard.tsx`'s outer card `<div>` sets
  `draggable={isEditing}` on the whole card, and since the move bubbles
  previously had no `draggable` of their own, a drag starting from inside one
  bubbled up to become the card's own drag (reordering the whole Pokemon
  instead of just a move). Giving each bubble its own `draggable` plus
  `e.stopPropagation()` in its own `dragstart` handler makes the bubble the
  actual HTML5 drag source instead, so the outer card's `handleDragStart`
  never fires. Live-verified via `run-desktop` against a disposable
  4-move-Cresselia team (created and deleted for the test, not the user's
  real data): dragging move slot 0 onto slot 2 swapped "Lunar Blessing" and
  "Trick Room" in place, including the type-themed bubble color, with no
  `TEAM_ROSTER_DRAG_TYPE` payload set on the drag (confirmed the outer card
  never saw its own dragstart fire).

- **2026-07-19 standalone type-matchup calculator** (TODO.md's "2026-07-19
  manual-testing batch" item 9; new top-level "Type Matchup" tab, per the
  user's earlier choice over embedding it in Calc or a cross-page modal).
  Shipped in two passes the same day:
  1. First pass: a manual 1-2 type picker with a grouped weakness/
     resistance/immunity breakdown (`TypeSelector.tsx`/`TypeMatchupResults.tsx`).
  2. **Replaced same-day** (explicit user call, `TypeSelector.tsx`/
     `TypeMatchupResults.tsx` deleted) with a team-driven Offensive/
     Defensive Coverage view modeled directly on vgcmulticalc.com's
     type-calc tool (reference screenshot provided): pick a saved team, see
     two tables - **Offensive Coverage** (per type, the best effectiveness
     each team member's actual damaging moves would land against a
     hypothetical mono-type defender of that type, i.e. "can this team hit
     a Fire-type opponent hard?") and **Defensive Coverage** (per type, how
     each member's own typing takes that hit) - each with per-team-member
     columns plus two aggregate count columns (Not Very Effective/Super
     Effective for offense, Total Weak/Total Resist for defense). New
     `utils/typeCoverage.ts` (pure `computeOffensiveCoverage`/
     `computeDefensiveCoverage` over the existing `getEffectivenessMultiplier`
     chart - no changes to the type-effectiveness data itself, per the
     user's explicit "keep the data" instruction) and
     `hooks/useTeamMoveTypes.ts` (resolves each team member's damaging-move
     types via `gameDataState.getMoveData`, status moves excluded since they
     can't "hit" anything for coverage purposes; `isLoading` is derived from
     a `resolvedForTeamId` comparison rather than a synchronous
     `setState(true)` at the top of the effect, to satisfy the
     `set-state-in-effect` lint rule - same pattern as `useMegaSprite.ts`).
     `components/typematchup/` now holds `TypeMatchupPage.tsx` (team
     `<select>`, mirrors `CalcTeamTray.tsx`'s dropdown pattern),
     `CoverageTable.tsx` (shared table shell for both tables - they're
     structurally identical, just different data/labels/favorable-direction),
     and `CoverageCell.tsx` (renders one multiplier - color is direction-
     aware: 2x is green on the Offensive table but orange on the Defensive
     one, reusing the same green/orange/gray vocabulary as
     `TurnLog.tsx`'s `effectivenessLabel`). Live-verified via the
     `run-desktop` skill against a real saved team - both tables' per-slot
     multipliers, immune tags, and aggregate counts all matched hand-checked
     expectations. **Explicitly deferred by the user**: type-changing
     abilities (e.g. Sylveon's Pixilate converting Normal moves to Fairy)
     aren't factored into Offensive Coverage - a team member's raw move
     types are used as-is.

- **2026-07-19 Calc auto-fill from usage data + export to Saved Sets**
  (TODO.md's "2026-07-19 manual-testing batch" item 5; user confirmed doing
  both, auto-fill first):
  - **Auto-fill**: `CalcPokemonPanel.tsx::handleSpeciesSelect` (fires only
    on a real dropdown-list species pick, never mid-typing - same gate the
    saved-set popover already used) now also calls
    `gameDataState.getChampionsUsage(species)` and, on a hit, applies the
    top-ranked ability/item/nature/Stat-Point-spread/top-4-moves onto the
    draft via the existing `onChange(Partial<CalcPokemonState>)` merge
    setter - no new state-setter plumbing needed since `moves` is already
    part of `CalcPokemonState`. `autoFillRequestRef` (an incrementing
    counter) guards against a slower now-stale fetch clobbering a faster
    one if the user swaps species again before the first resolves. Reuses
    the exact same usage-data source/cache as the Battle Logger's "Likely
    Set" stat-inference popover (`services/championsBattleData.ts` via
    `useGameData.ts`) - no new data layer. If a species has no Champions
    usage page, `getChampionsUsage` resolves `null` and auto-fill is a
    silent no-op (species selection itself still applies normally). Runs
    unconditionally even when the species also has saved sets (the
    saved-set popover still opens too) - auto-fill gives an immediate
    starting point, picking a saved set from the popover overrides it.
  - **Export**: new `utils/calcExport.ts::calcStateToShowdownPokemon` -
    the inverse of the existing `calcTeamImport.ts::teamPokemonToCalcUpdates`
    - maps `CalcPokemonState` to a `ShowdownPokemon` (`sps` copies directly
    into `evs`, no /4 or *4 conversion, matching `calcTeamImport.ts`'s own
    note on why this app's EVs field is SP-native). Two new buttons on each
    `CalcPokemonPanel.tsx` title row (disabled until a species is picked):
    "Copy Text" formats it via the existing `services/parser.ts::
    formatShowdownText` and writes to the clipboard (same
    copy-with-timed-confirmation pattern as `ExportTeamModal.tsx`); "Save
    Set" runs it through `services/pokeapi.ts::enrichPokemonWithAPI` (using
    `databaseState`'s PokeAPI cache getter/setter, same as
    `CalcSavedSetsModal.tsx`'s own import path) and adds the result to
    `useSavedPokemon.ts`'s store via `addSavedPokemonBatch([enriched])`
    (a single-element batch, since that hook has no single-add function -
    see its own doc comment on why batching exists).
  - **Verified live** (run-desktop skill): selected Incineroar from the
    species dropdown and confirmed real Champions usage data landed -
    Sitrus Berry / Intimidate / Careful nature / a 32/0/32/-/-/0-ish real
    Stat Point spread / Fake Out+Flare Blitz+Parting Shot+Darkest Lariat.
    "Copy Text" produced correct Showdown-format text on the clipboard;
    "Save Set" added a real entry to the Saved Sets store (confirmed via
    the Saved Sets modal showing "Incineroar - Lv50", count 1) - deleted
    afterward to avoid leaving test data in the user's real saved-sets
    library. `npm run type-check` and `npm run lint` both clean.

- **2026-07-19 manual-testing batch, quick-wins pass (items 1/3/4/6/8)**:
  fixed 5 of the 9 scoped items from the same-day testing batch (see
  TODO.md for the other 4, still open).
  1. **Empty team creation**: `ImportTeamModal.tsx`'s Import flow now
     accepts a blank paste box - parse/enrich is skipped entirely and
     `onImport` is called with `pokemon: []`, with the footer button
     relabeling to "Create Empty Team" when the paste area is empty.
  2. **Calc regulation now defaults to Settings' Default Regulation**:
     `useDamageCalc(gameDataState, defaultRegulation)` takes the initial
     `regulationId` as a real parameter instead of hardcoding `'REG-MA'`;
     `CalcPage.tsx` now receives `settingsState` (threaded from `App.tsx`)
     and seeds it via `toRegulationId(settingsState.settings.defaultRegulation)`,
     matching how Import Team already worked. Verified live: setting Reg
     M-B in Settings and opening Calc showed Reg M-B active immediately.
  3. **Calc Speed now factors in weather-boosting abilities**: the
     justifying comment on `computeBoostedStats`/`computeEffectiveSpeed`
     claiming "the field state doesn't track which Pokemon's ability is
     active" was stale - `state.ability` and `field.weather` were both
     already tracked and used elsewhere in the same hook. Added a
     `WEATHER_SPEED_ABILITIES` table (Swift Swim/Chlorophyll/Sand Rush/
     Slush Rush) and threaded `field.weather` into both functions, applied
     before paralysis-halving to match real modifier ordering. Verified
     live: Sharpedo w/ Swift Swim went from 115 Spe (no weather) to 230 Spe
     (Rain) - a clean double.
  4. **Rotom formes + the already-documented Palafin bug, fixed together**
     (same root cause class): `utils/pokemonRules.ts`'s legal-species list
     only had bare `'rotom'` and bare `'palafin'`, but PokeAPI's actual
     `/pokemon` roster only exposes `rotom-heat/-wash/-frost/-fan/-mow` as
     separate resources (base `rotom` also stays legal on its own) and
     *only* `palafin-zero`/`palafin-hero` (no bare `palafin` resource at
     all) - so `validateSpeciesLegality` was silently rejecting all of
     them. Added the 5 Rotom formes and swapped `'palafin'` ->
     `'palafin-zero'` (Palafin-Hero deliberately excluded, same treatment
     as Mega forms, since it's a battle-only transformation not a
     team-building choice). Also fixed a second, previously-undiscovered
     instance of the identical bug in the Import path:
     `services/pokeapi.ts::normalizeSpeciesForAPI` had no entry for bare
     "Palafin" (what Showdown/Pokepaste exports always say), so importing
     a team with Palafin on it would have 404'd against PokeAPI's
     `/pokemon/palafin` - added a `'palafin': 'palafin-zero'` mapping
     alongside the existing identical Aegislash-shield precedent. Verified
     live via the Teams-page species picker: searching "rotom" now returns
     all 6 rows, searching "palafin" now returns `Palafin-Zero` (previously
     "No legal species found").
  5. **Hidden Power / Secret Power no longer appear as selectable moves.**
     Root cause was deeper than expected:
     `services/pokeapiService.ts::fetchSpeciesLearnset` was taking a
     species' entire *all-time* PokeAPI movepool (every move learned across
     every game since Gen 1, unfiltered by version group) as the base
     learnset - not just its Scarlet/Violet-era moves, which is how two
     pre-Gen-9 TM/tutor moves neither in SV nor Champions were leaking into
     every move picker app-wide. Investigating the right filter surfaced a
     genuinely new finding: **PokeAPI now has a real `champions` version
     group** (id 32, gen IX) - not documented anywhere in this codebase,
     since it didn't exist when the hand-maintained Champions-data system
     here was built. Confirmed live: a `champions` pokedex (208 species,
     `/api/v2/pokedex/36`) and real per-species move tagging (Sharpedo's
     `champions`-tagged moves correctly exclude both Hidden Power and
     Secret Power). `fetchSpeciesLearnset` now filters to `champions`-
     tagged moves when present, falling back to the untouched all-time list
     for species PokeAPI hasn't back-filled yet (confirmed incomplete -
     e.g. Gholdengo currently has zero `champions`-tagged moves). Also
     added `'hidden-power'`/`'secret-power'` to
     `championsMovepoolChanges.ts`'s existing `GLOBALLY_REMOVED_MOVES`
     (previously just `['tera-blast']`) as a defense-in-depth safety net,
     since that list is applied at the read boundary and self-heals against
     already-cached stale learnsets immediately, without waiting on the
     fetch-level fix or a 30-day cache expiry. Verified live against a
     species (Furfrou) with an already-cached, pre-fix, stale learnset
     known to include Hidden Power - its real move picker (156+ options
     rendered) now shows zero Hidden Power/Secret Power matches. **The
     `champions` version-group finding itself is not fully explored** -
     logged as its own TODO.md item since it could mean a large hand-
     maintained system (`utils/pokemonRules.ts`'s legal-species lists,
     `config/championsMovepoolChanges.ts`'s per-species diffing) is
     partially redundant now, which is a bigger, riskier change the user
     explicitly deferred rather than folding into this fix.

  All 5 changes verified via a live `run-desktop` pass (not just type-check/
  lint, both also clean): created and deleted a disposable "Team 1", used
  its Add-Pokémon picker to confirm the Rotom/Palafin fix and to add
  Furfrou for the Hidden-Power/Secret-Power check, flipped Settings'
  Default Regulation and confirmed Calc picked it up, and drove the Calc's
  species/ability/weather inputs directly to confirm the Speed-doubling
  math. Real user data (3 existing teams, `settings.json`,
  `game-data-cache.json`) was untouched - disposable team deleted and the
  regulation setting restored to its original value afterward.

- **Mac build verified working end-to-end** (2026-07-18): first real
  verification since the Mac environment came back online (16 commits had
  landed on `main` while off it - Settings page, sync/worker backend, team
  sheet PDF export, team export images, saved Pokémon sets, auto-update
  checks). Pulled clean, ran `npm install` (dependency set changed, 0
  vulnerabilities), then drove the app via the `run-desktop` skill across
  Teams/Battle Log/Calc/Statistics/Settings with no console errors or page
  exceptions - real data loaded correctly on every tab (2 teams, 1 logged
  battle, saved Calc sets, 100% win rate on Statistics). Then built a real
  packaged Mac app for the first time (`npm run dist:mac`, then
  `electron-builder --mac --universal` for arch coverage) - both produced
  a working `.dmg`/`.zip`; superseded arm64-only artifacts were deleted
  once the universal build was confirmed good, per user request. Still
  unsigned/unnotarized (no Apple Developer account set up yet, despite the
  user having one available - Gatekeeper will warn/block until that's
  done). `release.yml`'s `build-mac` CI job was updated to
  `--mac --universal --publish always` so future tag-triggered releases
  produce the same universal coverage automatically, rather than
  arch-default (arm64-only on the `macos-latest` runner). The locally-built
  universal `.dmg`/`.zip` (plus their blockmaps and `latest-mac.yml`) were
  then uploaded by hand to the existing `v0.2.1` GitHub Release, so it now
  carries both Windows and Mac assets side by side - no new version tag
  needed since no source changed, only docs/CI. Getting the upload done
  required setting up git/GitHub auth on this Mac for the first time: SSH
  push via the user's existing 1Password SSH-agent integration (`~/.ssh/
  config`'s `IdentityAgent` already pointed at 1Password's agent socket;
  just needed GitHub's host key added to `known_hosts` and 1Password's
  agent unlocked/permitted), and a portable `gh` CLI binary (downloaded
  directly from a GitHub release zip into `~/.local/gh-cli`, no Homebrew/
  sudo available on this machine) authenticated via `gh auth login --web`
  device-code flow for the release-asset upload itself.

- **Battle Logger stat-inference, Phase 3 (partial): wider empirical species
  coverage** (2026-07-16): the second of Phase 3's three polish items - TTL
  tuning is still open, deferred by explicit user choice to tackle one item
  at a time. `services/championsBattleData.ts`'s own doc comment previously
  cited species like Iron Hands, every Paradox, Ogerpon, Tapus, Ursaluna,
  Mr. Mime, Indeedee, and Oinkologne as examples of an expected "no
  Champions page" gap - a genuinely misleading picture, since none of those
  are even reachable through the opponent species picker in the first place
  (`SpeciesPickerCard.tsx` filters through `validateSpeciesLegality`, so
  only `utils/pokemonRules.ts`'s Reg M-A/M-B legal roster is ever
  selectable). The real coverage question is how much of that ~227-species
  *legal* roster actually has Champions data - checked empirically with a
  one-off script (not part of the app) fetching the live `/api/index` and
  cross-referencing every legal slug. Found 21 misses from the *existing*
  matching logic (a plain name/slug equality check), none of them a genuine
  absence - all 21 were resolvable once the right lookup was tried, so 3
  fixes went into `resolveChampionsBattleName`:
  1. **Regional-form prefix rewrite** (15 species: Alolan Raichu/Ninetales,
     Galarian Slowbro/Slowking/Stunfisk, Hisuian Arcanine/Typhlosion/
     Samurott/Zoroark/Goodra/Avalugg/Decidueye, all 3 Paldean Tauros
     breeds) - Champions' own site uses a PREFIX convention ("Alolan
     Ninetales", slug "alolan-ninetales"), the opposite of this app's
     PokeAPI-inherited SUFFIX convention ("Ninetales-Alola"), so a plain
     match can never find them. `rewriteRegionalFormSlug` retries with the
     prefix form after a direct match fails. Tauros's 3 breeds needed a
     special case even among regional forms (site puts the region as a
     prefix AND appends "-breed": "paldean-tauros-combat-breed") - verified
     live that all 3 breeds' own `battleName` collapses to one shared
     "Paldean Tauros Aqua Breed" dataset regardless of which breed is
     queried (a real site-side data-modeling choice, not a bug).
  2. **Canonical-form overrides** (Vivillon, Florges, Furfrou, Palafin,
     Aegislash) - species this app only ever stores as one specific
     form/state, but whose Champions page for that exact bare name doesn't
     exist: the site only pages one "canonical" specific forme (Vivillon
     Fancy Pattern, Florges Red Flower, Furfrou Natural Form, Palafin Zero
     Form, Aegislash Shield Forme), with every other cosmetic-pattern/trim/
     battle-only-state forme's own page just pointing its `battleName` back
     to that same canonical one. `CANONICAL_FORM_SLUG_OVERRIDES` maps each
     directly. Aegislash needed 3 keys, not 1 - live-testing (not just the
     research script) caught that the opponent species picker
     (`useSpeciesRoster`, PokeAPI's own per-forme naming) actually stores it
     as "Aegislash-Shield" (confirmed via `battles.json`), not bare
     "Aegislash" as an initial pass assumed purely from
     `utils/championsStats.ts::resolveCalcSpecies`'s documented quirk for a
     *different* code path (Showdown-parsed team data) - a good reminder
     that the research script's static analysis alone would have shipped a
     fix that silently didn't work for the picker's actual real-world
     value. The picker also separately offers "Aegislash-Blade" as its own
     selectable row, so that got its own key too.
  3. **Meowstic's "-Male" suffix strip** - Champions has no distinct
     male-form page for Meowstic (its bare/default page already *is* the
     male form, only "Meowstic Female" gets a page of its own), unlike
     Basculegion, which does have its own distinct "Basculegion Male" page.
     Deliberately the last fallback tried and gated on every earlier
     attempt failing, so it can't mis-fire on Basculegion-Male's own
     already-correct direct match.
  Final verified coverage: 227/227 (100%) of the real, reachable Reg M-B
  roster resolves correctly - the earlier "expect frequent misses" framing
  in the file's doc comment was replaced with this accurate picture.
  Live-verified via `run-desktop` against a disposable test battle: added
  Ninetales-Alola, Aegislash-Shield, Vivillon, Florges, and Furfrou as
  opponents, confirmed all 5 Likely Set triggers appeared (none did before
  the fix - only Ninetales-Alola showed after the regional-form rewrite
  alone, since Aegislash-Shield's picker-specific key hadn't been added
  yet), and confirmed Aegislash-Shield's popover showed real, sensible data
  (Stance Change 100% ability, Leftovers/Spell Tag/Life Orb items, King's
  Shield/Shadow Sneak/Iron Head/Poltergeist moves, Adamant/Brave natures,
  real Stat Point spreads). Test battles cleaned up afterward. Surfaced one
  unrelated bug along the way, not fixed in this pass since it's a
  different subsystem (the roster/legality pipeline, not this feature) -
  see TODO.md: Palafin can't be added as an opponent at all right now (the
  species picker's legality filter silently rejects whatever string
  `useSpeciesRoster` actually produces for it).

- **Battle Logger stat-inference, Phase 3 (partial): loading-state
  treatment** (2026-07-16): the first of Phase 3's three polish items -
  wider empirical species coverage and TTL tuning are still open, deferred
  by explicit user choice to tackle one at a time rather than all at once.
  `OpponentLikelySetsTrigger` (`OpponentRowFields.tsx`) previously rendered
  nothing at all while its `getChampionsUsage` fetch was in flight, then
  popped straight to the real amber trigger (or stayed invisible) once it
  resolved - fine for the common case (a cache hit, or the site's `/api/
  index` already warmed by an earlier species this session, both resolving
  in a handful of milliseconds) but silent for a genuinely slow first fetch
  too. Added a three-state `'pending' | 'checking' | 'done'` status: a
  `USAGE_CHECK_SKELETON_DELAY_MS` (150ms) timer only flips to `'checking'`
  (rendering a muted gray/dashed/`animate-pulse` skeleton, same text and
  footprint as the real button so there's no layout jump when it resolves)
  if the fetch is still pending once the delay elapses - a fetch that
  settles before 150ms never shows anything extra at all, identical to
  pre-Phase-3 behavior, so the common fast path stays exactly as quiet as
  the "a guess that adds nothing never earns screen space" design principle
  wants. Needed one real fix along the way: an initial attempt reset
  `status` to `'pending'` synchronously at the top of the fetch effect,
  which `react-hooks/set-state-in-effect` correctly flagged - `gameDataState`
  is a fresh object every render (not memoized), so that effect actually
  re-fires on nearly every parent re-render, not just on an actual species
  change, and would have flickered the trigger back to invisible
  constantly. Fixed with the same render-time-derived-state pattern
  `OpponentItemCell` above it already uses for an analogous problem: a
  `checkedSpecies` state compared during render, only resetting `status`/
  `usage` when the species has actually changed.
  Live-verified via `run-desktop` with an async polling `eval` (snapshots
  every ~15ms) against two real opponents in a disposable test battle:
  Kingambit (already cached from Phase 1/2 testing) went straight to the
  real button with no skeleton frame ever observed, confirming the fast
  path stays flicker-free; a not-yet-cached Incineroar showed no element
  for ~100ms, then the gray pulsing skeleton from ~110ms-386ms, then
  cleanly swapped to the real amber button once the live fetch resolved
  around 419ms - exactly the intended sequence. Test battles cleaned up
  afterward (back to "No battles logged yet.").

- **Battle Logger stat-inference, Phase 2: Item/Moves/Nature/Stat Points
  sections** (2026-07-16): extends Phase 1's Ability-only "Likely Set"
  popover (see below) with the remaining four categories the data layer
  already fetched and cached but never surfaced -
  `services/championsBattleData.ts`/`GameDataCache.usage` needed no changes
  at all, this was purely a UI wiring pass over existing data.
  `LikelySetsPopover.tsx` gained Item/Moves/Nature/Stat Points sections
  mirroring the existing Ability section's layout (name + percentage row,
  top-3 for Ability/Item/Moves, top-2 for Nature/Stat Points since those
  lists get long fast); Nature rows format as `"Adamant (+Attack/-Sp.
  Atk)"` from the API's own `statUp`/`statDown` fields, Stat Points rows as
  `"32 HP / 32 Atk / 2 SpD"` (a new `formatStatSpread` local to the popover
  - reuses the same abbreviated-label convention as `StatsColumn.tsx`, but
  couldn't reuse `utils/statAlignment.ts::formatStatAlignment` directly
  since that operates on `EVSpread`'s full-word keys `attack`/`defense`/etc.
  while `ChampionsUsageStatSpreadEntry.points` uses `@smogon/calc`-style
  abbreviated keys `atk`/`def`/etc.). Widened the popover `w-48` → `w-56` to
  fit the extra content.
  `OpponentRowFields.tsx`'s `OpponentLikelySetsTrigger` visibility logic
  changed from Phase 1's single `opponent.ability` check (the whole trigger
  hid once ability was confirmed, since v1 had nothing else to suggest) to
  checking all five categories independently: Ability/Item hide their own
  section once `opponent.ability`/`opponent.item` holds any value (matching
  the existing "confirmed = any value, not a value match" convention every
  other real-field check in this file already uses); Moves filters out
  individual suggestions already present in `opponent.moves`
  (case-insensitively - moves are a freeform, dedup-on-add growable list,
  not a single confirmed slot, so the section itself never hides, just
  shrinks) rather than hiding the whole section on any one move being
  logged; Nature and Stat Points never hide on their own since
  `OpponentPokemonEntry` has no real field for either to compare against -
  explicitly out of scope per the existing TODO.md note ruling out adding
  `nature`/`evs` fields to that type. The trigger button itself now shows
  whenever *any* of the five categories still has something unconfirmed to
  suggest, rather than disappearing the moment ability alone is confirmed.
  Live-verified end-to-end via `run-desktop` against disposable test
  battles (cleaned up after, same exact-ID-delete-via-UI approach as Phase
  1 - this session's own 7 test battles only, "No battles logged yet."
  confirmed empty again afterward): added Kingambit as an opponent, opened
  the popover and confirmed all five sections rendered with real live data
  (Defiant 94.4%/Item Black Glasses 37.3%/Sucker Punch 99.2%/Adamant
  (+Attack/-Sp. Atk) 85.6%/32 HP-32 Atk-2 SpD 15.6%, "Season M-3"); set the
  real ability to Defiant and confirmed only the Ability section vanished
  from the popover while Item/Moves/Nature/Stat Points stayed; separately
  logged Sucker Punch as a real move and set a real item, confirmed the
  Item section disappeared entirely and Moves' suggestion list dropped just
  the now-confirmed Sucker Punch row while Kowtow Cleave/Iron Head/Protect
  stayed. Phase 3 (polish - loading-state treatment, wider empirical species
  coverage, TTL tuning) is 2/3 done, see above and `TODO.md`.

- **Battle Logger stat-inference, Phase 1: "Likely Set" suggestion panel**
  (2026-07-16): a long-open TODO idea (surface what a species' opponent is
  *typically* running, from real ranked-ladder data, while logging a live
  match) finally had a legitimate data source - `championsbattledata.com`
  exposes a public, unauthenticated, CORS-enabled JSON API
  (`/api/battle/Doubles/:name`) built from real Pokémon Champions ranked
  play. Verified live before building anything: species-name normalization
  must go through the site's own `/api/index` `pokemonPages[].battleName`
  lookup table (not a hand-rolled slug transform - a different convention
  from PokeAPI's), Champions' roster is materially smaller than mainline SV
  (no page at all for Iron Hands, every Paradox, Ogerpon, Indeedee,
  Oinkologne, etc. - an expected 404, not an error), and there is currently
  no queryable per-season archive (a same-day dated snapshot the site
  exposes as a static asset was confirmed byte-identical to the live data,
  so the `season` query param is never passed). New CLAUDE.md "Fourth
  exception" + README Credits entry authorize this source.
  New `services/championsBattleData.ts` (index lookup + fetch/group-by-
  category), new `ChampionsUsageEntry`/`ChampionsUsageRankedEntry`/
  `ChampionsUsageNatureEntry`/`ChampionsUsageStatSpreadEntry` types
  (`types/pokemon.ts`) - `stat_points` rows are already on this app's
  native 0-32 Stat Point scale (`utils/championsStats.ts`), no EV-scale
  conversion needed. New `usage` section on `GameDataCache`
  (`utils/cacheManager.ts`'s existing generic `readCacheEntry`/
  `withCacheEntry`/`runCachedFetch` needed only a one-line `CacheSection`
  union extension), 5-day TTL (shorter than PokeAPI sections' 30 days -
  ranked usage shifts week to week). `useGameData.ts` gained
  `getChampionsUsage`/`getCachedChampionsUsage`, mirroring
  `getSpeciesLearnset` exactly - extending the existing hook rather than a
  second one, since a second hook reading/writing the same
  `game-data-cache.json` would race with this one's own write-through.
  Phase 1 deliberately ships only the Ability category (the smallest
  end-to-end vertical slice) via new `OpponentLikelySetsTrigger`
  (`OpponentRowFields.tsx`) + `LikelySetsPopover.tsx`, wired into
  `OpponentFieldPanel.tsx`'s row `extra` slot alongside the existing
  `OpponentExtras`. Deliberately kept visually and structurally separate
  from `OpponentPokemonEntry`'s real `ability`/`item`/`moves` fields (which
  mean "actually observed this battle," with reveal-turn tracking the
  post-battle damage-calc review depends on) - dashed amber-accented
  popover explicitly labeled "Likely Set (unconfirmed)", never auto-filled
  into the real fields, and hidden entirely once the real ability is
  confirmed (nothing left to suggest). Live-verified end-to-end via
  `run-desktop` against a disposable test battle: added Kingambit as an
  opponent, confirmed the popover showed the exact live data verified
  earlier in the session (Defiant 94.4% / Supreme Overlord 5.5% / Pressure
  0.1%, "Season M-3"), then confirmed the trigger disappeared once the real
  ability dropdown was set. Test battles cleaned up afterward via the app's
  own IPC bridge (exact-ID delete, not a blind first-match UI click) after
  a scare mid-verification: the user's real `battles.json` turned out to
  already hold ~60 orphaned "In Progress, 0-1 turn" battles from past
  testing sessions that were never cleaned up - flagged to the user as a
  separate, not-yet-actioned cleanup opportunity, not touched beyond this
  session's own 3 test battles. Phase 2 (Item/Moves/Nature/Stat Points
  sections) is done, see above. Still open (see `TODO.md`): Phase 3
  (polish).

- **VGC Team Sheet PDF auto-fill** (2026-07-16): fills the official Play!
  Pokémon Video Game Team List PDF (bundled as `public/vg-team-list-template.pdf`,
  fetched fresh via `WebFetch` since the byte-level research pass that scoped
  this - see `TODO.md`'s backlog history - hadn't kept a local copy) with a
  saved team's 6 Pokémon plus a one-time Settings-page player profile.
  Coordinate-overlay approach (chosen over redrawing the form from scratch)
  since byte-level inspection confirmed the template has no AcroForm fields
  (`/Widget`/`/FT`/`/Annots`) to fill by name. Coordinates aren't
  hand-measured - `scripts/generateTeamSheetLayout.ts` (new, `pdfjs-dist`
  devDependency) reads the template's own text layer and derives every value
  position as "the matching label's own end-x + a small gap, same y
  baseline", since the form's layout is a label immediately followed by
  blank space on every field; output is `config/teamSheetLayout.generated.ts`
  (regenerate if the template PDF is ever replaced). The one non-measured
  coordinate (Age Division's 3 checkboxes, drawn squares with no text-layer
  presence) is an offset estimate, verified correct via a live render.
  `services/teamSheetPdf.ts::generateTeamSheetPdf` (`pdf-lib`) loads the
  template, embeds Helvetica, and `drawText()`s both pages - deliberately
  skipping the per-stat numeric side-table on page 1 ("For Tournament
  Staff"), which is staff's handwritten field at check-in, not player data.
  New `PlayerProfile` (`types/pokemon.ts`) holds identity fields stable
  across tournaments (Player Name, Age Division, Trainer Name in Game,
  Player ID, Date of Birth, Support ID, Switch Profile Name) in
  `AppSettings.playerProfile`, edited via new `PlayerProfileSection.tsx` on
  the Settings page; `Team` gained `battleTeamNumber`/`battleTeamName`
  (tournament-specific, not stable identity, so edited per-export instead)
  joined into the form's single "Battle Team Number / Name:" blank at
  generation time. New `TeamSheetPdfModal.tsx` (Teams page, per-team export
  button, sibling to the existing Showdown-text and poster-image exports)
  triggers generation and reuses `TeamExportImageModal.tsx`'s existing
  Blob + `<a download>` pattern - no IPC/main-process changes needed.
  `TeamPosterTile.tsx`'s local `formatEVs()` was extracted to
  `utils/statAlignment.ts::formatStatAlignment()` so both the poster export
  and the PDF export share one "Stat Alignment" formatter. `pdf-lib` was
  initially a static import reachable from `TeamCard.tsx`'s always-loaded
  bundle, pushing the main chunk to 758kB and tripping the build's 550kB
  warning (see the `chunkSizeWarningLimit` entry below) - fixed by dynamic-
  importing `generateTeamSheetPdf` inside the modal's download handler, which
  splits `pdf-lib` into its own on-demand chunk and dropped the main bundle
  back to 333kB with no warning. Verified two ways: a live `run-desktop`
  render (via a dynamically-imported service call + an in-page `<embed
  type="application/pdf">`, since Electron blocks top-frame navigation to
  `data:` URLs) visually confirmed every field's alignment including the Age
  Division checkbox mark and the split Date of Birth boxes, and a follow-up
  automated pass re-extracted the filled PDF's own text layer to confirm
  every one of 28 test values landed on both pages at the exact expected
  baseline with none missing - no manual data mutation was needed for either
  check (all-literal test data through a dynamically-imported module, no
  real team/settings touched). README.md's Credits section gained an entry
  for the bundled template per the project's external-asset-source rule.
  **Follow-up bug, caught by the user immediately after shipping**:
  `PlayerProfileSection.tsx`'s fields originally committed on every
  keystroke (`onChange` -> `updateSettings()`, an async IPC + disk write
  whose result feeds straight back into the input's `value` prop) - fine
  for plain text inputs, but this fights `<input type="date">`'s internal
  per-segment typing buffer and can visibly scramble it mid-entry (typing a
  full 8-digit date could land as a garbled, unrelated date). Fixed by
  switching every field to the same local-draft/commit-on-blur pattern
  `TeamCard.tsx` already uses for its name/author/notes fields, instead of
  committing per keystroke. Verified via `run-desktop` with proper
  `element.focus()` (its default `click` helper uses `element.click()`,
  which doesn't actually focus this widget - `document.activeElement`
  stayed on `<body>` - so an earlier same-session repro attempt using
  `click` produced a real-looking but methodologically-unreliable result);
  with real focus, typing a full date now lands exactly right. Regrettably
  live-tested directly against the user's real settings.json before the
  fix (there's no disposable-Settings equivalent of a disposable battle/team
  to test against) - corrupted their real Date of Birth value with no way to
  recover the original, since `SyncPayload` doesn't carry `AppSettings`; the
  user re-entered it by hand after confirming the fix.
  **Second follow-up, content accuracy issues caught by the user reviewing
  real output**: (1) Species for the four gender-divergent species
  (Basculegion/Indeedee/Meowstic/Oinkologne) now always gets an explicit
  "-M"/"-F" suffix on the PDF - this app's own storage convention leaves the
  *male* form bare ("Basculegion", not "Basculegion-M" - only the female
  form gets a baked-in suffix, see `GENDERED_FORM_VARIANTS` in
  `config/pokemonRules.ts`), which reads fine everywhere else in the app
  (a separate gender icon/toggle already shows it) but fails the sheet's
  own "must be listed exactly as they appear in the Battle Team" rule.
  New `config/pokemonRules.ts::formatSpeciesWithGenderSuffix()` fixes this
  for the PDF only - general form suffixes (Rotom-Wash, Sinistcha's forms,
  etc.) were already passed through untouched and didn't need a fix, verified
  by checking `showdownData.species` is never rewritten anywhere in the
  import/enrichment pipeline. (2) Stat Alignment now holds only the Nature
  name (e.g. "Adamant"), not the old EV-breakdown string - that was
  `formatStatAlignment()`'s poster-export format bleeding into a field
  that's supposed to be nature-only on the real form. (3) The per-Pokémon
  numeric stat side-table on page 1 - originally deliberately left blank
  (assumed staff's handwritten field) - is now filled with each Pokémon's
  real computed stats (level 50, max IVs, Nature, Stat Points*4 as EVs),
  reusing `@smogon/calc`'s own math via a newly-shared
  `utils/championsStats.ts` (extracted from `useDamageCalc.ts`'s
  previously-local `spsToEvs`/`MAX_IVS`, now imported by both, avoiding a
  second, potentially-drifting copy of the SP->EV conversion).
  `scripts/generateTeamSheetLayout.ts` was extended to also locate the
  stat-table's own label positions (previously deliberately excluded).
  (4) `TeamSheetPdfModal.tsx`'s Battle Team Name field now defaults to the
  team's own builder name (`team.name`) instead of blank, still fully
  editable/overridable before generating. Verified live via `run-desktop`
  with synthetic data only (no real teams/settings touched this time): a
  hand-calculation of the real stat formula for a maxed-Atk/HP Adamant
  Metagross matched the PDF's own printed numbers exactly (HP 171/Atk 188/
  Def 151/etc.), and a Basculegion-M vs. Basculegion-F comparison confirmed
  the two formes' genuinely different base stats both resolve correctly
  once the species string matches this app's real storage convention (the
  first repro attempt used an unrealistic bare "Basculegion"+gender pairing
  for both and got identical stats for both - a test-data mistake, not a
  real bug, caught by rerunning with the actual stored-string convention).
  **Third follow-up, polish requested after reviewing real output**: font
  sizes bumped across the board (`PER_MON_FIELD_SIZE` 7->9,
  `HEADER_FIELD_SIZE` 8->10 in `scripts/generateTeamSheetLayout.ts`) for
  legibility, and the stat-table numbers now draw centered in their box
  instead of left-aligned immediately after the label - every other field
  reads naturally left-aligned right after its label (matches
  "handwriting on a line"), but a 2-3 digit number flush against "Sp.
  Atk"/"Sp. Def" (the widest stat labels) looked lopsided in a box with
  plenty of room after it. New `TeamSheetFieldPos.x` semantics for stats
  only (a column-wide center anchor, one shared x per column so the 6
  numbers stay vertically aligned regardless of each row's own label
  width - not per-row, which would stagger slightly) plus
  `teamSheetPdf.ts::drawCentered()`, which offsets by the specific
  number's own rendered width (`font.widthOfTextAtSize`) at draw time
  since "8" and "162" aren't the same width. The box's own right edge
  isn't exposed anywhere in the PDF's text layer (checked - no vector
  rect/line ops either, `getOperatorList()` only returned per-page clip
  regions, not per-cell borders), so it's a visually-calibrated constant
  (`STAT_BOX_RIGHT_EDGE_A`, colB derived from it via the same colA->colB
  shift as the "Pokémon" label, not hardcoded separately) - verified
  correct afterward by extracting the actual filled PDF's own text
  positions rather than trusting a screenshot (a compressed, tiny-text
  screenshot crop briefly looked like the number was overlapping the "HP"
  label; exact text-layer coordinates showed a clean 24pt gap on one side
  and 13pt from the box edge on the other - the screenshot read was a
  misperception, not a real bug).
  **Fourth follow-up**: (1) stat numbers were still vertically top-heavy in
  their cell - they'd been drawn at the label's own baseline, which sits
  near the cell's top edge, not centered in the full cell height below it.
  Fixed by deriving each cell's real height directly from the label grid's
  own row-to-row spacing (HP's cell bottom is exactly where Atk's label
  sits, so that gap - not a second guessed constant - is the cell height)
  and shifting the value's baseline down by half of it plus a small
  baseline/cap-height nudge. (2) Aegislash's stats were wrong (or
  presumably blank/failing) because `@smogon/calc` has no bare "Aegislash"
  species entry at all - only `Aegislash-Blade` (its dex's "base" record)
  and `Aegislash-Shield`, two very different stat spreads (confirmed
  directly: Def 176 vs. 86, Atk 70 vs. 160 for the same EVs) - and this
  app's own storage convention is always bare "Aegislash" (Shield is its
  default/roster appearance; Blade is a temporary in-battle Stance Change
  state, same category as a Mega Evolution reverting after battle). The
  exact same quirk was already independently documented twice elsewhere
  (`services/pokeapi.ts`'s `normalizeSpeciesForAPI`, a code comment in
  `utils/pokemonRules.ts`'s legality list) but never applied to
  `@smogon/calc` species lookups specifically. New
  `utils/championsStats.ts::resolveCalcSpecies()` fixes it at the one
  shared choke point both `teamSheetPdf.ts` and `useDamageCalc.ts`
  construct a `@smogon/calc` `Pokemon` from - the Calc page's own species
  picker only ever stores real dex entries so it was never directly
  affected, but loading a team's Aegislash via its "Load from Team" tray
  (`calcTeamImport.ts`, which copies a team's stored species as-is) hit the
  identical bug, unreported but real - fixed at the same time since it's
  the same root cause and the same fix location. Verified by computing
  `Aegislash-Shield`'s `rawStats` directly and confirming the PDF's printed
  numbers matched exactly (151/70/176/63/177/80).
  **Fifth follow-up, two more bugs caught after the previous round shipped**:
  (1) Aegislash's species now reads "Aegislash (Shield)" on the sheet, not
  just "Aegislash" - the previous round fixed the stat *math* but gave no
  visible indication of which of Aegislash's two very different stat
  spreads the printed numbers came from. (2) The Age Division checkbox mark
  was landing in the wrong box - reproduced and finally properly diagnosed
  this time by rendering the actual template to a `<canvas>` via
  `pdfjs-dist`'s own `page.render()` (dynamically imported straight from
  its `node_modules` path in the running dev app) and cropping in on just
  that row, since every other approach tried and abandoned this session
  (Electron blocks top-frame navigation to `data:`/`blob:` URLs for a PDF
  `<embed>`, its internal viewer isn't reachable via DOM queries for
  scrolling/zooming and reloading its `src` with a new `#zoom=` fragment
  produced a blank page, and CSS `transform: scale()` cropping via negative
  offsets never lined up) - only the canvas render, being fully
  script-controlled with no viewer-UI intermediary, gave a reliable close-up.
  That crop showed the real bug directly: each checkbox sits in the gap
  *after* its own label (before the next one starts), not before it as the
  very first pass here had assumed and then never re-verified once other
  things started looking visually plausible - so a "Masters" mark at
  `masters.x - 10` was landing in the gap between Seniors and Masters,
  which is actually Seniors' own box. Fixed by dropping the special
  `CHECKBOX_OFFSET_X` entirely and reusing the same `value()` helper (label
  end + small gap) every other field on this form already uses - checkboxes
  turned out to follow the exact same convention, not a special case.
  Effect/Blocked redesign)** (2026-07-16): logs how many hits actually
  connected for Bullet Seed/Population Bomb/Triple Axel/etc.
  `scripts/generateMultiHitMoves.ts` (new, mirrors the existing
  `generateMoveFlags.ts` pattern) extracts every Gen 9 multi-hit move's hit
  range straight from `@smogon/calc`'s bundled Showdown movedex - the same
  data source already trusted for move flags - into
  `config/multiHitMoves.generated.ts` (31 moves). The thin wrapper
  `config/multiHitMoves.ts::getMultiHitRange` normalizes a `multihit`
  fixed-count-with-`multiaccuracy` move (Triple Kick/Axel, Population Bomb -
  each hit rolls its own accuracy) down to `{min: 1, max}` rather than
  treating the max as a guaranteed count, since any hit after the first can
  independently miss; every other multi-hit move gets its real min (a
  single accuracy check covers the whole flurry). Beat Up is deliberately
  excluded - its hit count is dynamic (one per uninflicted/unfainted/
  non-status teammate), not a static range. `types/pokemon.ts`'s
  `BattleAction` gained `hitsLanded?: {pokemonId, hits}[]`, same per-target
  shape as `outcomes`; `useBattleLogActions.ts::setActionHitsLanded` sets/
  clears it, and `setActionTargetOutcome` now also strips a target's
  `hitsLanded` entry whenever its outcome is set to miss/no-effect/blocked
  (0 hits landed either way, so the two fields can't disagree).
  `MoveOutcomePrompt.tsx` shows a "Hits: N" button row per target
  (`hitRange.min`-`hitRange.max`) whenever the logged move is multi-hit and
  that target isn't already tagged miss/no-effect/blocked; `TurnLog.tsx`
  renders the confirmed count read-only as "(xN hits)". Live-verified via
  `run-desktop` end-to-end with a disposable team/battle (Cacturne w/
  Bullet Seed, Rillaboom w/ Population Bomb vs. a Venusaur opponent):
  Bullet Seed's picker rendered exactly buttons 2/3/4/5, Population Bomb's
  rendered exactly 1-10, and picking 7 for Population Bomb persisted and
  rendered as "Rillaboom used Population Bomb on Venusaur (x7 hits)" in
  the turn log; the disposable battle and team were deleted afterward,
  confirmed via `teams.json`/`battles.json` back to only the real data.
  (One process note from the live-testing pass, not a product bug: firing
  two `RosterRow` "bring" clicks as fast sequential driver commands can
  still race off a stale `battle` closure the same way `revealBlockingAbility`'s
  header comment already describes for a different action - waiting for
  each click's DOM confirmation before the next avoided it. Not a code
  defect to fix, just a note for scripting future live tests through this
  same click-to-log flow.)

- **Battle Logger: ability-based blocking (part 2 of the Miss/Crit/No
  Effect/Blocked redesign)** (2026-07-16, resumed from a prior session's
  scoping/research pause - see COMPLETED.md's earlier "Record scoping
  analysis for ability-based blocking" entry below for the architectural
  findings this built on): `config/moveBlockingAbilities.ts` (new file)
  holds the researched move-blocking-ability table (type-immunity,
  status-category, and explicit move-list rules), Bulbapedia-primary/
  Serebii-cross-checked per this project's source-verification convention.
  `MoveOutcomePrompt.tsx`'s per-target row now shows an unrevealed-ability
  picker (`UnrevealedAbilityPicker`, reusing `OpponentRowFields.tsx`'s
  `getEnrichedSpeciesOptions` species-legal-ability lookup and its
  now-exported `formatAbilityName`) whenever the move being logged could
  plausibly be blocked by one of the target's legal abilities but the real
  one isn't known yet; picking one reveals the ability and sets the outcome
  to Blocked atomically via a new combined action,
  `useBattleLogActions.ts::revealBlockingAbility` (bundles the
  `opponentRoster` and `turns` patches into one `updateBattle` call - an
  earlier version fired `updateOpponentMoveTags`+`setActionTargetOutcome`
  as two sequential calls, which raced off the same stale `battle` closure
  and silently dropped the ability reveal; caught via live testing, not
  code review, and fixed by following `appendAction`'s own established
  "bundle into one `updateBattle` call" pattern - see that function's
  header comment in `useBattleLogActions.ts`). Live-verified end-to-end via
  `run-desktop`: a disposable battle with Gholdengo (whose only legal
  ability is Good as Gold) as the opponent, Incineroar's Parting Shot
  logged against it, confirmed the picker offered exactly "Good As Gold"
  and that picking it persisted both the ability reveal
  (`abilityRevealedOnTurn` set) and the Blocked outcome together; the test
  battle was deleted afterward. Sap Sipper/Storm Drain/Lightning Rod/Motor
  Drive (the 4 pure stat-stage-boost absorb abilities) were added as new
  rows directly to the *existing* `config/hitReactiveAbilities.ts` table
  instead of a new mechanism - they already fit that file's
  `trigger`/`changes` shape (same pattern as Justified/Stamina), and their
  existing per-slot "apply this ability's hit-triggered stat change" chip
  on `BattlefieldSlot.tsx` needed no changes at all to pick them up. Volt
  Absorb/Water Absorb/Flash Fire/Dry Skin (heal HP or buff move power,
  which this app's stat-stages-only model can't express) fall back to a
  plain Blocked tag via the new table, as scoped.

  **Deliberately excluded this pass** (documented in
  `moveBlockingAbilities.ts`'s own header, not silently dropped): Wonder
  Guard (effectiveness-based block, a genuinely different rule shape, and
  Shedinja is essentially unplayed in real VGC doubles); status-condition-
  immunity abilities (Limber/Insomnia/Immunity/Water Veil/Water
  Bubble/Magma Armor/Purifying Salt/Comatose) - would need reconciling with
  the separate, already-existing "Inflict {Status}?" chip mechanism, not
  done this pass; Aroma Veil/Sweet Veil/Oblivious/Own Tempo (mental-move/
  confusion immunity - untracked data, same reasoning already in
  `hitReactiveAbilities.ts`); Clear Body/White Smoke/etc. (stat-drop
  immunity - needs the auto-apply-before-prompt logic in `logAction` itself
  to check ability first, a deeper change); Dazzling/Queenly Majesty/Armor
  Tail (needs a new `priority` field on `MoveData`); Shield Dust/Battle
  Armor/Shell Armor (don't block the move at all, no gap to fill);
  Telepathy (ally-fire avoidance, a different targeting relationship than
  every other entry here).

  **Known pre-existing, unrelated-to-this-change gap surfaced during live
  testing**: `logAction` auto-applies a move's deterministic stat-drop
  effect (`config/moveStatEffects.ts`) *before* any outcome is confirmed,
  so a status move that both auto-drops a stat (e.g. Parting Shot's
  Atk/SpA -1) and gets Blocked via this new picker still leaves the stale
  auto-applied stat drop in place - the same underlying ordering issue
  already called out for the Clear-Body family above, just visible through
  a different door. Not fixed here (pre-existing, out of this pass's
  scope), but worth knowing before relying on stat stages being accurate
  after a Blocked status move.

- **Teams page polish batch** (2026-07-16, 5 items raised together from a
  manual-testing session):
  1. Team notes (`TeamCard.tsx` expanded view) moved from above the roster
     grid to below it, so the team's visual composition is always the first
     thing seen on expand.
  2. `TeamExportImageModal.tsx`: notes are no longer always baked into the
     exported poster (a long note was stretching the fixed-width grid) -
     now an opt-in "Include notes" checkbox (default off), and when
     included, rendered below the roster grid instead of above it, same
     rationale as item 1.
  3. `TeamExportImageModal.tsx`/`TeamPosterTile.tsx`: added an Open/Closed
     Team Sheet toggle (default Open, matching prior always-shown
     behavior). Closed hides each Pokemon's Stat Alignment line (Nature +
     EV/Stat-Point spread) - confirmed with the user this matches real VGC
     Team Sheets, which never publish Stat Alignment even under Open Team
     Sheet rules (that only covers species/item/ability/moves/Tera). Both
     toggle controls live outside the `posterRef` node so they never get
     rasterized into the exported PNG itself.
  4. Fixed freshly-added Pokemon (via the `+ Add Pokémon` picker or
     swapping a roster slot's species) getting default ability/moves stored
     as raw PokeAPI slugs ("rock-head", "iron-head") instead of display
     text ("Rock Head", "Iron Head"), which failed legality validation
     downstream. Root cause: `useRosterActions.ts::buildSlot` wrote
     `getEnrichedSpeciesOptions`'s move/ability `.name` fields directly into
     `showdownData` without the `toReadableName()` conversion every other
     path into that field already applies (pasted Showdown text is already
     Title Case; `EditOverlays.tsx`'s manual ability/move picker already
     calls `toReadableName` - only this auto-population path was missed).
  5. Auto-detect + correct a specific Showdown-export shape: some export
     tools name a Mega-Evolved set after its Mega form (e.g.
     "Aerodactyl-Mega") rather than the base species holding the Mega Stone
     - not a real standalone species, since Mega Evolution only happens
     in-battle, so a set imported that way failed team validation. New
     `config/megaEvolution.ts::normalizeMegaSpeciesOnImport` strips a
     trailing "-Mega"/"-Mega-X"/"-Mega-Y" species suffix back to the base
     species, but only when the held item is confirmed to be that exact
     species' own Mega Stone (reusing the existing `MEGA_STONE_TO_SPECIES`
     table) - a "-Mega" suffix with no matching stone held is left
     untouched for team validation to flag, not silently guessed at. Wired
     into `services/parser.ts::parseFirstLine`, run before gender-fallback
     resolution so that logic sees the corrected base species too.
     Verified with an ad-hoc parser script (not kept - out of scope for the
     project's checked-in test): confirmed the exact Aerodactyl-Mega/
     Aerodactylite case from the user's report normalizes correctly, a
     Charizardite X case is unaffected (no "-Mega" suffix in that export
     style to begin with), and a mismatched-stone case ("Gengar-Mega" held
     Choice Scarf) is correctly left alone.

- **Battle Logger: inline Miss/Crit/No Effect/Blocked confirmation prompt**
  (2026-07-16) - part 1 of a 3-part redesign the user raised (see TODO.md
  for parts 2-3, not yet started). The user felt the per-slot outcome chips
  (previous entry below) were easy to lose track of, sitting on the
  target's own BattlefieldSlot rather than near the move that was just
  logged, and wanted a prompt that pops up right when the move is used -
  explicitly asking it also account for moves that hit more than one
  target. New `MoveOutcomePrompt.tsx` renders in `Battlefield.tsx`'s banner
  area (same slot as the existing "Choose a target..." banner), one row
  per target, each with its own Miss/Crit/No Effect/Blocked toggles -
  `BattleAction.outcomes` was already keyed per-pokemonId, so multi-target
  support needed no data-model change, just new UI. Required
  `useBattleLogActions.ts::logAction` to start returning the newly-created
  action's id (previously just `Promise<boolean>`) so the prompt can be
  shown immediately without waiting for a re-render to read the id back out
  of `battle.turns` - `appendAction` now accepts an optional pre-generated
  `id`, defaulting to a fresh `crypto.randomUUID()` for every other
  existing caller (verified all 3 `logAction` call sites in
  `Battlefield.tsx` already discarded its return value, so the type change
  was safe). `pendingOutcomes` state is cleared whenever focus moves
  elsewhere (arming a new move, opening the bench picker) so a stale
  prompt for an earlier move can't linger, plus a render-time guard
  (`lastTurn?.actions.some(a => a.id === pendingOutcomes.actionId)`) so it
  auto-hides once the turn advances or the action gets undone. The old
  per-slot chips (`showMissChip`/`showCritChip`/`showNoEffectChip`/
  `showBlockedAbilityChip` in `BattlefieldSlot.tsx`) were deleted entirely.
  Live-verified via `run-desktop`: logged Rock Slide (a spread move) from
  2BourbonRock against 2 active opponents (Snorlax + Gengar), confirmed
  the prompt shows both targets as separate rows, and confirmed setting
  "No Effect" on Snorlax and "Blocked" on Gengar in the same action applied
  independently (turn log read "used Rock Slide on Snorlax (no effect) and
  Gengar (blocked (ability))"). Also hit real UI-automation flakiness
  during verification unrelated to this change (the pre-existing switch-in
  popover flow occasionally raced React's re-render when driven by rapid
  scripted clicks) - worked around with retry-with-delay loops in the test
  script itself, not a product bug.

- **Battle Logger: generic No Effect/Blocked (Ability) outcome chips**
  (2026-07-16) - generalized the existing per-target Miss/Crit toggle chips
  (`BattlefieldSlot.tsx`) to two more outcomes: "No Effect" and "Blocked"
  (ability-blocked, e.g. Levitate/Bulletproof/Soundproof - no ability
  lookup table needed, just a plain manual toggle same as Miss/Crit).
  Widened `BattleAction.outcomes`' `result` union
  (`'crit' | 'miss' | 'no-effect' | 'blocked-ability'`, `types/pokemon.ts`)
  and `setActionTargetOutcome`'s param type
  (`useBattleLogActions.ts`) rather than adding a new field - all four
  outcomes share the same per-target, mutually-exclusive-by-construction
  shape the existing crit/miss array already had. `TurnLog.tsx`'s
  `outcomeLabel` gained the two new cases ("no effect"/"blocked
  (ability)"). Considered adding an ability-immunity lookup table
  (Levitate → blocks Ground, Bulletproof → blocks bullet-flag moves, etc.)
  to auto-detect the "Blocked" case, but scoped that out - research found
  zero existing ability-immunity code anywhere in the codebase to build on,
  and the TODO's own framing ("generic lightweight outcome tags") called
  for a manual tap same as the other three, not a new auto-detection
  subsystem. Live-verified via `run-desktop`: logged a real move
  (Throat Chop) targeting an opponent Snorlax, confirmed all 4 chips
  render, confirmed "No Effect" and "Blocked" are mutually exclusive with
  each other and with Miss/Crit (clicking one replaces any other), and
  confirmed the turn log renders "used Throat Chop on Snorlax (no effect)"
  / "(blocked (ability))" correctly.

- **Battle Logger: synthesized turn-log entries for field-condition changes**
  (2026-07-15) - the previously-open "nice-to-have" noted under Battle
  Logger's TODO entry: weather/terrain/Trick Room toggles
  (`FieldWeatherBar.tsx`) and side-condition toggles (screens/Tailwind/
  hazards, `SideConditionsRow.tsx`) mutated `fieldState` silently with no
  turn-log record - only the live countdown display showed anything
  changed. `useBattleLogActions.ts`'s `setWeather`/`setTerrain`/
  `setTrickRoom`/`toggleTurnCondition`/`toggleBooleanHazard`/
  `setStackableHazard` now each append a note like "Sun set"/"Sun ended"/
  "Reflect (Player) set"/"Spikes (Opponent): 2 layers" via the existing
  `appendAction` primitive. The "via Mega" confidence toggle and
  `toggleScreenExtended` (Light Clay confidence toggle) deliberately stay
  unlogged - they refine duration certainty, not an actual state change,
  same reasoning as skipping a log entry for those. Since none of these
  toggles are tied to one specific Pokemon (weather/terrain/Trick Room are
  fully field-wide; even side conditions belong to a whole side, not one
  mon), and `BattleAction.pokemonId`/`TurnLog.tsx` rendering assumed a real
  roster id everywhere, added a sentinel `FIELD_EVENT_ID` constant
  (`config/fieldConditions.ts`) instead of loosening the type - confirmed
  via `battleLookup.ts`/`battleCalcReview.ts`/`BattlefieldSlot.tsx` that
  every other consumer filters by an actual queried pokemonId, so a
  sentinel that never matches a real id is inert everywhere except
  `TurnLog.tsx`'s one explicit check, which renders a neutral gray "Field"
  label instead of a Pokemon name for these entries. Live-verified via the
  `run-desktop` skill (disposable battles, cleaned up... except the 8
  disposable test battles from this verification pass, which the user
  asked to leave in place for now rather than have Claude bulk-delete via
  script - `battles.json` has no test-battle IDs recorded anywhere else, so
  they're safe to remove by hand later, see current battle log for
  entries with no opponent name from 2026-07-15).

- **Teams page: fixed squished/truncated Pokemon-card grid on wide windows**
  (2026-07-15) - reported live while a dev instance was up: an expanded
  team's Pokemon cards were rendering with truncated nature names ("S...
  (+SpD, -Spe)" instead of "Sassy (+SpD, -Spe)") and EV numbers overflowing
  their boxes. Root cause: `TeamCard.tsx`'s grid used
  `xl:grid-cols-6`, forcing exactly 6 equal-width tracks the instant raw
  viewport width crossed Tailwind's 1280px `xl` breakpoint, without
  accounting for the sidebar/padding eating into the real content area -
  squished every ~280px-designed card down to ~135px on both the app's own
  1280x720 minimum window size context (content area, not raw viewport) and
  even a full 1920x1080 window. Confirmed via `git log` this predated
  today's work entirely - nothing in this session had touched that file's
  grid classes before the fix. Reproduced with a disposable Electron launch
  + a real 6-Pokemon import at both 1280x720 and 1920x1080 before touching
  any code, to nail the exact cause rather than guess. Fixed by replacing
  the fixed breakpoint column classes with a fluid
  `repeat(auto-fill, minmax(240px, 280px))` grid (inline `style`, matching
  `StatsColumn.tsx`'s existing precedent for CSS grid Tailwind can't express
  as a utility class) - the browser now fits as many real ~280px cards as
  actually have room, at any window size, instead of forcing a fixed count.
  Re-verified the same reproduction at both sizes post-fix: no more
  truncation or overflow at either.
  - **Follow-up same day**: after the above fix, the user reported the grid
    now wrapped into multiple short rows (e.g. 2x3) instead of the "nice
    1x6 row that sized properly when expanding the window" they remembered
    - the auto-fill grid alone wasn't enough. Root cause of *that*:
    `TeamsPage.tsx`'s outer teams-list container had its own unrelated
    `max-w-4xl` (896px) cap, capping the whole column regardless of window
    size - so the auto-fill grid never had more than ~830px to work with
    even at a 2200px-wide window, capping it at 2-3 columns no matter how
    far the window was expanded. Removed that cap entirely (each
    `PokemonCard` already self-caps at its own 280px max-width, so nothing
    else was relying on the outer container's cap for sizing). Re-verified
    with the same disposable-team reproduction at three sizes (1280x720,
    1600x900, 2200x1200): the 6-Pokemon roster now sits in one full row at
    2200px width, 4 columns at 1600px, all still fully legible with no
    truncation at any size.
  - **Third follow-up same day**: the auto-fill grid fixed truncation but
    produced a continuous reflow (any column count from 2-6 depending on
    exact pixel width) - the user clarified what they actually remembered
    was two clean discrete states, "either a 1x6 or a 2x3," not a
    continuously-resizing count. Switched from CSS Grid `auto-fill` to a
    CSS container query (Tailwind v4's native `@container`/`@[Xpx]:`
    support, confirmed by inspecting the actual generated CSS output in
    `dist/` rather than trusting the class name alone): the card-grid's
    ancestor wrapper gets `@container`, and the grid itself is
    `grid-cols-3 @[1760px]:grid-cols-6` (1760px = 6*280px cards +
    5*1rem gaps, the exact width 6 real columns need) - two clean states,
    but keyed off the container's own rendered width rather than the raw
    viewport, so it can never misfire the way the original
    viewport-media-query `xl:grid-cols-6` did. Verified across a sweep of
    window sizes with the same disposable-team reproduction: clean 2x3 at
    1280-1700px, still 2x3 at 1950px (container hadn't yet crossed 1760px
    once the sidebar/multiple nested padding layers were subtracted -
    correct, conservative behavior), clean 1x6 at 2400px.

- **Teams page: strategy notes UI + shareable team image export** (2026-07-15)
  - inspired by a look at community VGC tools (VGC Helper, Pikalytics'
    team builder) the user asked about; concluded a public team-library/
    browse-other-people's-teams pattern doesn't fit ChoiceBuds' local-first
    design, but two ideas did and were explicitly requested: a team-image
    export (something the user already planned on adding eventually) and
    a strategy-notes UI (`Team.notes` already existed in `types/pokemon.ts`
    but had zero UI consumers anywhere in the codebase - confirmed via grep
    before starting).
  - **Notes UI**: added a `<textarea>` to `TeamCard.tsx`'s expanded view,
    same "local state + `updateTeam` on blur" pattern already used for the
    name/author fields, hidden entirely when empty and not editing (matches
    the author field's existing empty-chrome rule). Verified live: typed
    notes, reloaded the whole page, confirmed the text survived the reload
    (i.e. actually persisted to `teams.json`, not just React state).
  - **Team image export**: new `TeamExportImageModal.tsx` (sibling to the
    existing `ExportTeamModal.tsx` text exporter) + `TeamPosterTile.tsx`
    (one Pokemon's sprite/item/ability/4 type-colored moves/nature+EVs
    tile, a read-only mirror of `PokemonCard.tsx`'s own layout). Renders a
    visible "poster" preview (team name/regulation badge/notes/6 tiles/a
    small "Exported from ChoiceBuds" watermark) and rasterizes that exact
    DOM node to a PNG via the new `html-to-image` dependency, on either a
    Download or Copy-to-Clipboard button (both offered, per explicit
    request - clipboard for pasting straight into Discord, download for a
    saved file, no native save dialog/main-process plumbing needed for
    either). A real risk investigated before writing any code: item icons
    (`ItemData.spriteUrl`, unlike Pokemon sprites) were never routed
    through the local sprite cache anywhere in the codebase - raw
    cross-origin `<img>` sources risk a tainted/blocked canvas during
    rasterization on hosts that don't send CORS headers (e.g. the Fairy
    Feather Serebii fallback). Fixed by routing item icons through the
    same `spriteCacheState.resolveSprite()` already used for Pokemon
    sprites elsewhere (a generic per-URL cache, not Pokemon-specific,
    confirmed by reading its implementation first) before the poster ever
    renders them. Verified live end-to-end: imported a real team through
    the actual import flow (real PokeAPI enrichment, not hand-faked
    fixtures), opened the export modal, confirmed the rendered poster
    matched the in-app card data, and clicked Copy to Clipboard -
    succeeded with no console errors and the button's "Copied!"
    confirmation state firing correctly.

- **Statistics page: page-wide season filter** (2026-07-15) - the
  deliberately-deferred half of the season-level-breakdowns work (the "By
  Season" panel itself shipped 2026-07-13). Adds an "All / M-N / M-N..."
  filter-pill row (same visual pattern as `TeamsPage.tsx`'s format filter)
  above the stat cards - selecting a season narrows every panel (overall
  record, By Format, By Team, By Opponent, Recent Form, Most-Used Pokemon,
  Most-Faced Opponents) to that season's battles, derived via the existing
  `getSeasonForDate(battle.date)`. The filter row itself only lists seasons
  that actually have a logged battle (new `getSeasonsWithBattles()` in
  `battleStats.ts`), so it doesn't advertise future/empty seasons, and is
  hidden entirely when fewer than 2 seasons have data (a single-season
  filter row would be redundant with "All"). The "By Season" breakdown
  panel itself is hidden while a specific season is selected, since
  showing a single-row breakdown of the season you already filtered to
  added nothing. The page's empty-state check also moved from
  `overallRecord.total === 0` (only completed battles) to
  `battles.length === 0` (any battle at all), so a season with only
  in-progress battles now correctly shows "0 battles" stat cards for that
  filter instead of misleadingly falling back to the page's top-level "Log
  some battles" empty state. Verified live with a disposable Electron
  launch against a fresh `--user-data-dir` seeded with synthetic battles
  spanning M-3/M-4 (never touched real user data) - filtering to M-3
  correctly narrowed 3-2/5-battle "All" totals down to 1-1/2-battle
  totals, and back.

- **Settings page: "Season Data" manual-refresh reminder** (2026-07-15) -
  the "Check for Updates" idea from the season-level-breakdowns entry below,
  built as its own Settings section (`SeasonDataCheckSection.tsx` +
  `useSeasonDataCheck.ts`). Since `config/seasons.ts` can't self-update (no
  live-scrape policy), this only nudges a human: shows the latest tracked
  season/regulation and its end date, flags a warning once that end date is
  within 2 weeks (or already passed), and a "Mark as Checked" button that
  timestamps `AppSettings.lastSeasonDataCheckedAt` (new field, follows the
  existing `lastPushedAt`/`lastPulledAt` pattern - no new IPC/main.ts
  plumbing needed, flows through the existing generic `updateSettings()` +
  `file:read/write-settings` channels). Added `getLatestSeason()` to
  `seasons.ts`. One real bug caught during live verification and fixed
  before landing: `config/seasons.ts` stores dates as UTC midnight
  (`Date.parse('YYYY-MM-DD')`), and this is the first place in the codebase
  to ever format a `season.start`/`end` value for display (the existing "By
  Season" stats panel only ever shows `season.label`) - a plain
  `toLocaleDateString()` rendered the date a day early in a negative-UTC-
  offset timezone; fixed by passing `{ timeZone: 'UTC' }`. Also hit the
  newer `react-hooks/purity` lint rule (calling `Date.now()` inside a
  `useMemo` during render is flagged) - worked around with a `useState`
  lazy initializer, which is the sanctioned escape hatch since it only runs
  once on mount.

- **`game-data-cache.json` concurrent-write race fixed** (2026-07-15): found
  during a fresh-Windows-install smoke test - the first-launch bulk VGC-item
  sync (`useGameData.ts`) fires dozens of near-simultaneous `setCache`
  calls, each triggering its own `writeGameDataCache` IPC call, and
  `main.ts`'s `atomicWriteFile` wrote every call to the same shared
  `<file>.tmp` path with no locking - concurrent writes raced, and whichever
  `rename` lost found its temp file already consumed, throwing `ENOENT`
  (self-healing in practice, but spammed the console every first launch).
  Fixed by adding a `Map<filePath, Promise>` write queue in `main.ts` -
  `atomicWriteFile` now chains each write for a given path onto the
  previous one for that same path (writes to different files stay
  independent/concurrent), so two writers can never race on the same `.tmp`
  file. Verified with a disposable Electron launch against a fresh
  `--user-data-dir` (forces the same first-launch bulk-sync burst): 0 write
  errors afterward, vs. dozens before the fix, with the cache file written
  correctly both times.

- **react-hooks lint-rules follow-up: `set-state-in-effect` +
  `immutability` fixed for real in 11 of 13 affected files** (2026-07-14):
  the dev-tooling bump's deferred item, revisited as its own pass.
  Re-enabling both rules to check fixes-in-progress revealed the true scope
  was **13 files**, not the ~4 originally catalogued - reordering the
  `immutability` hoisting fix in one file unlocked `set-state-in-effect`
  detection inside the same now-visible function bodies, surfacing hooks
  nobody had flagged before (`useBattles.ts`, `useDamageCalc.ts`,
  `useDatabase.ts`, `useInitialSync.ts`, `useMegaSprite.ts`). Found and
  reported this scope blowup to the user immediately rather than either
  quietly doing a much bigger refactor than agreed or quietly re-disabling
  without saying why; user chose to fix the tractable subset for real and
  leave the riskier subset disabled.
  - **`immutability` (hoisting order)** - `useTeams.ts`, `useSettings.ts`,
    `useSavedPokemon.ts`, `useBattles.ts`: pure reordering, moving each
    `load*FromDisk` function above the `useEffect` that calls it. Zero
    behavior risk - the effect only runs post-mount, by which point the
    `const` is already assigned either way; this only satisfies the
    linter's static reference-order check.
  - **`set-state-in-effect` (7 "reset on dependency change" cases)** -
    applied React's own documented pattern (
    https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
    ): track the previous trigger value in its own `useState`, and when it
    changes, reset the derived state synchronously during render instead of
    inside a `useEffect`. Fixed in `EditOverlays.tsx` (item + ability reset
    before their async metadata fetch), `OpponentRowFields.tsx` (item field
    sync with `opponent.item`), `CalcAutocomplete.tsx` (query sync with
    `value` - also let `useEffect` be dropped from the import entirely),
    `useDamageCalc.ts` (both Pokémon's learned-moves-slugs reset),
    `useMegaSprite.ts` and `usePokemonTypeFilter.ts` (identical
    cache-lookup-then-fetch shape in both - re-derive from cache
    synchronously on a key change, only use the effect for the genuinely
    async not-yet-cached path). `useInitialSync.ts` got a cleaner fix than
    the others - its "already synced on a previous launch" branch is a pure
    function of already-available render-time values, so `isDone` is now
    `alreadySynced || heavySyncDone` computed directly (no effect/setState
    needed for that path at all, and it now flips true one render earlier
    than before instead of waiting on a post-paint effect).
  - **Deliberately left disabled**: `useTeams.ts`/`useSettings.ts`/
    `useSavedPokemon.ts`/`useBattles.ts`/`useDatabase.ts`'s load-on-mount
    functions (each sets `isLoading`/`error` synchronously at its own top,
    and is also reused by a manually-triggered `refresh*()` that needs that
    reset - splitting into an effect-safe silent variant plus a refresh
    variant is a bigger, riskier change to the core data-loading pattern of
    nearly every hook in the app than fits this pass) and `useSync.ts`'s
    `refreshStatus` call (same shape). Added a targeted `eslint.config.js`
    override scoped to just those 6 files with a comment explaining why,
    rather than a blanket disable.
  - **Verified live** via `.claude/skills/run-desktop`: a disposable team
    (1 Pokémon) exercised `EditOverlays.tsx`'s item-change reset (search +
    select "Choice Scarf", confirmed the tooltip/description loaded
    correctly with zero console errors) and `usePokemonTypeFilter.ts` (the
    species picker's `#fire` tag search resolved to Charizard/etc. with no
    errors, screenshot caught the exact "Loading type..." transitional
    state). The Calc page exercised `useDamageCalc.ts` (species selection)
    and `CalcAutocomplete.tsx` (move search) with no errors. A disposable
    battle (using a real team, since the 1-Pokémon test team didn't
    qualify for battles) exercised `OpponentRowFields.tsx`'s item field.
    All disposable teams/battles cleaned up afterward - confirmed
    `teams.json`/`battles.json` back to exactly the user's real 3 teams/2
    battles (accidentally created 9 stray in-progress test battles during
    UI-selector debugging retries, all identified by today's date and
    `in-progress` result and removed).
  - Also hit a transient, unrelated tooling outage mid-session (Anthropic's
    own safety-classifier service was intermittently unavailable, blocking
    `npm run build`/`lint` specifically while reads/greps kept working) -
    not a code issue, resolved itself; flagged to the user rather than
    silently retried in a loop.

- **Small polish batch: CalcPage chunk-size warning + Unseen Fist
  investigation** (2026-07-14): two lowest-priority backlog items, tackled
  quickly since neither needed a large change.
  - **`CalcPage` chunk size**: checked `@smogon/calc`'s own package
    structure for a real code-split opportunity first (no `exports` map,
    all species/move/ability/item data bundled monolithically with no
    subpath to import just one generation's tables) - concluded the 507kB
    chunk is inherent to the dependency, not a symptom of avoidable bloat,
    and it's already correctly behind `React.lazy()`. Raised
    `vite.config.ts`'s `build.chunkSizeWarningLimit` to 550 (with a
    comment explaining why) instead of chasing an impractical split.
  - **Unseen Fist-through-Protect**: read `@smogon/calc`'s compiled source
    directly instead of guessing - "Unseen Fist" appears exactly once in
    the package (the static ability-name list for the picker) and is never
    referenced via `hasAbility()` in any of its generation-specific damage
    mechanics files, unlike abilities it does model (Parental Bond has ~5
    `hasAbility('Parental Bond')` checks in `mechanics/gen789.js`). The
    library has no special-case logic for this ability's Protect-bypass
    mechanic at all - confirming the previously-feared "deep interaction"
    bug doesn't exist. No code change needed; the existing tooltip-text
    correction in `config/championsAbilityOverrides.ts` was already
    complete and sufficient.

- **Teams/Battle Log list-row redesign** (2026-07-14): the first concrete
  scoping of the long-vague "general UI polish" backlog item. Both pages'
  rows were thin flat bars stretching full-width on wide screens, leaving
  large empty space and minimal visual hierarchy compared to the
  Statistics page's card grid.
  - **Design process**: built 3 static HTML mockups (Artifact, using the
    app's real dark palette/data - not lorem/placeholder content) as a
    visual comparison rather than guessing the user's taste: "Compact +
    Accent" (today's row height, width-capped, colored left accent
    stripe), "Dashboard Cards" (bigger card grid closer to Statistics'
    visual weight), and "Rich Compact Row" (enriched single-column list
    with type-composition pips). User picked "Compact + Accent."
  - **New `config/pokemonTheme.ts` addition**: `REGULATION_THEMES`/
    `getRegulationTheme()`, keyed by `RegulationId` - blue accent for Reg
    M-A, purple for Reg M-B. `RegulationBadge.tsx` now uses this too (it
    previously rendered the same blue regardless of regulation - the new
    accent stripe would have clashed with an unchanged blue badge on a
    purple-accented M-B card).
  - **`TeamCard.tsx`**: added a `border-l-4` regulation-colored accent
    stripe. **`TeamsPage.tsx`**: initially tried a responsive
    `auto-fill` grid (matching the mockup) to stop cards stretching
    full-width, but live-testing at 1280x720 surfaced a real bug the
    mockup didn't - `TeamCard`'s actual minimized row carries far more
    fixed-width content than the simplified mockup did (6 sprites +
    author + regulation badge + Validate/Export/Edit/Delete/Expand
    buttons, measured ~628px minimum), so a 420-680px grid column either
    overflowed (clipped buttons, horizontal scrollbar) or truncated team
    names. Settled on keeping Teams single-column but capping its width
    (`max-w-4xl`) instead of a multi-column grid - honest to how much
    horizontal space that row's content actually needs, while still
    matching the "don't stretch into empty space" goal.
  - **`PastBattlesList.tsx`**: same accent-stripe treatment, keyed by
    battle result (green/red/amber) instead of regulation, plus the
    `auto-fill` grid wrap *did* work cleanly here (this row's content is
    much lighter than a team's) - singleton rows wrap into columns, Bo3
    set clusters span the full row width.
  - **Bo3 team-name fix** (caught by the user, not by testing): a Bo3 set
    always uses one team for all 3 games in real VGC play, so showing the
    team name on every `Game N` row inside a grouped set was redundant.
    Now shown once in the set's own header line (`{teamName} vs
    {opponentName} - Set {W-L}`, taken from Game 1's `teamName` since a
    set is defined by using one team throughout) - each game row inside
    the group now shows only "Game N".
  - **Verified live** via `.claude/skills/run-desktop` at both 1280x720 and
    1920x1080, using a disposable 2-game Bo3 test set (real teams/battles
    untouched, cleaned up afterward) - confirmed the accent colors, the
    grid/width-cap behavior on both pages, and the corrected Bo3 header
    text, with zero layout overflow at either size (`scrollWidth -
    clientWidth === 0`, checked directly rather than eyeballing).

- **Calc page: further spacing tightening pass** (2026-07-14): a follow-up
  to the earlier partial tightening (924px scrollHeight at the 1280x720
  minimum window, down from 1102px). Measured the exact overflowing
  container first (`<main class="flex-1 overflow-y-auto">`, 924px content
  vs 655px viewport at 1280x720) rather than guessing which panel needed
  trimming. Shaved vertical padding (`py-1`→`py-0.5`) and gaps (`gap-1`→
  `gap-0.5`) across every repeated control: `CalcSideConditions.tsx`'s
  10-row side-condition toggle list and Spikes buttons (the single tallest
  contributor, ~58px alone), `CalcMoveGrid.tsx`'s 4 move rows (row padding,
  the inline hit-count select, and Crit button), `CalcAutocomplete.tsx`'s
  shared input (used ~14 times across the page - species/item/ability
  fields and all 8 move-name fields), and the remaining `py-1` selects in
  `CalcFieldPanel.tsx`/`CalcPokemonPanel.tsx`/`CalcTeamTray.tsx` for
  consistency. Result: 924px → 864px (measured via the same `run-desktop`
  eval-based scrollHeight check both before and after).
  - **Deliberately stopped there, not fully eliminating the scroll** - the
    remaining ~209px gap would need either reversing
    `CalcSideConditions.tsx`'s documented one-row-per-condition design
    decision (made specifically to match a reference calc's legible field
    panel, not an arbitrary choice) or shrinking padding further to a point
    risking click comfort/legibility. Presented both options plus "stop
    here" to the user; they chose to stop and bank the safe improvement
    rather than trade those off - matches the user's own established
    preference for confirming design trade-offs rather than having Claude
    decide unilaterally on anything touching visual/UX taste.
  - Verified via `type-check`/`lint`/`build` (all clean, no chunk-size
    regression) and visual screenshots at both 1280x720 and 1920x1080 -
    nothing reads as cramped or illegible at the new spacing, buttons/
    inputs stay comfortably clickable.

- **Dev tooling bumped: Vite `^5.0.0`→`^8.1.4`, ESLint `^9.39.4`→`^10.7.0`,
  TypeScript `^5.3.0`→`^6.0.3`** (2026-07-14): the dev-tooling half of the
  backlog's version-drift item, done as a dedicated follow-up pass to the
  Electron bump above. Three parallel research passes (official migration
  guides plus direct `npm view <pkg> peerDependencies` checks, not guesses)
  resolved every open compatibility question before touching a single file.
  - **TypeScript capped at 6.0.3, not 7.0.2** (the actual current `latest`
    tag) - confirmed hard blocker: TypeScript 7.0 is Microsoft's native
    Go-rewrite GA with no stable programmatic API yet (lands in 7.1), and
    `typescript-eslint`'s peer range (`>=4.8.4 <6.1.0`) excludes 7.0.2
    entirely - forcing it past that check produces real runtime crashes
    inside `@typescript-eslint/typescript-estree`
    ([typescript-eslint#12518](https://github.com/typescript-eslint/typescript-eslint/issues/12518)/
    [#12521](https://github.com/typescript-eslint/typescript-eslint/issues/12521),
    filed right after 7.0's GA), not just a stale range. 6.0.3 is the newest
    release still inside typescript-eslint's supported window.
  - **`@vitejs/plugin-react` bumped to `5.2.0`, deliberately not `6.x`** -
    6.x narrows its Vite peer to `^8.0.0` only and pulls in React Compiler
    tooling (`babel-plugin-react-compiler`, `@rolldown/plugin-babel`) this
    project doesn't use; 5.2.0's broader peer range (`^4.2.0` through
    `^8.0.0`) covers Vite 8 without the extra footprint.
  - **`vite-plugin-electron` needed no version bump or config change** -
    read its actual shipped source rather than trusting docs alone: it
    already detects Vite's installed major and internally rewrites
    `build.rollupOptions` to `build.rolldownOptions` for Vite 8's
    Rolldown-based bundler, so `vite.config.ts`'s existing
    `rollupOptions.external` settings for the main/preload sub-builds
    needed zero edits.
  - **`eslint-plugin-react-hooks` forced to `7.1.1`, not optional** -
    verified directly via `npm view eslint-plugin-react-hooks@<version>
    peerDependencies` across 5.2.0/6.0.0/6.1.0/7.0.0/7.1.1: **7.1.1 is the
    first version whose peer range includes `eslint ^10.0.0`** at all, so
    bumping ESLint to 10 made this jump mandatory. Its flat-config export
    shape changed too - migrated `eslint.config.js` from spreading
    `reactHooks.configs.recommended.rules` inline to a dedicated
    `{ ...reactHooks.configs.flat.recommended, files: [...] }` block
    (deliberately the stable `recommended` export, not `recommended-latest`,
    which the plugin's own README documents as "bleeding edge experimental
    compiler rules" - not something to opt into silently in a routine bump).
  - **Two required, narrow code edits surfaced by the bump itself** (not
    zero, unlike the Electron pass): `tsconfig.json` dropped the
    now-deprecated `baseUrl: "."` (kept `paths: {"@/*": ["./src/*"]}` as-is,
    which resolves identically without it - TS 6.0 does require the `./`
    prefix on the paths value once `baseUrl` is gone, a one-line fix caught
    by a live compiler error); and TS 6.0's new `TS2882` diagnostic started
    rejecting the existing side-effect `import './index.css'` in
    `main.tsx` until `"vite/client"` was added to `tsconfig.json`'s `types`
    array (it was always relying on Vite's ambient `*.css` module
    declaration, just never explicitly declared).
  - **Two new stricter `eslint-plugin-react-hooks` 7.x rules
    (`set-state-in-effect`, `immutability`) were surfaced and deliberately
    disabled, not fixed** - they flagged 8 spots across long-standing,
    working code (the standard "reset local state on prop change" effect
    pattern, and every load-on-mount hook's `useEffect` calling a `const`
    declared later in the same file - a hoisting-order style objection, not
    a real bug). User's explicit call: disable both with a documented
    rationale in `eslint.config.js` rather than reworking 8 files' effect/
    hook patterns as unplanned scope inside a routine dependency bump - see
    TODO.md for the real follow-up.
  - ESLint 10's own new `preserve-caught-error` recommended rule caught 3
    real (if minor) spots where a caught error was re-thrown without
    preserving the original as `.cause` (`pokeapi.ts`, `syncApi.ts`) - fixed
    properly rather than suppressed, small low-risk diffs. Adding
    `{ cause: error }` to `new Error(...)` needed `"ES2022.Error"` added to
    `tsconfig.json`'s `lib` array (the existing `ES2020` lib predates that
    constructor overload in TypeScript's own type definitions - runtime
    support is unaffected, Electron 43's bundled Chromium/V8 has long
    supported `Error` cause).
  - This bump also cleared the pre-existing esbuild/Vite moderate+high
    `npm audit` advisories noted during the Electron-bump pass (`npm audit`
    now reports 0 vulnerabilities) - those needed Vite's own major version,
    not anything Electron-side, to resolve.
  - **Verified**: `type-check`/`lint`/`build` all clean (build is the real
    test of the Rolldown+Oxc bundler swap underneath Vite 8, not just a
    config-flag change) - chunk sizes stayed sane and the
    `CalcPage`-isolation/`battleSets`-shared-chunk discipline documented in
    CLAUDE.md held under the new bundler (a small new `jsx-runtime` chunk
    appeared, just Rolldown's own chunking heuristic, not a regression).
    Full dev-mode pass via `.claude/skills/run-desktop` across Teams/Calc/
    Battle Log/Statistics/Settings with console-error monitoring - none
    found, Tailwind styling intact throughout. No packaged-build
    verification needed this time (unlike the Electron pass) - none of
    this touches `main.ts`'s production runtime path.

- **Electron bumped `^28.0.0` → `^43.0.0`** (2026-07-13): the only backlog
  item with a security dimension (several high-severity advisories fixed
  only in newer majors), a 15-major-version jump. Before touching anything,
  fetched Electron's own cumulative breaking-changes doc (v28 through v43)
  and checked it against this app's actual API surface
  (`app`/`BrowserWindow`/`ipcMain`/`shell`, a narrow hand-wrapped
  `contextBridge` API in `preload.ts`, `navigator.clipboard` for the
  team-export copy button) - none of the removed/deprecated APIs across
  that whole span (`remote`, `BrowserView`, `File.path`, renderer
  `clipboard`, raw `ipcRenderer` exposure over contextBridge, custom
  protocol handlers, traffic-light window APIs) are used anywhere in this
  codebase, so **zero application code changes were needed** - this really
  was just a dependency-version bump plus verification, confirmed by
  research rather than assumed.
  - Electron 43 bundles Node 24.17.0 - bumped `@types/node` `^20.10.0` →
    `^24.0.0` alongside it (the closest available `@types/node` release;
    those don't track Electron's exact bundled patch version) purely for
    type accuracy against the real runtime, distinct from the separately-
    deferred Vite/TypeScript/ESLint dev-tooling bump below.
  - `npm audit` surfaced 2 pre-existing moderate/high esbuild/Vite
    advisories after the install - unrelated to Electron, would need Vite's
    own major bump to fix (that's the deferred dev-tooling pass, not
    touched here).
  - **Verified three ways**, not just a clean build: (1) `type-check`/
    `lint`/`build` all clean, chunk sizes unchanged; (2) full dev-mode pass
    via `.claude/skills/run-desktop` across Teams/Calc/Battle Log with
    console-error monitoring - none found; (3) per the packaged-build-
    verification gotcha (dev mode never exercises `main.ts`'s production
    `loadFile` branch), actually ran `npm run dist:win` - `electron-builder`
    26.15.3 packaged Electron 43.1.0 without issue, confirming it's
    forward-compatible - then launched the real built `.exe` directly and
    confirmed via its window title (`ChoiceBuds - VGC Team Importer`) and
    `Responding: True` that the production load path works, the opposite
    of the known silent-`ELECTRON_RUN_AS_NODE`-failure signature (exit code
    0, no window, nothing in the event log). A first attempt to also grab a
    visual screenshot of that packaged window via a raw Win32
    `GetWindowRect`/`CopyFromScreen` PowerShell script captured the wrong
    window entirely (unrelated content elsewhere on screen) - deleted
    immediately without further use; the process/title/responsiveness
    check above was sufficient on its own, so the visual screenshot wasn't
    pursued further. All test build artifacts (`release/`) cleaned up
    afterward.

- **Statistics page: "By Season" breakdown** (2026-07-13): splits win/loss
  data by ranked-ladder season (M-1..M-5), a sub-division of Regulation that
  the app had never tracked - `Team['format']`/`Battle['format']` only ever
  distinguished Reg M-A vs Reg M-B as a whole. Three decisions confirmed
  with the user first: derive a battle's season purely from its existing
  `date` timestamp (no new schema field, no migration, applies retroactively
  to every already-logged battle) rather than storing it explicitly like
  `format`; ship just a read-only breakdown panel this pass, not a page-wide
  season filter (deferred - bigger scope, touches every stat function's call
  site); and leave the related "Check for Updates" season-data reminder
  tool out of scope (still just an idea, no design yet - see TODO.md).
  - **New `config/seasons.ts`**: `SeasonDef` + a hand-authored `SEASONS`
    table (M-1 through M-5) and `getSeasonForDate(timestamp)`, following the
    same static-config convention as `utils/pokemonRules.ts`. Dates for
    M-1..M-4 researched 2026-07-08 (Bulbapedia + Serebii, one-off manual
    check per CLAUDE.md's external-source policy, not a live fetch) -
    Serebii was more current than Bulbapedia's dedicated season-list page,
    which hadn't been updated with the newest season yet at check time:
    | Season | Regulation | Start | End |
    |---|---|---|---|
    | M-1 | Reg M-A | 2026-04-08 | 2026-05-13 |
    | M-2 | Reg M-A | 2026-05-13 | 2026-06-17 |
    | M-3 | Reg M-B | 2026-06-17 | 2026-07-08 |
    | M-4 | Reg M-B | 2026-07-08 | 2026-08-05 |
    | M-5 (expected, unconfirmed at research time) | Reg M-B | ~2026-08-05 | 2026-09-02 (Reg M-B's own published end date) |

    M-5's exact dates weren't published by either source at research time -
    the row above was inferred from the pattern, not sourced, and flagged
    inline in `config/seasons.ts` as needing a manual re-check before
    ~2026-08-05 (now past - **not yet re-confirmed**, worth a follow-up
    check next time season/regulation config is touched). Sources checked:
    Bulbapedia's "Ranked Battles Seasons in Pokémon Champions" and
    "Regulation Set M-B" pages, Serebii's `rankedbattle/regulationm-a.shtml`
    and `regulationm-b.shtml` pages - full URLs in the
    `reg_mb_season_timeline` memory note.
  - **`utils/battleStats.ts`**: new `getRecordBySeason(battles)`, same
    `LabeledRecord[]` shape as the sibling `getRecordByFormat`/
    `getRecordByOpponent`, but ordered chronologically (season order) rather
    than by-total, since a season timeline reads better in order-played than
    ranked by volume. Battles whose `date` falls outside every known season
    range are silently skipped, same pattern `getRecordByOpponent` already
    uses for battles with no `opponentName`.
  - **`StatisticsPage.tsx`**: one more `<BreakdownPanel title="By Season">`
    added to the existing By Format/By Team/By Opponent grid - no changes
    needed to `BreakdownPanel.tsx` itself, it was already a generic
    `LabeledRecord[]` renderer.
  - **Verified live** via `.claude/skills/run-desktop`: since there's no UI
    to backdate a battle, 3 disposable battles were appended directly to
    `battles.json` (bypassing the full turn-based logging UI, which this
    change doesn't touch) with `date` timestamps placed in M-1, M-3, and
    M-4, then the app was relaunched fresh against the edited file. The By
    Season panel rendered exactly as expected: `M-1 1-0 (100%)`, `M-3 0-1
    (0%)`, `M-4 2-1 (67%)` - the M-4 row correctly folded in the two real
    pre-existing battles alongside the synthetic one, in chronological
    order. All 3 disposable battles were removed from `battles.json`
    afterward, confirmed back down to the user's real 2 logged battles.

- **Battle Logger: Bo3 set grouping across games** (2026-07-13): the
  Battle Logger roadmap's last long-standing, never-detailed item - planned
  via EnterPlanMode given the size. There was no persistent opponent
  identity anywhere in the app before this (only ephemeral per-battle
  `opponentRoster` Pokemon sightings), which `COMPLETED.md` itself had
  already flagged as a known gap when Statistics were first built. Two
  decisions confirmed with the user first: link games via an optional
  "Opponent Name" field with auto-continue (rather than fully-manual
  after-the-fact grouping), and include the Statistics page additions in
  the same pass rather than deferring them.
  - **Data model**: `Battle` gains `setId: string` (**always** defined,
    never optional - every battle belongs to a set of at least 1, so a
    casual battle with no opponent name renders with zero Bo3 framing,
    identical to before this existed) and `opponentName?: string`.
    `useBattles.ts`'s existing legacy-backfill-at-read-boundary pattern
    (`normalizeBattle`) gets one more line: `setId: b.setId ?? b.id`, so a
    pre-existing battle becomes its own singleton set.
  - **New `utils/battleSets.ts`**: `groupBattlesBySet` (groups by `setId`,
    preserving `PastBattlesList`'s existing newest-first ordering at the
    group level, each group's own battles sorted oldest-first for a
    natural Game 1/2/3 reading order) and `getSetOutcome` (a set is
    decided once either side reaches 2 wins - Bo3's own win condition).
    Shared by the list display, the linking logic, and the stats below -
    one source of truth for "what does a decided set look like."
  - **Set linking**: `useBattleLogActions.ts::startBattle` gained a third
    hook param (`battles: Battle[]`, already available at its one call
    site) so it can check for an open set to continue. A blank opponent
    name always gets a fresh `setId` (unchanged behavior). A non-blank
    name (case-insensitive) joins the most recently-updated existing set
    against that name if one is still open - not decided, not already
    mid-game (no in-progress member), not already full (3 games) -
    otherwise it starts a fresh set. `StartBattleFlow.tsx` gained the
    "Opponent Name" input itself, with a `<datalist>` of prior names (same
    convention `OpponentItemCell.tsx` already uses for item suggestions)
    to reduce typo risk breaking the match.
  - **`PastBattlesList.tsx`**: the existing per-row markup was extracted
    into an in-file `BattleRow`, then grouped via `groupBattlesBySet` - a
    group of 1 renders exactly as before (zero visual change for anyone
    not using the opponent-name field); a group of 2-3 renders as a
    bordered cluster with a "vs {name} - Set W-L" header (plus "(in
    progress)" while undecided) and Game 1/2/3 badges on the nested rows.
  - **Statistics**: two new purely-additive `battleStats.ts` functions -
    `getRecordByOpponent` (same pattern as the existing `getRecordByTeam`,
    grouped by name instead) rendered via the *existing* `BreakdownPanel`
    component, and `getSetRecord` (sets won/lost, counting only *decided*
    sets) rendered via the existing `OverallRecordCard`, which gained one
    small optional `unitLabel` prop (defaults to `'battle'`, so the
    original usage is untouched) so the new card can say "sets" instead.
  - **A real display bug caught and fixed during live verification**: the
    set header's `opponentName` was initially read from the group's
    *unsorted* (newest-first) array rather than the oldest-first sorted
    one, so typing the name with different casing across games (e.g.
    "TestOpp" then "TESTOPP") made the header flip to whichever casing was
    most recently typed instead of staying stable on Game 1's casing.
    Fixed by reading it from the same sorted array used for `battles`.
  - Verified live end-to-end with disposable battles against a real team:
    confirmed case-insensitive auto-continue linking (typed "TestOpp" /
    "testopp" / "TESTOPP" across 3 games, all correctly joined one set);
    confirmed the set correctly showed "1-1 (in progress)" after 2 games
    and "2-1" (decided) after the 3rd; confirmed a 4th game with the same
    name correctly did *not* auto-join the now-decided set and instead
    started its own standalone set; confirmed a battle with no opponent
    name rendered with no grouping chrome at all; confirmed the
    Statistics page's new Sets record (1-0, only counting the one decided
    set) and By-Opponent breakdown (2-2 game-level, correctly including
    the standalone 4th game) both matched the disposable data exactly.
    Full production build verified clean, including that `battleSets.ts`
    factored into its own small shared chunk rather than bloating
    `CalcPage`'s isolated chunk (the same regression class caught during
    the damage-calc-review work above).
- **Battle Logger: post-battle damage-calc review** (2026-07-13): the
  Battle Logger roadmap's last vague item ("step through a logged battle's
  turns against the Calc") needed real scoping - planned via EnterPlanMode
  given the size. Research surfaced a hard, unfixable ceiling and two real
  design forks, both resolved with the user before implementation:
  - **Hard ceiling**: HP is never tracked anywhere in the Battle Logger, so
    every result is inherently "X-Y% of max HP," never "would this have
    KO'd them" - not fixable without a much bigger HP-tracking feature.
  - **Opponent-info time-leak** (user chose: fix it): `OpponentPokemonEntry.ability`/
    `.item` only ever stored the current known value with no record of
    which turn they were revealed - reviewing an early turn could leak
    info only actually learned much later. Fixed by adding
    `abilityRevealedOnTurn`/`itemRevealedOnTurn` to the type, stamped in
    `updateOpponentMoveTags` (only when the field's value actually
    changes) and `setMegaEvolved` (which patches ability/item directly,
    bypassing the former).
  - **Stat stage/status history** (user chose: attempt automatic replay
    over defaulting to neutral): `statStages`/`statusConditions` are
    "current value only" too, but every single mutator
    (`logAction`'s auto stat-effects, `adjustStatStage`,
    `applyAbilityEffect`, `applyReactiveLowerEffect`,
    `applyHitReactiveEffect`, `setStatusCondition`) already appends a
    discrete, consistently-formatted note action to the turn log at the
    same time it changes state (`"{STAT_LABELS[stat]} {sign}{delta}"`,
    optionally suffixed `" ({source})"`; status notes are an exact
    `STATUS_LABELS` match or `"Cured of {label}"`) - verified true without
    exception at every call site, which is what made a note-parsing
    replay honest rather than a guess.
  - New `utils/battleCalcReview.ts`: `reconstructStageAtTurn` replays
    stat-note deltas for a Pokemon from its most recent send-in/switch-in
    (phase-tagged actions) through the reviewed turn, clamped -6..6 -
    stages reset to 0 on switch since every field-entry is uniformly
    logged. `reconstructStatusAtTurn` replays status notes with no reset
    window (status persists through switches, matching the real game
    rule already documented on `statusConditions`). Field conditions
    (weather/terrain/screens) needed no replay - already turn-stamped via
    existing `setOnTurn` fields, checked against their existing
    duration/expiry constants; hazards with no per-turn timestamp at all
    (Stealth Rock, Spikes) fall back to the current end-of-battle value
    regardless of reviewed turn, a documented narrow gap. Also maps
    Battle's lowercase enums to `@smogon/calc`'s Showdown-style vocabulary
    (`WeatherType`->`Weather`, `StatusCondition`->`StatusName`, etc.) and
    only the `SideConditions`/`CalcSideConditions` fields both models
    share (spikes, reflect/lightScreen/auroraVeil/tailwind, stealthRock).
  - `BroughtPokemonSnapshot` gained `nature`/`evs`/`level` (never tracked
    in `Battle` before at all - only derivable from the live `Team`,
    which can drift/be deleted after the fact), snapshotted in
    `startBattle` alongside the rest of the set. Optional/graceful for
    battles logged before this shipped.
  - UI: `TurnLog.tsx` (already renders every turn's actions in one
    continuous list, so no separate turn-scrubber screen was needed) gets
    a "Show Calc" button on any damaging, unfailed action with a target -
    nothing computed until clicked. Clicking it hands a
    `CalcReviewPayload` up through `ActiveBattleView`/`BattleLogPage` to
    `App.tsx`, which stores it as `pendingCalcReview` and switches to the
    Calc tab; `CalcPage.tsx` consumes it exactly once via the same
    `setPokemon1`/`setPokemon2`/`setField` merge-update setters
    `teamPokemonToCalcUpdates` ("Load from Team") already uses - no new
    Calc-state application logic needed.
  - **Real regression caught and fixed during the build**: initially
    imported `defaultSideConditions` (a real value, not just a type) from
    `useDamageCalc.ts` into the new util - a production build afterward
    showed `useDamageCalc` had split into its own 486kB chunk shared with
    `BattleLogPage`, meaning a Battle-Log-only session would now load
    `@smogon/calc` too, exactly what `CalcPage.tsx`'s `React.lazy()`
    boundary exists to prevent. Fixed by inlining the (trivial, 15-field)
    default object locally instead of importing it - confirmed via a
    rebuild that the chunk split reverted to normal.
  - Verified live end-to-end with a disposable team/battle (Charizard
    Dragon Dance -> Flare Blitz vs. Garchomp): confirmed reviewing the
    turn right after Dragon Dance showed the correct Atk+1/Spe+1 boosts
    and the pasted EVs/nature; confirmed Garchomp's ability/item showed
    blank when reviewed before being revealed and correctly populated
    when reviewed after; confirmed switching Charizard out and back in
    reset its boosts to 0 in a later review. Full production build
    verified clean (and re-verified after the chunk-isolation fix above).
- **Calc page: bulk-import + saved individual Pokemon sets** (2026-07-13):
  the last item from the 2026-07-07 review batch, previously deferred as
  the largest net-new subsystem in that batch (own persistence layer, new
  UI, a naming scheme). Planned via EnterPlanMode given the size - two
  decisions confirmed with the user first: (1) auto-label each imported set
  from `nickname || species`, deduped with a numeric suffix on collision
  (same "smallest unused N" pattern `ImportTeamModal.tsx::nextGenericTeamName`
  already uses for teams) rather than prompting for a name per Pokemon; (2)
  a dedicated management view rather than inline delete buttons in the load
  picker, combined into one modal alongside the paste-to-import box.
  - **New persistence layer** mirroring `teams.json` exactly: `SavedPokemonEntry`/
    `SavedPokemonDatabase` types (`types/pokemon.ts`), `savedPokemon.json`
    IPC read/write handlers copied verbatim from the teams handlers
    (`main.ts`), matching `any`-typed preload bridge methods
    (`readSavedPokemonDatabase`/`writeSavedPokemonDatabase`), and a new
    `useSavedPokemon.ts` hook mirroring `useTeams.ts`'s load/persist/CRUD
    shape, plus `getSavedSetsForSpecies`.
  - **New `CalcSavedSetsModal.tsx`**: combined paste-to-import (reuses
    `parseShowdownText` + the same per-block `enrichPokemonWithAPI` loop
    `ImportTeamModal.tsx` already uses, no team name/author/format/pokepaste
    fields since those are team-specific) + a management list (rename
    inline, delete, empty-state message matching `PastBattlesList`'s
    convention).
  - **New `CalcSavedSetPicker.tsx`**: the species-search load popover
    ("Blank" + each saved set by label/sprite), opened from
    `CalcPokemonPanel.tsx` only when a real dropdown-list click (not
    typing) lands on a species with 1+ saved sets - required adding an
    optional `onSelect` prop to `CalcAutocomplete.tsx` (fires only from
    `handleSelect`, additive/non-breaking for every other Autocomplete
    usage). Loading a saved set reuses the exact same
    `teamPokemonToCalcUpdates` mapper the existing "Load from Team" tray
    already uses - no new Calc-state mapping logic needed.
  - **Real bug found and fixed during live verification**: the first
    version's `addSavedPokemon` (single-item add, called once per parsed
    Pokemon in the import loop) lost every entry but the last one, even
    with sequential `await`s between calls - each call read `savedPokemon`
    from the same stale render closure (`CalcSavedSetsModal`'s own
    `handleImport` doesn't get a fresh `savedPokemonState` reference
    between iterations of a single continuous async function, regardless
    of awaits), so each call's persist independently overwrote the previous
    one's. Fixed by replacing it with `addSavedPokemonBatch` - enrich all
    parsed Pokemon first, then persist the whole batch in one state
    update/disk write (also deduping labels against each other within the
    same batch, e.g. two pasted Dracovish import as "Dracovish"/
    "Dracovish (2)" correctly). This exact stale-closure pattern likely
    also affects `useTeams.ts`/`useBattles.ts`'s existing mutators when
    called rapidly in succession (observed informally this same session
    with rapid team/battle deletes) - not fixed there since single
    user-driven clicks (with a render in between) don't hit it in
    practice, only a tight programmatic loop does; worth keeping in mind
    if a future feature ever needs to batch-mutate teams/battles the same
    way.
  - Verified live end-to-end: imported 3 Pokemon (two Dracovish with
    different movesets + one Incineroar) via a disposable paste, confirmed
    correct dedup labels; clicking a species from the dropdown (not typing)
    opened the picker only when saved sets existed; picking a saved set
    correctly populated item/ability/nature/moves; typing a species by hand
    never opened the picker; renamed and deleted entries in the management
    modal and confirmed both persisted to `savedPokemon.json` and survived
    a fresh app relaunch; cleaned up all test data afterward. Full
    production build (`npm run build`) also verified clean.
- **Battle Logger: weather move-effects notes** (2026-07-13): distinct
  from `config/moveStatEffects.ts`'s stat-stage table - moves whose
  *non-stat* effect (accuracy, power, healing amount, charge-turn skipping)
  changes with the field's active weather. Scoped first to check overlap
  with the already-built status-condition/move-outcome chips (Miss/Crit/
  Inflict-Status, on `BattlefieldSlot.tsx`) - no overlap found, since those
  are per-target outcome toggles set *after* a hit resolves, while this is
  purely informational and shown *before* logging, with nothing to apply
  (the log doesn't track computed damage/accuracy/heal numbers at all).
  Researched each of the 7 moves' own dedicated Bulbapedia page
  individually rather than a shared summary page (per this project's
  research-technique convention), confirming exact percentages beyond what
  was originally recalled: Thunder/Hurricane 70% base accuracy (always hits
  in Rain, 50% in Sun); Solar Beam (120 BP)/Solar Blade (125 BP) skip their
  charge turn in Sun, halved power in Rain/Sandstorm/Snow; Weather Ball
  doubles 50->100 power in any of the 4 weather types, changing type to
  Water/Fire/Rock/Ice respectively; Synthesis/Moonlight/Morning Sun heal
  50% normally, ~67% (2732/4096) in Sun, 25% in Rain/Sandstorm/Snow;
  Blizzard 70% base accuracy, always hits in Snow. New
  `config/moveWeatherEffects.ts` (`getMoveWeatherNote(move, weather)`,
  plain move-slug -> weather -> note-string lookup, no fake structured
  power/accuracy fields since nothing consumes them numerically) wired into
  `MoveLogPopover.tsx` - each move button shows a small colored badge
  (reusing `getWeatherTheme` from `config/fieldConditions.ts` for the same
  color language as `FieldWeatherBar.tsx`) with the note as its tooltip,
  only when the current move has one for the currently-active weather.
  `weather` threaded down from `BattlefieldSlot.tsx` (already has `battle`
  in scope) as a new `MoveLogPopover` prop. Verified live with a disposable
  4-Pokemon team (a Venusaur running Solar Beam/Synthesis/Weather Ball/Giga
  Drain): under Sun, the first three each showed their correct badge text
  and tooltip while Giga Drain (unaffected) showed none; clearing weather
  removed all three badges. Cleaned up the test battle and team afterward.
- **Teams page: drag-to-reorder teams in the list** (2026-07-13): the
  open design question from when this was scoped (`TeamsPage.tsx` renders
  `filteredTeams`, a subset of the real `teams` array when a format filter
  is active - dragging within a filtered view needed a rule for how that
  maps back onto the full unfiltered storage order) was resolved with the
  user: operate on team IDs against the always-authoritative full `teams`
  array, not positional indices into whatever filtered view is showing. A
  dropped team always lands immediately before the target team's real
  position - hidden (filtered-out) teams keep their exact relative order
  untouched, since only the dragged team's position actually changes. Added
  `reorderTeam(draggedTeamId, targetTeamId)` to `useTeams.ts` (splice by ID
  lookup against the full array, same insert-before-target semantics as
  `useRosterActions.ts::reorderSlot`), a new `utils/teamsListDragTypes.ts`
  MIME-type/payload pair, and wired the drag onto `TeamCard.tsx`'s
  collapsed header bar - always draggable, not gated behind that team's own
  roster-edit mode, since list position and roster editing are unrelated
  toggles. Verified live with 4 disposable teams (2 Reg M-A, 2 Reg M-B
  interleaved as `[A, B, C, D]`): filtered to Reg M-B (showing `[B, D]`),
  dragged D onto B, confirmed both the filtered view and the full `All`
  view updated to `[A, D, B, C]` exactly as designed, checked
  `teams.json` on disk to confirm persistence, then deleted all 4 test
  teams.
- **Teams page: drag-to-reorder a Pokemon within a team** (2026-07-13):
  `TeamCard.tsx`'s roster grid (`PokemonCard.tsx` instances) previously had
  no way to reorder an existing Pokemon - only swap one slot's species
  entirely (`swapSlot`), add, or remove. Added `reorderSlot(team, fromIndex,
  toIndex)` to `useRosterActions.ts` (a plain array splice-out/splice-in),
  a new `utils/teamRosterDragTypes.ts` MIME-type/payload pair matching the
  existing per-feature drag-type convention (`utils/dragTypes.ts` for
  Battle Logger, `utils/calcDragTypes.ts` for Calc's team tray), and wired
  `draggable`/`onDragStart`/`onDragOver`/`onDragLeave`/`onDrop` onto
  `PokemonCard.tsx`'s outer container (only while `isEditing`), with a blue
  ring highlight while a valid drag is over a card. The payload carries
  `teamId` so a stray drag between two different teams' cards (both open in
  edit mode at once) is silently ignored on drop rather than reordering the
  wrong team. Verified live: imported a disposable 3-Pokemon team, dragged
  index 0 onto index 2 via a simulated `DataTransfer`-based drag sequence
  (Playwright can't do real OS-level drag gestures), confirmed the
  resulting order both on screen and in `teams.json` on disk
  (`[Pikachu, Charizard, Bulbasaur]` -> `[Charizard, Bulbasaur, Pikachu]`,
  matching splice semantics), then deleted the disposable team.
- **Battle Logger opponent-vs-player roster row height gap - fixed**
  (2026-07-13): root-caused via live pixel measurement (Playwright driver) -
  `OpponentRowFields.tsx`'s `<select>`/`<input>` cells (ability/item/add-move)
  were missing `block` in their Tailwind classes, so each sat as an
  inline-level element with the default baseline-alignment gap below it (a
  classic "extra space under inline replaced elements" issue) - 6px per
  control × 2 rows (ability, item) = the exact 12px-per-Pokemon gap measured
  (94px vs the player's 82px row height). The player's `PlayerFieldPanel.tsx`
  `StaticCell` never had this problem since it already used `block`. Fix was
  adding `block` to `cellSelectClass` (shared by the ability `<select>` and
  item `<input>`) and switching the "+move" input to reuse that same
  constant instead of its own near-duplicate className string. Verified live
  with a disposable battle + a real opponent Pokemon (Incineroar) with an
  item and move filled in - row heights matched exactly (82px = 82px)
  before and after adding real data.
- **Dead build output (`dist/main/main.js`/`preload.js`) - fixed**
  (2026-07-13): rather than the originally-proposed fix (scoping
  `tsconfig.json`'s `include` away from `src/main/**/*`), added
  `"noEmit": true` to `compilerOptions` instead - that fix would have also
  silently dropped type-checking on `main.ts`/`preload.ts` entirely, since
  `vite-plugin-electron` compiles them via esbuild/rollup with no type
  checking of its own, making the root `tsc` pass the *only* thing
  type-checking the main process. `noEmit` keeps `tsc` checking all of
  `src/**` (including main/preload) while stopping it from emitting
  anything at all, since Vite already owns real build output for both
  processes. Verified: a clean `npm run build` no longer produces
  `dist/main/`, and `npm run type-check` still passes.
- **`useDatabase.ts` `react-hooks/exhaustive-deps` warnings - fixed**
  (2026-07-13): the two warnings (missing `initializeCacheWithSWR`
  dependency on the mount `useEffect`, and on `refreshCache`) existed
  because `initializeCacheWithSWR`/`performBackgroundRevalidation`/
  `cleanExpiredEntriesInternal` were plain functions redefined every
  render, so satisfying the rule honestly (not just suppressing it) meant
  wrapping all three in `useCallback` (bottom-up, since each calls the
  next) so they get stable identities - preserving the original
  run-once-on-mount behavior instead of re-running the effect every
  render. Verified: `npm run lint` and `npm run type-check` both pass
  clean, and a live launch showed the cache still loads correctly (React
  StrictMode's expected dev-only double-invoke of the mount effect was the
  only "duplicate" log observed, pre-existing and unrelated to this fix).
- **`CalcSideConditions.tsx`/`SideConditionsRow.tsx` unification - investigated
  and declined** (2026-07-13): re-read both components to scope the
  long-open TODO item asking to unify them into one shared component.
  They don't actually share much beyond "a button that turns blue when
  active" - `SideConditionsRow` (Battle Logger) is turn-tracked (reads
  `Battle.fieldState` expiry via `getSideConditionRemaining`, has a Light
  Clay screen-extension sub-toggle, cycles stackable hazards 0..max,
  dispatches through named `battleLogActions` methods) while
  `CalcSideConditions` (Calc) is a flat boolean toggle set with no turn
  concept at all, includes calc-only fields (Helping Hand/Protect/Leech
  Seed/Salt Cure/ability-gated aura toggles), and patches state via a
  generic `onChange`. Visual layout also differs on purpose (compact
  horizontal chips vs a full-width vertical column matching the real
  Showdown calc's Field panel). Forcing them into one component would mean
  branching on layout/data-shape/update-mechanism via props - the kind of
  premature abstraction this project's own style rules warn against, since
  it wouldn't remove real duplication, just relocate it into config surface.
  User confirmed dropping full unification when asked; both components stay
  separate as-is.
- **First real installer published: `v0.1.1`** (2026-07-09): once the
  packaging bug below was fixed and verified, cut a proper patch release
  with actual installer assets attached (`ChoiceBuds Setup 0.1.1.exe`,
  `ChoiceBuds 0.1.1.exe`) - `v0.1.0` had only GitHub's auto-generated
  source zip, no real installer. Rebuilt clean from the exact pushed commit
  (not reused from an earlier local build) and smoke-tested once more
  right before publishing. macOS build still not included - needs the
  user's Mac, tracked as a followup, not blocking Windows-only
  friend-testing.
