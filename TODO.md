# ChoiceBuds TODO

Working task list for ongoing/planned work. Keep entries short; put rationale
in a `Why:` line only when it's not obvious from the task itself. Finished
work moves to [COMPLETED.md](COMPLETED.md) once done, so this file stays
focused on what's actually next.

## In progress / up next

- **2026-08-28 manual-testing batch** (offline-testing feedback, not yet
  scoped/fixed):
  1. Regulation Z-A Megas aren't showing up as mega-eligible in the team
     builder, but do show up in Calc - the two surfaces likely read
     mega-eligibility from different/out-of-sync sources; needs
     investigation before a fix.
  2. Item sprites and Mega sprites don't load while offline - likely a gap
     in what the offline-sync/caching pass (`useInitialSync`,
     `pokeapi-cache.json`) actually covers; needs investigation into
     whether these sprite URLs are cached at all.
  3. Team cards render as a 2x3 grid instead of the original 1x6 single-row
     design, even fullscreened on a MacBook - layout regression in the
     Teams page grid, needs a repro + root-cause look (may be
     screen-width/breakpoint-dependent given it reproduced on a laptop
     screen).
  4. Feature request: searching the Pokemon picker by a move name should
     surface every Pokemon that can learn that move, not just exact
     species-name matches.
  5. The "Add Pokemon" box is wider than an actual Pokemon card once one is
     added - visual mismatch, should match card width.
  6. Calc: toggling a Mega off doesn't revert the Pokemon's ability back to
     whatever ability was selected pre-Mega.
  - UI/UX overhaul discussion (flagged in this batch) is now underway - see
    the dedicated entry below.

- **UI/UX overhaul** (raised 2026-08-28, discussion started 2026-08-29):
  user wants the app to stop reading as a "generic vibe-coded Electron app"
  - scope named so far: menuing, color palette, animations, window sizing.
  All five pieces below (Teams page carousel/grid, sidebar/menuing, color
  palette, animation/motion, window sizing) are now **design-approved**
  (2026-08-29) - each designed/discussed via the `design` skill as mockups
  first (supersedes the original "describe in words, iterate in code"
  sequencing note for the pieces that needed visual review; window sizing
  was decisions-only, no mockup needed). **None of the five are implemented
  in real code yet** - this was entirely a design/discussion pass. Next up
  is sequencing an actual implementation-leg breakdown across all five with
  the user before writing any component code.

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
    - **Not yet implemented** - this was a design-mockup pass only, no real
      component code written yet. Needs its own implementation-leg
      breakdown before starting (e.g. coverflow component + Framer Motion
      wiring, header/controls rework, expanded-grid stats restoration,
      responsive grid + drag-reorder gating change) - not yet broken down
      or sequenced with the user.

  - **Sidebar/menuing rework - design approved 2026-08-29**, same artifact
    as above (`SidebarExpanded.dc.html`/`SidebarCollapsed.dc.html`
    artboards). Approved spec, replacing today's `App.tsx` sidebar (flat
    128px-wide text-only nav list, plain "ChoiceBuds" wordmark, debug-y
    status footer):
    - Nav items get a consistent inline-SVG icon set (icon + label) instead
      of text-only - one icon per tab (Teams/Calc/Battle Log/Statistics/
      Type Matchup/Settings). User confirmed the specific icon metaphors
      (grid for Teams, calculator, crossed swords for Battle Log, ascending
      bars for Statistics, shield for Type Matchup, gear for Settings) are
      fine for now with no strong alternatives in mind - **not locked in as
      permanent**, revisit if a better metaphor comes up later, but no
      blocker to using them elsewhere in the app meanwhile (buttons, empty
      states) for icon-language consistency.
    - Sidebar becomes collapsible: a toggle row collapses the ~208px
      expanded sidebar (icon+label) down to a ~68px icon-only rail, with a
      hover flyout tooltip showing the label when collapsed. Ties into the
      window-sizing piece of the overhaul too.
    - `build/icon.png` (the mascot art, previously unused inside the app -
      app-icon/installer only) gets pulled into the sidebar header as a
      small mark next to the "ChoiceBuds" wordmark (hidden, mascot-only, in
      the collapsed rail).
    - Active nav-item indicator changes from today's flat solid-blue fill to
      a softer tinted background + a 3px left accent bar (blue-500),
      consistent with the pill/capsule visual language established in the
      Teams-carousel controls above.
    - The existing status footer (Cache Status / Teams Loaded / Ver X)
      moves out of the sidebar into the Settings page entirely - explicit
      user call, to keep the sidebar pure navigation.
    - Deliberately did **not** touch sidebar/shell colors in this pass
      (kept today's gray-800/900/700 + blue tokens from the live `App.tsx`
      rather than the zinc tones used in the Teams-carousel mockup) - color
      palette is still its own separate, not-yet-discussed piece of the
      overhaul; didn't want to sneak a palette change in via the menuing
      pass.
    - **Not yet implemented** - design-mockup pass only, no code written.
    - **Superseded by the color-palette pass below**: the "kept blue" call
      above no longer holds now that gold/royal-purple is approved (next
      entry) - the sidebar's active-nav accent (today described as a
      blue-tinted background + blue-500 left bar) should use gold instead
      when this is implemented, matching the palette entry's token mapping.

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
  - **Animation/motion language - design approved 2026-08-29**, same
    artifact, four new artboards built as **live, clickable demos** (real
    CSS transitions standing in for the actual Framer Motion timings/
    easings, since motion can't be judged from a static screenshot) -
    `ModalDemo.dc.html`, `CardExpandDemo.dc.html`, `SidebarDemo.dc.html`,
    `DragReorderDemo.dc.html`. Current baseline (confirmed by grepping the
    renderer): the app has almost no motion today - a few Tailwind
    `transition-all`/`transition-colors` hover fades, two loading spinners,
    one `animate-pulse` badge. No modal enter/exit, no tab-switch
    transition (`App.tsx` just flips `display:none`/`block`), no card
    expand/collapse animation, no drag-reorder repositioning animation.
    Approved spec:
    - **Framer Motion becomes the app's general-purpose animation
      library** (not scoped to just the Teams-carousel coverflow as
      originally planned) - one consistent motion engine/vocabulary for
      modal transitions, card expand/collapse, sidebar collapse, and
      drag-reorder, instead of ad hoc CSS per interaction.
    - **Duration/easing scale** (demoed live, not just described): micro
      ~150ms for hover/press micro-interactions; standard 200-280ms for
      modals, card-expand height, and content fades; deliberate 320-340ms
      for sidebar width and drag-reorder list repositioning (bigger layout
      shifts get more time). Entrances ease-out (decelerate in); exits
      ease-in and noticeably faster than the matching entrance (a modal's
      150ms close vs. its 200ms open, for instance) - dismissal should
      feel snappier than appearance.
    - **`prefers-reduced-motion` should collapse all of the above toward
      near-instant** - explicitly not built into any of the demos (those
      are for judging feel), but a firm rule to carry into implementation,
      not an afterthought.
    - **Card expand/collapse** uses a `grid-template-rows: 0fr -> 1fr` CSS
      trick for a genuinely transitionable height (plain `height: auto`
      isn't animatable) - worth carrying into the real Framer Motion
      implementation's approach (or using Framer's own `layout` prop,
      whichever ends up cleaner in React) rather than measuring pixel
      heights in JS.
    - **Drag-reorder** demoed with up/down buttons instead of real
      HTML5 drag events (unreliable in the sandboxed iframe this preview
      runs in) - the actual thing demonstrated (both the moved row and
      whichever row it swaps with animating to their new slot via a shared
      position transition, not an instant re-sort) is exactly what Framer
      Motion's `layout` animation gives for free on a real drop.
    - **Small addition approved same session**: sidebar nav icons get a
      150ms hover-magnify (`scale(1.18)`), same micro-interaction duration
      bucket as everything else at that scale - added retroactively to all
      three sidebar artboards (`SidebarExpanded`/`SidebarCollapsed`/
      `SidebarDemo`), plus a subtle background-tint hover state for
      inactive nav items that hadn't had one before.
    - **Not yet implemented** - design-mockup pass only (interactive demos,
      not production code). Needs its own implementation-leg breakdown,
      likely threaded through each of the other three approved pieces'
      legs rather than being one standalone leg (e.g. the sidebar's own
      implementation leg is where its collapse animation actually gets
      built) - not yet sequenced with the user.

  - **Window sizing - decisions approved 2026-08-29** (behavioral, no
    mockup - nothing here is a visual design question). Today's baseline
    (`main.ts`): the window is created at exactly `1280x720` with
    `minWidth`/`minHeight` both also `1280x720` - it always launches at its
    own floor and can never be resized smaller (no cap on growing larger).
    Approved:
    - **Keep the 1280x720 floor as-is, for now** - explicit user call.
      Real tension surfaced before deciding: the sidebar rail + more
      compact Teams cards free up horizontal room that could justify a
      smaller floor, but Calc and Battle Log already scroll a bit at
      today's exact 1280x720 floor (see the 2026-07-07 review-pass entries
      above - both stopped short deliberately, not fully solved) - they're
      still the binding constraint regardless of the other pieces' wins,
      so lowering the floor now would just make their existing scroll
      worse. Revisit if/when Calc/Battle Log get their own tightening pass.
    - **Persist window size/position across launches** - the app should
      remember the last size/position (via `useSettings`/`settings.json`,
      restored on next launch) instead of always opening at the fixed
      default. Real behavior change from today - not yet implemented.
    - **Teams-page grid caps at 2 columns, no matter how wide the window
      gets** - explicit user call over adding a 3rd-column tier for very
      wide/ultrawide monitors, to keep card width comfortable/consistent
      rather than stretching or multiplying further.
    - **Not yet implemented** - decisions only, no code written.

- **Adopt testing + verification workflow from GW2 Squaded** (decided
  2026-08-29): this repo has no wired-up test runner today (see the
  Commands section above).
  1. **Done (2026-08-29)** - Vitest wired up (`vitest.config.ts` +
     `npm run test`/`test:watch`), config matched to the GW2 Squaded
     project's own setup (Node environment, `@` alias carried over from
     `vite.config.ts` even though nothing needs it yet). `services/parser.ts`
     is the first module covered - its old placeholder console.log-assertions
     script (`parser.test.ts`) is now 18 real `describe`/`it` Vitest cases,
     all passing; `type-check`/`build` still clean.
  1b. **Done (2026-08-29), leg 2** - the rest of `utils/`'s pure functions
     now covered: `tagSearch`, `displayName`, `spriteUrl`,
     `measureDropdownHeight`, `statAlignment`, `pokemonRules`,
     `teamValidation`, `typeCoverage`, `battleSets`, `calcFormes`,
     `championsStats`, `calcExport`, `calcTeamImport`, `cacheManager`
     (including `runCachedFetch`'s async/error-branch orchestration via
     `vi.fn()`-mocked setState functions - no real React needed), and
     `battleStats` (the Statistics page's aggregations) - 15 new test files,
     159 new cases, all passing; `type-check`/`lint`/`build` all still clean.
     Deliberately skipped: `appVersion.ts`/`cacheExpiry.ts` (single
     constants, nothing to assert) and the `*DragTypes.ts` files (just
     react-dnd MIME-type constants/interfaces, same reasoning); services/
     (besides `parser.ts`) are all live-`fetch` wrappers (`pokeapi.ts`,
     `pokeapiService.ts`, `syncApi.ts`, `github.ts`, `pokepaste.ts`,
     `championsBattleData.ts`) or PDF generation (`teamSheetPdf.ts`), not
     pure functions, so out of scope for unit tests without a mocking layer
     not yet built. Also deliberately skipped: `battleLookup.ts` and
     `battleCalcReview.ts` - both are Battle-Logger-turn-log-internals (see
     the "Battle Logger: retire live turn-by-turn logging" entry below,
     which plans to drop this exact code from active use) - not worth
     investing test-writing effort into what's slated to be archived soon.
     **Not yet done**: hooks (deferred further per the file's own original
     note - pure functions were always meant to come first). Not yet wired
     into CI either.
  1c. **Done (2026-08-29), leg 3** - hooks coverage started. New test infra
     first: `vitest.config.ts` switched from `environment: 'node'` to
     `'jsdom'` (hooks render real effects/refs against a DOM; the existing
     pure-function tests run fine under jsdom too, so one shared environment
     was simpler than splitting by glob) plus `@testing-library/react`
     (`renderHook`/`act`) and `jsdom` added as devDependencies. A new
     `src/renderer/test/setupElectronMock.ts`, wired in via `setupFiles`,
     stubs `window.electron` with `vi.fn()` mocks (reset fresh before every
     test) since jsdom has no real Electron main process to back the
     preload bridge. Sequencing decided with the user before writing any
     tests (two explicit calls, not assumed): skip the 3 Battle-Logger-only
     hooks (`useBattleLogActions.ts` - 1001 lines, `useBattles.ts`,
     `useMoveNameList.ts`) for the same reason leg 2 skipped
     `battleLookup.ts`/`battleCalcReview.ts` - that whole feature is already
     slated for retirement (see the dedicated TODO entry below), not worth
     investing test-writing effort into; and size this leg to the ~8
     simplest/self-contained remaining hooks, saving the big
     stateful/IPC-heavy ones for a future leg. Covered this leg: 8 new test
     files, 54 new cases, all passing - `useDismissable`, `useHoldRepeat`
     (fake timers), `usePokemonTypeFilter`/`useMegaSprite` (mocked
     `pokeapiService.fetchJSON`, module-level-cache-aware via
     never-reused-per-test cache keys), `useSeasonDataCheck` (fake
     `Date.now()` via `vi.setSystemTime`), `useTeamMoveTypes` (mocked
     `UseGameDataReturn.getMoveData`, verifies status-move exclusion +
     `typeChangingAbilities.ts` integration), `useSpriteCache` and
     `useUpdateCheck` (both exercise the `window.electron` mock directly,
     the latter also mocks `services/github.ts`). `type-check`/`lint`/
     `build` all still clean. **Not yet done at the time**: the 11 remaining
     hooks (`useTeams`, `useSettings`, `useDatabase`, `useGameData`,
     `useSync`, `useInitialSync`, `useSavedPokemon`, `useSpeciesRoster`,
     `useRosterActions`, `useActiveEditor`, `useDamageCalc`,
     `usePokemonTypeFilter`'s sibling `useMoveNameList` intentionally
     excluded above) - a future leg 4, sized down into sub-legs below.
  1d. **Done (2026-08-29), leg 4a** - leg 4 (2822 lines across the 11 hooks
     above) sized down into sub-legs by kind (decided with the user before
     writing any tests, same as leg 3's sequencing): 4a covers the simpler
     CRUD/load-on-mount hooks (`useSettings`, `useSpeciesRoster`,
     `useRosterActions`, `useSavedPokemon`, `useTeams`); 4b
     (persisted-cache/IPC: `useDatabase`, `useGameData`), 4c
     (sync-orchestration: `useSync`, `useInitialSync`), and 4d
     (draft/editor-state: `useActiveEditor`, `useDamageCalc` - the biggest
     and most complex) are still open. 5 new test files, 40 new cases, all
     passing - `useSettings` (default-merge-over-persisted-partial,
     write-failure-leaves-state-untouched), `useSpeciesRoster` (mocked
     `pokeapiService.fetchJSON`, real `localStorage` exercised directly -
     Mega-form filtering, display-name casing, cache-hit-skips-refetch,
     corrupted-cache-JSON treated as a miss), `useRosterActions` (mocked
     `updateTeam`/cache getter-setter/`getEnrichedSpeciesOptions`/
     `getChampionsUsage` injected params - `getCachedEntry` always returns a
     hit so `enrichPokemonWithAPI`'s real code runs with no network needed;
     covers usage-based move/ability sort overriding learnset order, the
     6-Pokemon-cap refusal, remove/reorder index math), `useSavedPokemon` and
     `useTeams` (both mirror the already-covered load/persist/CRUD shape,
     covering the batch-label-dedupe logic and reorder-insert-before-target
     semantics unique to each). `type-check`/`lint`/`build` all still clean.
  1e. **Done (2026-08-29), leg 4b** - persisted-cache/IPC hooks:
     `useDatabase` (12 cases) and `useGameData` (25 cases), 37 new cases, all
     passing. `useDatabase`: SWR init (instant-serve-then-background-clean),
     empty-cache bootstrap + persist when nothing's on disk, read-failure
     still initializes, background revalidation actually deletes expired
     entries once `lastCleaned` is 7+ days stale, species-key
     normalization, expired-entry-is-a-miss, write-failure leaves state
     untouched, `cleanExpiredEntries`/`clearCache`/`refreshCache`, and
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
     only firing when `hasChampionsMoveData` is false (confirmed via
     Tera Blast survival/removal), `getEnrichedSpeciesOptions`'
     usage-percentage sort overriding learnset order (mirrors
     `useRosterActions.test.ts`'s equivalent case), the VGC-items
     background-fill effect synthesizing empty-`spriteUrl` placeholders
     for every configured item PokeAPI has no data for (real `VGC_ITEMS`
     imported, not hand-picked) and confirming those placeholders are
     excluded from the computed `items` list, `getChampionsUsage`'s
     null-is-not-an-error contract, and `getUnsyncedSpecies`/
     `markSpeciesSynced`. One real testing gotcha hit and fixed: calling
     `result.current.someAsyncFn()` and then immediately reading a
     `getCached*` getter in the same tick raced ahead of React's state
     flush and saw stale cache (a second `getMoveData` call still
     re-fetched instead of hitting the freshly-written cache) - fixed by
     asserting the post-write cache read through `waitFor(...)` instead of
     reading `result.current` synchronously right after the awaited call,
     rather than wrapping every such call in `act()` (which also hit an
     unrelated TS control-flow quirk narrowing the awaited result to
     `never` when reassigned from inside an `act(async () => ...)`
     closure). `type-check`/`lint`/`build` all still clean. **Not yet
     done at the time**: 4c (`useSync`, `useInitialSync`) and 4d
     (`useActiveEditor`, `useDamageCalc`).
  1f. **Done (2026-08-29), leg 4c** - sync-orchestration hooks: `useSync`
     (26 cases) and `useInitialSync` (9 cases), 35 new cases, all passing.
     `useSync` takes its 3 collaborator hooks' full return objects
     (`UseSettingsReturn`/`UseTeamsReturn`/`UseBattlesReturn`) as params, so
     `setup()` builds hand-rolled fakes for all three rather than mocking a
     service boundary; `services/syncApi.ts`'s `pushSyncData`/`pullSyncData`
     are the only real `vi.mock`. Covers all 4 status branches
     (never-synced short-circuiting before any network call when
     push/pull timestamps are both still null, up-to-date, unpulled-changes,
     unpushed-changes) plus a throw-during-refresh case proving a failed
     status check degrades to 'unknown' silently rather than crashing or
     surfacing as `error`; `createIdentifier`'s username sanitization,
     discriminator-collision retry (asserts the retried candidate actually
     differs from the first, not a specific value), exhausting all
     `MAX_DISCRIMINATOR_ATTEMPTS`, and availability-check-throws paths;
     `pairExistingIdentifier`/`forgetIdentifier`; and `push`/`pull`'s
     needs-pull-first/needs-push-first refusals, `force` actually bypassing
     the freshness check (proven by configuring the remote as if always
     newer and asserting a forced push still succeeds, rather than a
     brittle call-count assertion, since a successful push's own post-hoc
     status refresh legitimately calls `pullSyncData` too), and error-path
     handling. One real gotcha: an early "force skips" case asserted
     `pullSyncData` was never called at all under `force: true`, which
     flaked - `push()`'s own trailing `refreshStatus({ lastPushedAt })`
     call still invokes it as part of computing post-push status, so
     absence-of-call was the wrong signal; asserting the outcome instead
     (succeeds despite a remote that would otherwise block) is what's
     actually being guaranteed. Also had to add an explicit
     `await waitFor(() => status !== 'unknown')` before exercising
     `forgetIdentifier` in isolation - without it, the mount-time status
     refresh (already in flight) could resolve after `forgetIdentifier`'s
     own `setStatus('never-synced')`, and clobber it back to whatever the
     mount computed. `useInitialSync` mocks only `validateSpeciesLegality`
     (`utils/pokemonRules`) and `fetchPokemonData` (`services/pokeapi`, kept
     `normalizeSpeciesForAPI` real via `importOriginal`) - the 4 collaborator
     hooks it takes as params are the same hand-rolled-fake pattern as
     `useSync`. Covers the not-ready gate (each of roster-loading/empty-roster/
     gameData-uninitialized/database-uninitialized), the zero-network
     already-synced fast path, REG-MB legality filtering before diffing
     against `getUnsyncedSpecies`, a full sync pass asserting every stage
     (sprite downloads for both normal+shiny per species, learnset+species-
     stats fetch per species, real `VGC_ITEMS` iterated for item sprites,
     final `markSpeciesSynced` call and terminal progress state), the
     already-cached-species skip in `syncSpeciesStats`, an item with no
     `spriteUrl` never reaching `downloadSprite`, and one species failing
     mid-sync not aborting the rest (per-item `runWithConcurrency` catch).
     `type-check`/`lint`/`build` all still clean. **Not yet done**: 4d
     (`useActiveEditor`, `useDamageCalc` - the biggest and most complex,
     saved for last as originally sequenced).
  1g. **Done (2026-08-29), leg 4d** - draft/editor-state hooks, closing out
     leg 4 (and the hooks pass as a whole): `useActiveEditor` (22 cases) and
     `useDamageCalc` (30 cases), 52 new cases, all passing.
     `useActiveEditor`: deep-clone isolation on `enterEditMode` (mutating the
     original after cloning doesn't leak into the draft, verified on the
     nested `evs`/`moves` arrays specifically, not just a shallow `toEqual`),
     tolerating a missing `calculatedStats`, every `update*` setter (including
     the empty-string-clears-to-`undefined` convention shared by
     nickname/gender/item/ability/teraType/nature, the level 1-100 and
     happiness 0-255 clamps, the 4-move truncation on `updateMoves`, and
     `updateMove`'s out-of-range-index no-op), `update*` calls before
     `enterEditMode` being a no-op (no draft to mutate), `getCommittableData`/
     `hasUnsavedChanges`/`discardChanges`, and re-entering edit mode for a
     different Pokemon replacing the draft and resetting `isDirty`.
     `useDamageCalc` (the big one - real `@smogon/calc` Gen 9 data used
     throughout, not mocked, matching the file's own doc comment on why:
     `calculate()` matches names against its own internal data layer, so a
     fake would risk testing nothing real): regulation-filtered
     `speciesOptions` via the real `validateSpeciesLegality` allowlists
     (Gengar REG-MA-legal, Swampert REG-MB-only, Mewtwo legal in neither),
     sorted item/ability/nature option lists, `setPokemon1/2`/
     `setPokemon1Move/2`/`setField`/`setPokemon1Side/2` all merging partial
     updates without disturbing sibling state, `pokemon*BaseStats`/
     `NatureEffect` wiring, and `computeBoostedStats`'s full stack proven
     against real computed numbers (not just "it changed"): a known
     base+SPs+nature raw stat (Gengar's level-50 zero-SP Speed is 130), a
     stage-boost multiplier floored both up and down, a weather-matching
     ability doubling Speed only when the field weather actually matches,
     paralysis halving, and weather-boost-before-paralysis-halving as a
     single combined case (floor(floor(130*2)/2) lands back on 130, which
     wouldn't happen if the order were reversed) - matching the function's
     own doc comment on real-game modifier ordering. `p1Results`/`p2Results`:
     empty entries with no species set, a real Gengar-vs-Garchomp Shadow Ball
     calculation asserted against hand-verified numbers (range, percent
     string, kochance text, deduped/sorted possibleDamages - all pulled from
     a one-off Node probe script run directly against the installed
     `@smogon/calc` package rather than hand-computed, so the fixture itself
     is real-engine-verified), a crit slot producing a higher range, a
     multihit move's `multihitRange`/engine-default `effectiveHits` and an
     explicit `hits` override, and an unresolvable species string producing
     an error entry for every move slot on that side (proven via `buildPokemon`
     actually throwing on a garbage species, not asserted from reading the
     code). `selectedResult`/`selectedEntry` including the out-of-range-index
     case. The learned-moveset-filtering effect (`pokemon1MoveOptions`/
     `pokemon2MoveOptions`): same-reference passthrough when unfiltered
     (`toBe`, not `toEqual` - the hook returns `moveOptions` itself rather
     than a copy when there's no learned-set to filter by), the real filter
     applying once the fetch resolves, falling back to the full list on a
     no-real-move-name-intersects miss and on a rejected fetch, the
     render-time-effect clear-on-empty-species behavior, and (the one real
     gotcha worth calling out) a stale in-flight fetch losing a race against
     a newer species change - built with hand-rolled deferred promises so the
     stale fetch could be resolved *after* the newer one had already been
     kicked off, proving the `cancelled` flag in the effect's cleanup
     actually suppresses the stale write rather than just asserting the final
     state is correct by coincidence. `type-check`/`lint`/`build` all still
     clean. This closes out leg 4 (2822 lines across all 11 hooks) and the
     hooks-coverage pass entered in leg 3 - every hook in `src/renderer/
     hooks/` is now covered except the 3 Battle-Logger-only ones deliberately
     skipped in leg 3 for the same already-slated-for-retirement reason.
  2. Separately, a GW2-Squaded-style standalone audit script (in the mold
     of its `scripts/audit-data-completeness.ts`) that scans this repo's
     own hand-curated config tables (`config/championsMoveOverrides.ts`,
     `config/moveStatEffects.ts`, `config/onSwitchInAbilities.ts`, etc.)
     for structural gaps, complementing (not replacing) the
     comprehensive-coverage rule already in CLAUDE.md's Style rules for
     those files. Not started.
  - Why: user has been running this exact combination (Vitest unit tests +
    standalone data-completeness audit scripts) on GW2 Squaded and wants
    the same rigor here.

- **Battle Logger: retire live turn-by-turn logging + stat-inference,
  replace with a lightweight post-match record** (decided 2026-08-29, not
  yet scoped/started): user's interest in the live-logging concept has
  dwindled. Reasoning worked through in conversation: any inference-quality
  data capture for a real (cartridge/Switch) Champions match is inherently
  either live-and-distracting (costs attention during play) or
  after-the-fact-and-unreliable (relies on memory) - there's no
  automatable data source to lean on instead (no official API, no replay
  system, no exportable battle log), so neither horn of that tradeoff is
  fixable with a better UI. A Showdown-log-based post-battle version was
  also considered and rejected: Champions isn't simulated by Showdown, so
  replaying a Showdown log would just be replicating Showdown itself, not
  adding anything Champions-specific. Decision: drop the turn-by-turn
  logging + stat-inference feature (BattlefieldSlot, TurnLog,
  LikelySetsPopover, useBattleLogActions, and the whole
  championsbattledata.com-backed inference layer) from active use, but
  **archive rather than delete** the implementation in case Champions ever
  exposes real match data/replays later. Replace it with a much lighter
  post-match record: a ~30-second entry logged after a game ends (final
  teams, result, freeform notes) that tolerates "good enough" memory since
  it's no longer feeding live inference - feeds only the Statistics/
  season-breakdown page, not any in-battle assistance.
  - **Not yet scoped** - needs its own planning pass before implementation:
    - What "archive" means concretely (a separate branch/tag, a code
      folder moved out of the active build, a feature flag, something
      else) - whatever it is, it needs to actually stay recoverable, not
      just deleted-and-in-git-history.
    - The new lightweight record feature's actual design: where it fits in
      the app relative to the existing Teams/Battle Log navigation, what
      fields it captures beyond "teams, result, notes," whether it's a new
      page or replaces the Battle Logger entry point, and what happens to
      the existing Battle Log data already saved by users under the old
      shape.

- ~~**2026-07-20 manual-testing batch**~~ **Done 2026-07-20** - all 6 items
  (move/ability usage-% ordering in the team editor, Calc tab-switch state
  loss, Make It Rain's missing stat drop, Battle Logger sleep wake-up/
  counter, the post-faint switch-in turn-timing bug, and the Calc Mega
  toggle not updating abilities) - see COMPLETED.md for the full
  implementation + live-verification trail on each.

- ~~Team edit mode: drag-to-reorder the 4 moves within a Pokemon's
  moveset~~ **Done 2026-07-19** - see COMPLETED.md.

- ~~PokeAPI now has a real `champions` version group - dedicated pass to map
  out how much hand-maintained config it could replace~~ **Investigated
  2026-07-19, resolved as "keep both layers, PokeAPI data can't fully
  replace either."** Full findings (queried live, not guessed):
  - **Species legality**: the `champions` pokedex (`/api/v2/pokedex/36`, 208
    entries) is a **perfect 1:1 match** with the combined REG-MA + REG-MB
    base-species set in `utils/pokemonRules.ts` - zero species missing
    either direction. Strong live validation that the Serebii-sourced
    allowlist is accurate. But the pokedex only models base species, not
    regulation history (M-A vs M-B split) or per-variety legality (regional
    forms, gender-locked movesets, Palafin Zero-only, Aegislash
    Blade/Shield) - so it can confirm the hand list, not replace it; the app
    needs granularity PokeAPI's pokedex doesn't carry.
  - **Move-learnability (`champions`-tagged moves)**: real per-species data,
    but coverage is incomplete in a very specific, explicable way - checked
    all 231 legal species/varieties live, 208 (90%) have at least one
    `champions`-tagged move, and the 23 with zero are **exactly the 22
    Regulation M-B-added species plus Floette**. PokeAPI's tagging clearly
    lags the newest regulation's additions specifically - confirms
    `championsMovepoolChanges.ts`'s hand table still earns its keep, most of
    all for M-B's new species, on top of the narrow-fix fallback already
    live in `pokeapiService.ts`.
  - **Sharpedo/Thief conflict, resolved same day**: spot-checked Sharpedo
    (which PokeAPI does tag) - its `champions` move list still includes
    `thief`, but `championsMovepoolChanges.ts`'s
    `CHAMPIONS_MOVEPOOL_REMOVALS.sharpedo` (RoiDadadou-spreadsheet-sourced)
    said Champions removed Thief from Sharpedo. User confirmed in-game:
    Sharpedo does have Thief - PokeAPI was right, the spreadsheet was wrong.
    User's call: trust PokeAPI over the spreadsheet wherever PokeAPI has
    live `champions`-tag coverage; the spreadsheet was only ever load-bearing
    for the gap PokeAPI hasn't back-filled (Reg M-B's new species). Acted on
    immediately (same day, see below) rather than left open: `useGameData.ts`
    now only applies `championsMovepoolChanges.ts`'s corrections when
    `SpeciesLearnsetEntry.hasChampionsMoveData` is false (a new field set by
    `fetchSpeciesLearnset`), and the file itself was pruned from ~208
    species down to exactly the 22 Reg M-B species + Floette found above -
    unreachable entries for PokeAPI-covered species were deleted outright
    rather than left as dead weight/a future footgun. Also separately found
    Sharpedo's PokeAPI move data has zero `scarlet-violet`-tagged moves (an
    unrelated PokeAPI data gap, doesn't affect the above). Live-verified
    post-fix: Sharpedo/Mimikyu now trust PokeAPI directly (Thief present,
    hand table not consulted); Gholdengo/Pyroar still correctly get the hand
    table's corrections (Gholdengo gains Surf/loses Thunder Wave, Pyroar
    gains Iron Tail/Payback/Scorching Sands and loses Work Up) since PokeAPI
    still has no `champions` tag data for either. Old 30-day-cached learnset
    entries predating the new field are treated as a cache miss (same
    pattern as `getCachedMove`'s `target`/`meta` self-heal) so this takes
    effect on next fetch rather than waiting out the cache TTL. Revisit
    `championsMovepoolChanges.ts` (or delete it outright) once PokeAPI
    back-fills `champions` tags for these 23 species too - the live coverage
    check from this pass is easy to re-run to find out.
  - **Real bug found as a side effect, fixed same day**: auditing
    `normalizeSpeciesForAPI` (`services/pokeapi.ts`) for this pass surfaced
    that Gourgeist, Lycanroc, Maushold, **Mimikyu**, Morpeko, and Pyroar all
    have no bare PokeAPI `/pokemon/` slug (only their default-variety forme,
    e.g. `mimikyu-disguised`) - same class of gap as the already-handled
    Aegislash/Palafin cases, just never caught for these six. Confirmed live
    404s before the fix. Since Showdown/pokepast.es exports these by bare
    name for their default forme, this was a real, silent import-enrichment
    failure - notably for Mimikyu, an extremely common VGC pick. Also fixed
    the 3 Paldean Tauros breeds' non-"-breed" spelling
    (`tauros-paldea-combat` etc., the form `@smogon/calc` uses) the same
    way. All 9 added to `normalizeSpeciesForAPI`'s `formMappings`.

- **2026-07-19 manual-testing batch** (scoped out 2026-07-19 against the
  actual code; items 1, 3, 4, 6, 8 are done - see COMPLETED.md for the full
  implementation + live-verification trail. Remaining, not yet
  implemented:)
  2. ~~Offline support~~ **Done 2026-07-19** - see COMPLETED.md. Initial
     plan (a build-time-bundled installer snapshot) was rejected by the
     user in favor of what actually shipped: one comprehensive **live**
     sync on first launch, then zero network needed for anything except
     (a) syncing newly-legal species from a future regulation update and
     (b) Champions usage data's existing 5-day refresh. Covers item 7
     below too (same root cause).
  5. ~~Calc auto-fill from usage data, then export to Saved Sets~~ **Done
     2026-07-19** - see COMPLETED.md.
  7. ~~Battle Logger's move list and enemy-species picker feel slow~~
     **Done 2026-07-19** - same root cause as item 2, resolved by that
     item's fix (see COMPLETED.md).
  9. ~~New feature: standalone type-matchup calculator~~ **Done
     2026-07-19** - see COMPLETED.md. Rebuilt same-day into a team-driven
     Offensive/Defensive Coverage view (vgcmulticalc.com-style, per user
     request) - also see COMPLETED.md. ~~Open follow-up: type-changing
     abilities~~ **Done 2026-07-19** - see COMPLETED.md.

- ~~Newly discovered bug: Palafin can't be added as a Battle Logger opponent
  at all~~ **Fixed 2026-07-19** - see COMPLETED.md's "2026-07-19
  manual-testing batch, quick-wins pass" entry (item 4: PokeAPI only
  exposes `palafin-zero`/`palafin-hero`, no bare `palafin`; the legal
  species list now uses `palafin-zero`).

- **Battle Logger: Miss/Crit/No Effect/Blocked outcome UX redesign** (raised
  2026-07-16, 3-part plan, tackling in order):
  1. **Done (2026-07-16)** - moved the outcome-confirmation chips from
     persistent per-slot buttons on the target's own BattlefieldSlot (easy
     to lose track of - see COMPLETED.md's "generic No Effect/Blocked
     (Ability) outcome chips" entry from earlier the same day) into a new
     inline `MoveOutcomePrompt` shown immediately after logging any move
     with at least one target, supporting multi-target/spread moves
     (Rock Slide, Earthquake, etc.) with one independently-toggleable row
     per target. See COMPLETED.md for the implementation trail.
  2. **Done (2026-07-16)** - ability-based blocking: a researched
     move-blocking-ability table (`config/moveBlockingAbilities.ts`) plus an
     unrevealed-ability picker in `MoveOutcomePrompt.tsx` that reveals the
     ability and sets the outcome to Blocked in one atomic action. See
     COMPLETED.md for the implementation trail, the deliberately-excluded
     ability categories, and a pre-existing (not introduced by this change)
     stat-drop/auto-apply-ordering gap surfaced while live-testing it.
  3. **Done (2026-07-16)** - multi-hit move logging (Population Bomb,
     Triple Axel, Bullet Seed, etc.). See COMPLETED.md.

- **RoiDadadou spreadsheet - reliability is mixed, tab by tab**: got direct
  sheet access via its CSV export endpoint (19 tabs total). Two tabs
  processed and trusted (`Pokémon Ch.` - see COMPLETED.md); one tab actively
  distrusted and dropped (`Moves Deleted` - conflated roster gaps with real
  move deletions, flagged real moves like Rage Fist/Make It Rain as "not in
  Champions"); one tab fetched but superseded by a better one
  (`Learnset` - a raw per-species dump, not a diff; `Pokémon Ch.` has the
  same info pre-diffed against SV/historical movepools, so `Learnset` isn't
  needed). The user's own read on the source overall: "the more we look at
  this spreadsheet the less reliable I am finding it" - so still worth
  spot-checking any single entry against Serebii/Bulbapedia/in-game play
  if something looks off, rather than trusting it blindly just because one
  tab (`Pokémon Ch.`) held up well. Untouched tabs if ever needed: `Items`,
  `Ability Ch.`, `Mégas`, `New Moves`, `New Abilities`, `Tierlist`, `Dex
  Entries`, `Update Status`.

- **Battle Logger - beyond the core MVP**: field/side-condition tracking,
  battlefield redesign Stage 1, Stage 2's interactive click-to-log flow,
  the layout/drag-to-field/stat-stage-tracking follow-up, the mega/
  reactive-ability/more-switch-in-abilities/field-effects-relocation pass,
  the turn-action-economy/persistent-slots/move-autofill/auto-field-
  effects pass, the type-effectiveness/opponent-pickers/screen-
  duration/mega-ability/auto-scroll/faint-relocation/stat-changing-moves
  pass, status-condition tracking + move-outcome chips, the self-targeting
  fix, and the per-target crit/miss + chip-placement follow-up are all done
  (see COMPLETED.md). Post-battle damage-calc review and Bo3 "set" grouping
  across games are also done (both 2026-07-13, see COMPLETED.md). Still
  open: the stat-inference idea. Data source unblocked and Phase 1 (of a
  3-phase plan) shipped 2026-07-16 - see COMPLETED.md for the full
  implementation trail. Phase 2 (Item/Moves/Nature/Stat Points sections in
  the same popover, beyond Phase 1's Ability-only slice) also shipped
  2026-07-16, see COMPLETED.md. Phase 3's loading-state treatment and wider
  empirical species coverage (2 of its 3 polish items) are also done, see
  COMPLETED.md - by explicit user choice, tackled one item at a time rather
  than all three together. TTL tuning (the 3rd polish item) is also done
  2026-07-20, see COMPLETED.md - Phase 3 is now fully complete. Calc-page integration
  (the planned fast-follow reusing the same data layer) is done, see
  above's "2026-07-19 manual-testing batch" item 5 and COMPLETED.md.
  Explicitly out of scope for now: the
  `teammate` usage category, and adding `nature`/`evs` fields to
  `OpponentPokemonEntry`. Synthesizing turn-log entries when a
  field condition changes is done (2026-07-15, see COMPLETED.md). Generic
  lightweight per-target outcome tags (No Effect/Blocked (Ability), added
  alongside the existing Miss/Crit chips) are done (2026-07-16, see
  COMPLETED.md). Download's ability effect
  (deliberately excluded from the switch-in effects table - its target
  stat depends on comparing the opposing side's average Def/SpDef, needs
  base-stat math not taken on yet).

- Everything else from the original 9-item roadmap discussion not yet
  built, reordered by priority: Statistics page (#9) done, Settings page
  (#4) shell + default-regulation setting done, cross-device sync (#2) code
  done - see COMPLETED.md; further Calc UI cleanup (#3) - overlaps with
  Calc work already in flight elsewhere in this file; general UI polish
  (#1) - the Teams/Battle Log list-row redesign (2026-07-14, see
  COMPLETED.md) is the first concrete scoping of this; the team-notes UI and
  team image export (2026-07-15, see COMPLETED.md) are the second - still
  open beyond that: nothing else scoped yet; Limitless usage data (#7) - blocked
  externally on API key approval, can't start regardless of priority.

- **Season-level breakdowns (Statistics page)**: a "By Season" breakdown
  panel is done (2026-07-13, see COMPLETED.md) - derives each battle's
  season from its existing `date` timestamp against a new static
  `config/seasons.ts` table, no schema change/migration needed. The
  page-wide season filter is also done (2026-07-15, see COMPLETED.md). The
  related "Check for Updates" reminder tool below is done too, see
  COMPLETED.md. Nothing left open on this thread.
  - **Researched 2026-07-08** (Bulbapedia + Serebii, one-off manual check
    per CLAUDE.md's external-source policy - not a live fetch): confirmed
    season date ranges exist and are trackable. Serebii was more current
    than Bulbapedia's dedicated season-list page, which hadn't been
    updated with the newest season yet at check time - worth checking both
    when this gets built, not just one.
    | Season | Regulation | Start | End |
    |---|---|---|---|
    | M-1 | Reg M-A | 2026-04-08 | 2026-05-13 |
    | M-2 | Reg M-A | 2026-05-13 | 2026-06-17 |
    | M-3 | Reg M-B | 2026-06-17 | 2026-07-08 |
    | M-4 | Reg M-B | 2026-07-08 | 2026-08-05 |
    | M-5 (expected, unconfirmed) | Reg M-B | ~2026-08-05 | 2026-09-02 (Reg M-B's own published end date) |

    M-5's exact dates aren't published by either source yet - the above is
    inferred from the pattern, not sourced, and needs re-confirming before
    ~2026-08-05. This table is now hand-authored into `config/seasons.ts`
    (not fetched live at runtime, per usual) - will need a manual update
    (plus adding M-6+) once real M-5 dates are announced. Sources checked:
    Bulbapedia's "Ranked Battles Seasons in Pokémon Champions" and
    "Regulation Set M-B" pages, Serebii's `rankedbattle/regulationm-a.shtml`
    and `regulationm-b.shtml` pages - full URLs in the
    `reg_mb_season_timeline` memory note.
  - **"Check for Updates" reminder tool - done (2026-07-15)**, see
    COMPLETED.md. Same pattern could generalize to the other hand-authored
    Champions balance-patch config
    (`championsMoveOverrides.ts`/`championsAbilityOverrides.ts`/etc.) if
    useful later - not built, season/regulation data was the concrete
    driver for the first pass.

- **2026-07-07 manual-testing/UI-polish batch**: items 1-2, 4, 6-7 done, no
  remaining notes (see COMPLETED.md). Item 3 done - its "Battlefield.tsx
  itself is the tallest column" scrollbar finding is what the "New,
  discovered while doing item 3" note below covers in full. Item 5 done -
  its "Calc doesn't fit the minimum window" note is tracked under the
  second review pass's item 1 below. Item 8 done - its SideConditionsRow/
  CalcSideConditions unification follow-up is tracked under the second
  review pass's item 3 below.
  - **New, discovered while doing item 3**: the Battle Log page still
    needs to scroll at the 1280x720 minimum window size even after the
    roster compacting - `Battlefield.tsx` itself (428.5px) + turn
    controls (24px) + turn log (332px, within its existing 192-384px
    range) total 808.5px, taller than either (now-compacted) roster
    column. Fitting the whole page would need a separate pass at
    `Battlefield.tsx`'s own sizing (slot spacing, weather/side-condition
    bar padding, etc.) - not scoped or touched during item 3.

- **2026-07-07 second review pass** (captured from a manual-testing round,
  reference screenshots of the real calc.pokemonshowdown.com Champions mode
  provided for items 1-3; items 2, 5-10 done with no remaining notes - see
  COMPLETED.md):
  1. Calc page: tighten overall spacing so more fits without scrolling -
     a further tightening pass done 2026-07-14 (see COMPLETED.md), on top
     of the earlier partial pass (924px scrollHeight at the 1280x720
     minimum, down from 1102px). Now at 864px - real, safe progress, but
     the minimum window size still scrolls a bit (~209px short of fully
     eliminating it). Stopped there deliberately per the user's own call
     rather than pushing into riskier territory (shrinking padding to the
     point of hurting legibility/click comfort, or reversing the
     `CalcSideConditions.tsx` one-row-per-condition layout decision) -
     revisit if further tightening is wanted later. At 1920x1080 the page
     already fits with room to spare, unaffected by this note.
  3. Calc page (`CalcSideConditions.tsx`) field-effect toggle trim is done.
     The `CalcSideConditions.tsx`/`SideConditionsRow.tsx` unification
     follow-up was investigated 2026-07-13 and dropped - see COMPLETED.md.
  4. Battle Logger: opponent roster boxes were reported visually bigger
     than the player's - the specific layout idea (move `FieldWeatherBar`
     to its own row, stack `SideConditionsRow.tsx` vertically) is done,
     see COMPLETED.md. The remaining per-row *height* gap (500px vs 608px
     column height) - same gap acknowledged again in the third review
     pass's item 5 below - is now fixed too, see COMPLETED.md
     (2026-07-13).

- **2026-07-07 third review pass** (originally captured in the order the
  user raised them during a manual-testing/reference-screenshot session;
  reordered here highest-to-lowest priority. Roughly: cheap/trivial fixes
  and confirmed bugs first, then correctness gaps in the actively-used
  Battle Logger, then clear-scope builds with no blockers, then items
  blocked on a research/policy decision, then the largest net-new subsystem
  last, per the user's own choice to defer it rather than build it
  immediately. Items 1-2, 4, 6-7, 9 done with no remaining notes - see
  COMPLETED.md):
  3. Battle Logger's move-stat-effects table (Growth's weather-conditional
     stage count, plus comprehensive stat-changing-move coverage) is done,
     see COMPLETED.md for the full research trail. Still open: the user's
     belief that several other moves besides Growth have a
     weather-conditional stage *amount* - research (multiple cross-checked
     Bulbapedia sources) turned up no second example, only Growth. Waiting
     on the user to name specific moves rather than guess/fabricate more
     weather branches.
  5. Battle Logger: the player roster column was reported visually smaller
     than the opponent's - done (per-cell footprint equalized to match),
     see COMPLETED.md. The whole-column height gap is also now fixed - see
     the second review pass's item 4 above and COMPLETED.md (2026-07-13).
  8. Team export to Showdown text format is done, see COMPLETED.md.
     Stretch goal still open, explicitly flagged by the user as uncertain:
     exporting *to* Pokepaste (creating a new paste via their write API,
     not just formatting local text) - unconfirmed whether pokepast.es
     exposes a usable public write API, needs research before scoping.
     Writing to an external third-party service is new territory for this
     project's external-integration rules, not something to bolt on
     silently.
  10. Teams page (`TeamCard.tsx`) Pokemon-card drag-to-reorder is done
      (2026-07-13), see COMPLETED.md.
  11. Teams page (`TeamsPage.tsx`) drag-to-reorder the teams list is done
      (2026-07-13), see COMPLETED.md.
  12. Calc page bulk-import + saved individual Pokemon sets is done
      (2026-07-13), see COMPLETED.md.
  13. Battle Logger weather move-effects notes (Thunder/Hurricane/Solar
      Beam/Solar Blade/Weather Ball/Synthesis-family/Blizzard) are done
      (2026-07-13), see COMPLETED.md.

## Done

See [COMPLETED.md](COMPLETED.md) for the full log of finished work.

## Backlog / ideas (not yet scoped, reordered highest-to-lowest priority)

- ~~VGC Team Sheet PDF auto-fill~~ **Done 2026-07-16** - see COMPLETED.md.



- ~~Electron is well behind current~~ **Done 2026-07-13** - bumped
  `^28.0.0` → `^43.0.0` (see COMPLETED.md). Dev tooling (Vite/TypeScript/
  ESLint) is still behind and intentionally deferred as a separate pass -
  see below.
- ~~In-app auto-update~~ **Windows done 2026-07-16, shipping in v0.2.1** -
  `electron-updater` wired into `main.ts` (packaged + `win32` only, gated
  explicitly rather than relying solely on electron-updater's own
  `app.isPackaged` guard), with `build.publish` (GitHub provider) added to
  `package.json` so `latest.yml`/`.blockmap` get generated on build - these
  now need uploading as release assets alongside the installers on every
  release going forward, not just the `.exe` files. Layered on top of (not
  replacing) the existing GitHub-Releases-API check
  (`useUpdateCheck.ts`/`UpdateCheckSection.tsx`) per explicit user call: the
  old "Update available: X, View Release" link-out stays as the fallback
  for every case electron-updater can't cover (dev mode, the portable exe,
  macOS before it's signed), while a real download-progress ->
  "Restart & Update" flow appears only for a packaged Windows NSIS install.
  **Still open:**
  - **macOS is still blocked** on the user getting a paid Apple Developer
    account ($99/yr) + notarization - Squirrel.Mac (what `electron-updater`
    uses under the hood on macOS) requires code signing to auto-update at
    all, and Gatekeeper heavily restricts unsigned builds regardless. Once
    unblocked, `registerAutoUpdater()`'s `process.platform !== 'win32'`
    guard in `main.ts` is the one line to revisit.
  - **Bootstrapping gap**: no release before v0.2.1 has this code, so
    nothing can auto-update *into* v0.2.1 - the first real end-to-end test
    of the full download-and-restart-install flow can only happen on the
    release *after* this one, once a v0.2.1 install can check against it.
  - A paid Windows code-signing cert (~$100-400+/yr) still isn't required
    for Windows auto-update to function, but would remove the "Windows
    protected your PC" SmartScreen warning - separate purchase decision,
    not bundled into this pass.
  - ~~Signing/notarizing/publishing by hand for every release still isn't
    automated~~ **Done 2026-07-16, verified live**:
    `.github/workflows/release.yml` builds on `windows-latest`/
    `macos-latest` on any `v*.*.*` tag push and runs `electron-builder
    --publish always`, which attaches installers (plus `latest.yml`/
    `.blockmap` for the Windows NSIS target) to a **draft** GitHub Release
    rather than publishing it live - matches this project's existing
    "always confirm before publishing a Release" rule, since a human still
    has to review and flip it to non-draft by hand (`gh release edit
    --draft=false` or the UI). No signing secrets are configured yet (no
    Windows cert, no Apple Developer account), so output is unsigned, same
    as today's manual builds. **Verified with a throwaway `v0.2.1-test1`
    tag push** (both jobs succeeded, ~2min build time each; tag deleted
    afterward, no lingering artifacts) - and it surfaced a real gotcha
    worth knowing: electron-builder resolves the release to attach to by
    `package.json`'s `version` field, *not* the pushed git tag, so the test
    correctly targeted the already-published `v0.2.1` release rather than
    creating a new one under the test tag. electron-builder's own safety
    check (`existing type not compatible with publishing type`) refused to
    touch that live non-draft release and skipped every upload rather than
    corrupting it - confirms the automation is safe to leave wired up
    permanently, but also means **the release process's step order
    changed**: the version tag must be pushed *before* `gh release create`/
    `gh release edit` ever touches that version, otherwise the workflow's
    own build finds a same-tag release already in the wrong state and
    no-ops. See the updated `CLAUDE.md` "GitHub Releases" bullet for the
    corrected sequencing (tag push -> workflow builds a draft -> `gh
    release edit` fills in title/notes -> `gh release edit --draft=false`
    once confirmed). Not yet exercised on an actual *fresh* version
    (nothing has been released since this landed) - the throwaway-tag test
    proved the safety behavior but not the "creates a brand-new draft from
    scratch" path; that'll get real coverage the next time a version is
    genuinely cut.
- ~~Dev tooling has also drifted behind current majors~~ **Done 2026-07-14**
  - bumped Vite `^5.0.0`→`^8.1.4`, `@vitejs/plugin-react` `^4.7.0`→`^5.2.0`,
  ESLint `^9.39.4`→`^10.7.0` (+`@eslint/js`, `typescript-eslint`, `globals`,
  `eslint-plugin-react-hooks` `^5.2.0`→`^7.1.1`), TypeScript `^5.3.0`→
  `^6.0.3` (see COMPLETED.md). **TypeScript 7.0.2 (the actual current
  `latest`) is explicitly not used** - typescript-eslint doesn't support it
  yet (confirmed peer-range rejection + real runtime crash reports); revisit
  once typescript-eslint ships real 7.x support. Also cleared the
  pre-existing esbuild/vite `npm audit` advisories noted during the Electron
  bump. Two new stricter `eslint-plugin-react-hooks` rules
  (`set-state-in-effect`, `immutability`) were disabled rather than
  fixed - see the next item.
- ~~Follow-up from the dev-tooling bump~~ **Mostly done 2026-07-14** (see
  COMPLETED.md) - re-enabling both disabled rules to actually fix them
  properly revealed the real scope was **13 files**, not the ~4 originally
  scoped (re-ordering the `immutability` hoisting fixes unlocked
  `set-state-in-effect` detection inside the same functions, surfacing
  hooks nobody had flagged yet: `useBattles.ts`, `useDamageCalc.ts`,
  `useDatabase.ts`, `useInitialSync.ts`, `useMegaSprite.ts`). Fixed for
  real: the `immutability` hoisting order in all 4 load-on-mount hooks
  (`useTeams.ts`/`useSettings.ts`/`useSavedPokemon.ts`/`useBattles.ts`), and
  the 7 "reset derived state when a dependency changes" `set-state-in-effect`
  cases (`EditOverlays.tsx` x2, `OpponentRowFields.tsx`, `CalcAutocomplete.tsx`,
  `useDamageCalc.ts` x2, `useMegaSprite.ts`, `usePokemonTypeFilter.ts`,
  `useInitialSync.ts` - the last one restructured to derive `isDone`
  directly instead of needing an effect for that branch at all). Still
  deliberately disabled (per explicit user call, not silently dropped):
  `set-state-in-effect` on `useTeams.ts`/`useSettings.ts`/
  `useSavedPokemon.ts`/`useBattles.ts`/`useDatabase.ts`'s shared
  load-on-mount-and-reused-by-refresh idiom, plus `useSync.ts`'s
  `refreshStatus` (same shape) - a real fix needs splitting each into an
  effect-safe silent variant and a refresh variant, a bigger, riskier
  change to the core data-loading pattern of nearly every hook in the app
  than fits a routine cleanup pass. Revisit as its own dedicated task if
  wanted.
- ~~`CalcPage`'s lazy chunk just crossed Vite's 500kB build-warning
  threshold~~ **Done 2026-07-14** - investigated a real code-split first
  (checked whether `@smogon/calc` exposes any subpath/generation-specific
  export to tree-shake by; it doesn't - no `exports` map, all data bundled
  monolithically with no way to import just Gen 9 tables), concluded the
  507kB is inherent to the dependency and already appropriately
  lazy-loaded, so raised `vite.config.ts`'s `chunkSizeWarningLimit` to 550
  instead of chasing an impractical split (see COMPLETED.md).
- ~~No app icon set yet for packaging~~ **Done 2026-07-15** - user supplied
  `build/icon.png` (1024x1024, transparent, well-centered mascot art);
  electron-builder auto-generates the platform `.ico`/`.icns` from it via
  the default `directories.buildResources` (`build/`) convention, no
  `package.json` changes needed. **Not yet verified**: a real
  `npm run dist:win` packaging build to confirm the icon actually renders
  correctly on a built installer/exe - three attempts all failed at an
  unrelated environmental step (`EPERM` renaming the freshly-extracted
  Electron binary folder), reproducing identically with Defender disabled
  and even fully elevated, and Windows Search indexing confirmed not
  scoped to the D:\ drive at all - so the cause is still unidentified
  (likely some other background process/tool watching the project
  folder, or a genuine electron-builder extraction race). Revisit
  whenever the next real Windows release build happens (see the Mac
  installer entry above) - possibly worth trying from a different machine
  or after a reboot.
- ~~`game-data-cache.json` concurrent-write race~~ **Fixed 2026-07-15** -
  see COMPLETED.md.
- ~~Unseen Fist-through-Protect deep interaction~~ **Investigated and
  closed 2026-07-14** - read `@smogon/calc`'s compiled source directly
  rather than guessing: "Unseen Fist" appears exactly once in the whole
  package (the static ability-name list used for the autocomplete picker)
  and is never checked via `hasAbility()` anywhere in its damage
  mechanics, unlike abilities the library actually models (e.g. Parental
  Bond, checked in ~5 places). The library simply doesn't implement this
  ability's Protect-bypass behavior at all - so there's no hidden internal
  logic assuming the old 100% value to conflict with our tooltip
  correction. The feared "deep interaction" bug doesn't exist; no code
  change was needed. See COMPLETED.md.
