# ChoiceBuds - Completed Work Log

Archive of finished work, split out of `TODO.md` (2026-07-08) to keep the
active task list quick to scan. Newest entries first. Cross-references to
still-open items point to `TODO.md`; references to other entries here stay
local ("see below"/"see above").

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
    M-1..M-4 are the ones already researched and sourced from Bulbapedia +
    Serebii on 2026-07-08 (see TODO.md's season-level-breakdowns entry for
    the full citation trail); M-5's dates aren't published yet, so that row
    is explicitly flagged inline as inferred/unconfirmed and due for a
    manual re-check before ~2026-08-05.
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
- **Fixed a real packaging bug: the built Windows installer never actually
  launched** (2026-07-09, found while building the first real installer for
  friend-testing): `main.ts`'s production `loadFile` call
  (`path.join(__dirname, '../renderer/index.html')`) was wrong and had been
  since the original `electron-builder` setup - it assumes `index.html`
  sits at a `renderer/` folder sibling to `dist-electron/` (where the
  compiled `main.js` actually runs from), but `vite.config.ts`'s
  `build.outDir` puts it at `dist/renderer/index.html` instead - a
  `dist/`-nested sibling, not a top-level one. This was never caught before
  because dev mode always takes the `NODE_ENV === 'development'` branch
  (`loadURL('http://localhost:5173')`) instead - every test this whole
  project has run through `npm run dev`, so the production `loadFile`
  branch had literally never been exercised until this build. The
  2026-07-06 packaging pass's "verified working end-to-end" claim only
  meant the build commands completed and produced `.exe` files, not that
  anyone had actually launched one - confirmed by testing the untouched old
  `release/ChoiceBuds 0.1.0.exe` build and finding it exhibited the exact
  same silent-immediate-exit bug. Root-caused via `npx asar list` on the
  packaged `app.asar` to see the real internal layout
  (`dist-electron/main.js` alongside a separate `dist/renderer/index.html`,
  not `renderer/index.html`), after first chasing a red herring - the
  earliest test attempts appeared to crash/exit silently with zero output,
  which turned out to be `ELECTRON_RUN_AS_NODE` leaking from the shell
  environment into the launched process (documented gotcha - shell state
  doesn't persist between separate tool calls, so it has to be `unset`
  immediately before every direct launch, not just before `npm run dev`).
  Once that env var was actually cleared, the real error surfaced
  (`ERR_FILE_NOT_FOUND` in stderr) instead of a silent exit. Fixed to
  `path.join(__dirname, '../dist/renderer/index.html')`. Live-verified via
  screenshot after rebuilding: the packaged, installed-from-scratch app
  window renders correctly, showing the real Teams page with both actual
  saved teams and their sprites/badges intact.
- **Cross-device sync - Worker deployed to production** (2026-07-09): the
  last remaining manual step from the full implementation below is done -
  the Worker is live at `https://choicebuds-sync.vanwheelstheman.workers.dev`,
  and `src/renderer/services/syncApi.ts`'s `SYNC_WORKER_URL` now points at
  it (no longer a placeholder). Walked through interactively:
  `wrangler login` (OAuth device flow), `wrangler kv namespace create
  SYNC_KV` (also caught and fixed stale `kv:namespace` colon-syntax in
  `worker/README.md` - current `wrangler` uses `kv namespace` with a
  space), pasting the returned namespace id into `wrangler.toml`, then
  `wrangler deploy`. One real snag along the way: registering a
  `workers.dev` subdomain through Cloudflare's dashboard onboarding wizard
  didn't just register a subdomain - it also created a separate, unrelated
  Worker (`choicebuds`, distinct from our real `choicebuds-sync`) wired up
  as a Git-connected "Workers Build" pointed at the *whole repo root*,
  which then failed to build (its Vite-plugin auto-detection needs Vite 6+,
  this repo is on 5.4). Diagnosed via the Cloudflare API
  (`GET /accounts/:id/workers/scripts` showed both Workers) and deleted the
  stray one (`DELETE /accounts/:id/workers/scripts/choicebuds`) - unrelated
  to and no impact on the real sync Worker. Live-verified end-to-end
  against the actual production deployment (not just local `wrangler dev`
  this time): created a real identifier through the app, Pushed, and
  confirmed via direct `curl` against the live `*.workers.dev` URL that
  the real local teams/battles data landed correctly; test data and the
  test identifier were then cleaned up (`wrangler kv key delete`, and the
  app's own "Forget" button - incidentally verifying that control works
  too) so nothing test-related was left in production or in the local
  `settings.json`.
  - **Also this session**: published the project's first-ever GitHub
    Release (`v0.1.0`, full changelog covering every feature built to
    date plus a Credits section) via `gh` - required installing the
    GitHub CLI first (no admin rights available, so via the portable zip
    release rather than the MSI installer) and authenticating via device
    login. Discovered and fixed a real blocker for the update-checker
    feature while publishing: the repo was **private**, which silently
    breaks `services/github.ts`'s unauthenticated fetch (returns 404
    against a private repo, indistinguishable from "no releases yet") -
    embedding a real token in the shipped app to work around this was
    correctly ruled out as a security risk (leaks the token to every
    install), so the repo was made public instead, after first scanning
    all tracked files and full git history for secrets/credentials (none
    found). Confirmed working via the same unauthenticated API call the
    app itself makes. New workflow convention written into `CLAUDE.md`
    (Workflow conventions section) and memory: commits/pushes stay the
    user's own job via GitHub Desktop, but GitHub Releases going forward
    are Claude's to draft and publish via `gh` once the user confirms the
    content - the reverse split, and specifically written into `CLAUDE.md`
    itself (not just memory) so it stays consistent when working from the
    user's Mac.
- **App version display + GitHub-release update checker** (2026-07-09):
  static "Ver X.Y.Z" line added to the sidebar footer under "Teams Loaded"
  (`utils/appVersion.ts` reads `package.json`'s `version` directly - no
  network involved, correct even offline). Separately, a new automatic
  once-per-launch check against this repo's GitHub Releases
  (`services/github.ts`, `useUpdateCheck.ts`) surfaces its result - not
  itself - on the Settings page (`UpdateCheckSection.tsx`): checking /
  up-to-date / update-available (with a "View Release" button) /
  no-releases-published-yet (today's real, neutral-not-broken state,
  confirmed live - `vanwheels/ChoiceBuds` has zero Releases or tags as of
  this build) / couldn't-check (network failure). This is the app's first
  fully-automatic (non-user-triggered) external call - documented as a
  **Third exception** in `CLAUDE.md` alongside the existing Pokepaste one,
  distinct from every prior external fetch (all either on-demand/cached or
  explicitly user-initiated). Also added `shell.openExternal` as a new IPC
  handler (`main.ts`/`preload.ts`) - the app's first mechanism for opening
  a link in the system browser, since none existed before. Live-verified:
  sidebar version and the real "no releases yet" Settings state confirmed
  as-is; the "update available" path (plus the "View Release" button
  actually opening the system browser to the correct release page) was
  verified by temporarily pointing the check at a real public repo with
  releases (`facebook/react`), then reverted. The error/network-failure
  state wasn't force-tested live (the check fires immediately on mount,
  faster than a stubbed `fetch` could be injected after launch) - accepted
  on code review instead, since it's a single `try`/`await`/`catch` with no
  async-race complexity, unlike the two real bugs the sync feature's
  status logic had. Not persisted anywhere; recomputed fresh every launch.
  Going forward, shipping a new version means: bump `package.json`'s
  `version` and publish a matching GitHub Release with that tag.
- **Cross-device sync - identifier availability check** (2026-07-09,
  follow-up): the user asked whether `username#XXXX` collisions were
  actually prevented - they weren't. `createIdentifier()` generated the
  4-digit discriminator client-side with no server round-trip at all, and
  the Worker has no "taken identifiers" registry, only per-identifier KV
  blobs - so two different people generating the same username+digits by
  chance would silently share/overwrite each other's data with zero
  warning. Fixed in `useSync.ts`: `createIdentifier()` now does a `GET` for
  each candidate `username#XXXX` before finalizing it (usernames are
  intentionally *not* unique - only the full combined string needs to be
  free) and re-rolls just the discriminator up to `MAX_DISCRIMINATOR_ATTEMPTS`
  (5) times on a collision, surfacing a clear error if it somehow can't
  find a free one (astronomically unlikely) or if the availability check
  itself can't reach the Worker. Verified two ways: the retry/give-up
  branches were proven against the real local `wrangler dev` Worker via a
  disposable script with a controlled (non-random) discriminator sequence
  - 3 pre-seeded "taken" identifiers followed by a free one correctly
  succeeded on attempt 4, and 5 straight collisions correctly gave up -
  since forcing a genuine 1-in-10,000 random collision through the real UI
  isn't practical; separately, the normal (non-colliding) create path was
  re-verified end-to-end through the actual UI to confirm no regression.
- **Cross-device sync - full implementation** (2026-07-09): manual Push/Pull
  of a bundled `{teams, battles, savedAt}` blob against a small self-run
  Cloudflare Worker, keyed by a `username#XXXX` pairing identifier - see
  TODO.md's still-open "deploy the Worker" entry for the one remaining
  manual step (the code is done, but nothing's deployed yet).
  - **New `worker/`** (sibling to `src/`, own `package.json`/`tsconfig.json`,
    excluded from the root build): `worker/src/index.ts` implements
    `PUT`/`GET /sync/:identifier` against Workers KV, with CORS (incl. an
    `OPTIONS` preflight handler), a 512KB body-size cap, and a 3s
    per-identifier write throttle. The throttle is keyed off KV's own
    metadata (`{receivedAt}` set server-side on each `put`), not the
    client-supplied `savedAt` - an early version compared against the
    client's own timestamp, which a client could simply lie about to bypass
    the throttle entirely; caught via live `curl` testing against
    `wrangler dev`, not just code review. `worker/wrangler.toml` and
    `worker/README.md` (full `wrangler login`/`kv:namespace create`/
    `deploy` walkthrough) round it out. Storage backend is KV over R2 for
    now - deliberately not the scale-first choice, since the client only
    ever talks to the Worker's own HTTP API (never KV/R2 directly), so
    swapping later is a small, contained, zero-client-impact change.
  - **`src/main/main.ts`**: pre-existing gap fixed alongside this (surfaced
    during design, unrelated to sync itself but matters more now that Pull
    can also overwrite these files) - every `file:write-*` IPC handler used
    a raw truncate-then-write `fs.writeFile`; replaced with one
    `atomicWriteFile()` helper (temp file + rename) across all 5 handlers.
  - **`src/renderer/services/syncApi.ts`** (new): `pushSyncData`/
    `pullSyncData`, mirroring `pokeapi.ts`/`pokepaste.ts`'s plain-fetch
    convention but deliberately adding an `AbortController` 10s timeout -
    this Worker is infrastructure the user runs themselves, so a lapsed
    deployment is a real possibility unlike a flaky third-party API.
  - **`src/renderer/hooks/useSync.ts`** (new): identifier creation
    (`username` + a `crypto.getRandomValues`-generated 4-digit
    discriminator)/pairing, `push()`/`pull()`, and a status line derived
    from one local disk read plus one remote peek fetch (not a poll loop -
    only run on mount/after an action, matching the "manual, not
    continuous" design). `AppSettings` gained `syncIdentifier`/
    `lastPushedAt`/`lastPulledAt`; `useSettings.ts` gained a generic
    `updateSettings(partial)` alongside the existing `setDefaultRegulation`
    (left untouched) since the sync fields update together. Two real bugs
    caught via live `run-desktop` testing, not code review: (1) a
    stale-closure bug where `refreshStatus()` read pre-update
    `lastPushedAt`/`lastPulledAt` from its own closure right after the
    `updateSettings()` call that changed them, showing "Never synced" even
    after a successful first Push - fixed by having `push()`/`pull()` pass
    the fresh values into `refreshStatus()` explicitly instead of relying
    solely on closed-over state; (2) `push()`'s "remote is newer, pull
    first" guard compared the remote's `savedAt` against `lastPulledAt`
    alone, which meant a device that had only ever pushed (never pulled)
    would permanently block itself from pushing again after its own first
    push - fixed by comparing against `Math.max(lastPushedAt, lastPulledAt)`
    instead, since a device's own prior push already counts as having
    "seen" that data.
  - **`src/renderer/components/SyncSection.tsx`** (new): identifier setup
    (create new vs. pair existing), Push/Pull buttons, status line, and an
    inline warning banner (not a modal) with a "do it anyway" override when
    a Push/Pull is blocked - resolves the design's open "existing data
    under an identifier" question by auto-checking on identifier setup/every
    status refresh rather than only at click-time. Extracted as its own
    component from `SettingsPage.tsx` (which now also takes
    `teamsState`/`battlesState` props, threaded from `App.tsx`) since it's
    a meaningfully separate concern from the Default Regulation setting
    next to it.
  - **Live-verified end-to-end** against a local `wrangler dev` instance
    (temporarily pointed `syncApi.ts` at `http://localhost:8787`, reverted
    before finishing): created an identifier, Push round-tripped the real
    local teams/battles data correctly (confirmed via direct `curl` against
    the Worker), and Pull correctly overwrote local storage with a
    distinguishable injected fake payload. Real user data
    (`teams.json`/`battles.json`/`settings.json`) was backed up before any
    Pull testing and restored immediately after, verified byte-for-byte
    against the original file sizes - Pull is destructive by design (full
    overwrite, not merge), so this was tested against disposable state, not
    carelessly against the user's real teams/battle logs.
- **Settings page (shell + default-regulation setting)** (2026-07-09): new
  persisted-preferences pattern, first one in the app - `settings.json` in
  `userData`, following the exact same convention as `teams.json`
  (`getSettingsPath()` + `file:read-settings`/`file:write-settings` IPC
  handlers in `main.ts`, `readSettings`/`writeSettings` on the preload
  bridge, new `useSettings.ts` hook mirroring `useTeams.ts`'s
  load-on-mount/persist-on-write shape). New `AppSettings` type in
  `types/pokemon.ts`. New `SettingsPage.tsx`, wired into the previously
  disabled placeholder "Settings" nav button in `App.tsx`. First real
  setting: a default regulation (Reg M-A/Reg M-B) used to pre-select the
  Format field when importing a new team - replaces the independently
  hardcoded `'Reg M-A'` in `ImportTeamModal.tsx`'s initial state and
  post-import reset with `settingsState.settings.defaultRegulation`,
  threaded down from `App.tsx` through `TeamsPage.tsx`.
  `RegulationBadge.tsx`'s `team.format || 'Reg M-A'` fallback (for an
  already-imported team with malformed data) was deliberately left alone -
  a different concern from "default for new imports". Unblocks
  cross-device sync's Push/Pull UI and the season "Check for Updates" tool
  (both still separately not built - see TODO.md), which were waiting on
  this page existing as a home. Live-verified via run-desktop: toggling
  the regulation buttons in Settings persists (survived a fresh
  `launch`), and opening Teams -> Import after picking Reg M-B showed the
  modal's Format field pre-selecting Reg M-B instead of the old hardcoded
  Reg M-A. No console errors; `npm run type-check`/`npm run lint` clean
  (the only lint output is the two pre-existing `useDatabase.ts`
  exhaustive-deps warnings already noted in TODO.md's backlog).
- **Per-target crit/miss + relocate Miss/Crit/Inflict-Status chips onto the
  Battlefield** (2026-07-09): items 2-3 of the status-condition/move-outcome
  follow-up batch. `BattleAction.crit`/`missed` (single booleans covering
  the whole action) are replaced with a per-target `outcomes: {pokemonId,
  result: 'crit' | 'miss'}[]` array, mirroring the existing per-target
  `effectiveness` field - a spread move (Rock Slide, Earthquake) can now
  crit one target and miss another independently, and a single target is
  mutually exclusive by construction (one `result` per target entry, not
  two independent flags). New `setActionTargetOutcome` mutation in
  `useBattleLogActions.ts` replaces the generalized `setActionFlag` (reverted
  back to single-purpose `setActionFailed`, since crit/missed no longer
  share its shape). New `mostRecentTargetingActionThisTurn` helper in
  `utils/battleLookup.ts` (turn-scoped, mirroring `Battlefield.tsx`'s
  existing `switchedInIds` current-turn-only pattern) finds "what just
  happened to me this turn" per Pokemon, driving new Miss/Crit/"Inflict
  {Status}?" chips rendered directly on the target's own `BattlefieldSlot`
  (same chip shape as the existing switch-in/reactive-ability chips) -
  replacing the old chips that lived inline in `TurnLog.tsx`'s per-action
  text. `TurnLog.tsx` keeps a read-only per-target crit/miss label next to
  its existing per-target effectiveness label instead, which is actually a
  correctness improvement over the old flat suffix (a spread move's
  differing per-target outcomes can now be represented in the historical
  log). Live-verified via run-desktop: two independent targets of the same
  Earthquake use got independent Miss/Crit chips, toggling one didn't
  affect the other, toggling Crit-then-Miss on the same target replaced
  rather than stacked, and all three chips correctly disappeared after
  "Next Turn" (turn-scoped). The relocated Inflict-Status chip specifically
  wasn't live-clicked this pass (no guaranteed-status move was available on
  the test team/opponent) - same caveat as when it first shipped, still
  worth a spot-check next time a team with Thunder Wave/Toxic/etc. logs a
  real battle.
- **Battlefield targeting bug: attacking moves could target their own user**
  (2026-07-09): found while reviewing the status-condition/move-outcome work
  right after it shipped. `Battlefield.tsx`'s `handleSlotClick` called
  `finalizeTarget` for *any* clicked occupied slot while a target was
  pending, without checking it was actually one of `pendingTarget.candidates`
  - the move's own user is deliberately excluded from `candidates`
  (`allyIds = sameSideActive.filter(id => id !== pokemonId)`), but nothing
  stopped clicking that slot anyway, since the `isCandidate` highlight was
  only visual, not enforced. `finalizeTarget` now no-ops on a non-candidate
  click instead (the "Choose a target..." banner stays up so the user can
  still pick a valid one) - live-verified via run-desktop that clicking the
  actor's own slot no longer logs a self-target and the pending state
  correctly survives the rejected click.
- **Battle Logger: status-condition tracking + move-outcome chips**
  (2026-07-09): the "Next up" item from the Battle Logger's beyond-MVP
  roadmap. `Battle` gained `statusConditions: Record<string, StatusCondition>`
  (unified across both rosters, mirroring the existing `statStages` shape) -
  scoped to the 6 real major statuses only (burn/freeze/paralysis/poison/
  badly-poisoned/sleep); volatile conditions (confusion, etc.) are
  deliberately excluded since a Pokemon can hold one of those *and* a major
  status simultaneously, which a single-slot model can't express. Manual
  set/clear via a new "Status" button on `BattlefieldSlot.tsx` opening
  `StatusConditionPopover.tsx` (modeled on `StatStagePopover.tsx`), plus a
  persistent colored abbreviation badge (PAR/BRN/PSN/TOX/SLP/FRZ). PokeAPI's
  move `meta` field (ailment/ailment_chance/flinch_chance/crit_rate) is now
  fetched and cached (`MoveData.meta`, threaded through
  `services/pokeapiService.ts` and self-healed in `useGameData.ts`'s
  `getCachedMove` the same way `target` was) - nothing read it before this.
  Verified live against the real API that `ailment_chance` is confusingly 0
  for a pure status move whose entire point IS the ailment (Thunder Wave,
  Toxic, Spore all report 0 - the field is only meaningful for a
  *secondary* effect on a damaging move, e.g. Nuzzle=100 guaranteed,
  Body Slam=30 probabilistic), so `config/statusConditions.ts`'s
  `mapAilmentToStatus` treats "guaranteed" as `damage_class === 'status' OR
  ailment_chance === 100`, not ailment_chance alone. A snapshotted
  `BattleAction.statusAilment` (same pattern as the existing moveType/
  moveCategory snapshot) drives an "Inflict {Status}?" chip in `TurnLog.tsx`
  (same shape as the existing "Failed?" chip), gated by a new
  `hasAppliedStatusEffect` helper in `utils/battleLookup.ts`. Full
  Paralysis/Didn't Wake Up/Flinched (a turn where the Pokemon didn't get to
  act at all, not a modifier on a completed move) reuse the existing generic
  `logAction` mutation directly via new conditional buttons in
  `MoveLogPopover.tsx` - no new hook code needed for those three. Crit/Miss
  are new sibling boolean fields to the existing `BattleAction.failed`;
  rather than duplicating `setActionFailed` twice more, it was generalized
  into `setActionFlag(battle, turnNumber, actionId, field, value)`. Live-
  verified end-to-end via the run-desktop skill against a disposable battle:
  status set/clear + badge persistence across a reload, Full Paralysis
  correctly consuming the turn (`canActThisTurn` returns false afterward),
  and Crit/Miss chip toggling persisting to disk. Also fixed a UI bug caught
  during that verification pass: opening the new Status popover didn't close
  an already-open bench-picker popover (the reverse direction was already
  wired) - `Battlefield.tsx`'s `onOpenStatus` now closes `benchSlot` too.
  The Inflict-Status chip's rendering/gating logic was checked directly
  against real PokeAPI responses for the mapping correctness, but not
  live-clicked through the UI (the disposable team's moveset had no
  guaranteed-status move) - worth a follow-up spot-check next time a team
  with Thunder Wave/Toxic/etc. is used to log a real battle.
- **First macOS testing pass — Aegislash import 404, blank Team Name block,
  dev-tooling fixes** (2026-07-08): running the app on macOS for the first
  time (closing out the "needs an actual Mac... can't be built or verified
  from Windows" caveat noted in the packaging pass below) surfaced four
  issues, all fixed in the same commit. `normalizeSpeciesForAPI` had no
  special case for bare "aegislash" (PokeAPI only exposes
  `aegislash-blade`/`aegislash-shield`, but Showdown/pokepast.es always
  export the plain default-forme name), so any real team containing
  Aegislash 404'd and aborted the whole import - now maps to
  `aegislash-shield`. `ImportTeamModal.tsx` required a non-empty Team Name
  before the Import button would even enable, with no way around it - blank
  now defaults to the next unused "Team N" at save time
  (`nextGenericTeamName`). Two more fixes specific to getting reliable
  macOS dev/testing set up: `vite.config.ts` was watching the whole repo
  root including `.claude/`, so the run-desktop skill's own screenshot
  writes were mistaken for source changes and triggered full page reloads
  mid-session, silently wiping in-progress renderer state - now ignored;
  `.claude/skills/run-desktop/driver.mjs` also hardcoded the Windows-only
  `node_modules/electron/dist/electron.exe` path - it now reads `path.txt`
  the same way the `electron` package's own `index.js` does, so it resolves
  the right binary on any platform.
- **Statistics page** (2026-07-08): original 9-item roadmap discussion's
  item #9. No longer blocked - the Battle Logger had been producing real
  `Battle` records (`result: 'win' | 'loss' | 'in-progress'`) for a while,
  but nothing aggregated them anywhere. New top-level "Statistics" tab,
  wired into `App.tsx` the same way as the other lazy-loaded pages
  (`ActiveTab` union, sidebar nav button, `<Suspense>` branch). User chose
  hand-rolled Tailwind bars over adding a chart dependency (none existed in
  the app before this) - no new dependency, no schema changes, no new
  persisted store, everything derived client-side from the already-loaded
  `battles` array.
  - New `utils/battleStats.ts`: pure functions computing overall win/loss
    record, per-format and per-team breakdowns (grouped by `teamId`,
    labeled via the stable `teamName` snapshot so a renamed/deleted source
    Team never breaks past stats), recent form (chronological win/loss
    strip), most-used Pokemon (tallied from `playerRoster` filtered to
    `broughtIds`, with win rate when brought), most-faced opponents
    (tallied from `opponentRoster`, caveated in the UI as reflecting only
    manually-tagged sightings, not a guaranteed full team reveal), and a
    Mega Evolution usage/win-rate comparison. Only `result !== 'in-progress'`
    battles count toward any win/loss math.
  - New `components/statistics/` folder: `StatisticsPage.tsx` (orchestrator,
    `useMemo`s each stat off `battlesState.battles`), `StatBar.tsx` (shared
    proportional win/loss bar primitive), `BreakdownPanel.tsx` (generic
    titled list of `StatBar`s, reused for format/team), `OverallRecordCard.tsx`,
    `RecentFormStrip.tsx` (reuses the win=green/loss=red convention from
    `PastBattlesList.tsx`), `MegaUsagePanel.tsx`, `PokemonUsagePanel.tsx`,
    `OpponentFacedPanel.tsx` (both using `spriteCacheState.resolveSprite()`,
    same call pattern as `RosterRow.tsx`).
  - Explicitly out of scope, still needing schema work not attempted here:
    Bo3/match-level grouping (only per-game `Battle` records exist today, no
    `setId`), win rate vs. a specific opponent (no opponent-identity field),
    per-Pokemon MVP/kill attribution (no such field). Left noted in
    TODO.md's roadmap item, not silently dropped.
  - Live-verified with the run-desktop driver: confirmed the true empty
    state (zero real battles logged yet) renders correctly, then verified
    the fully-populated view against disposable fixture data written
    directly to `battles.json` (6 fixture battles across 2 teams/2 formats,
    win/loss/in-progress mixed, mega usage varied) - all panels' numbers
    checked out against the fixtures (3-2 overall, 60% win rate, per-team
    and per-format splits correct) - then restored the real (empty)
    `battles.json` from a backup taken before the fixture write, per the
    project's disposable-test-data convention (never mutate real data for
    a live-testing pass).

- **Teams: import a team directly from a pokepast.es link** (2026-07-08):
  item 9 of the reprioritized third review pass. Did the research the item
  called for before writing any code: `curl`-probed the test link
  (`https://pokepast.es/fd6420a3f2b82487`) for a raw-text endpoint and found
  something better than expected - `pokepast.es/<id>/json` returns
  structured JSON directly (`{title, author, notes, paste}`), no HTML
  scraping needed at all, and it conveniently already has an `author` field
  matching the Author feature from earlier today. Brought the CLAUDE.md
  policy question (a new external-fetch source) and an auto-fill-scope
  question to the user rather than assuming - both confirmed: add the
  policy exception, and also best-effort parse a Reg M-A/Reg M-B guess out
  of the paste's own `notes` field (commonly "Format:
  gen9championsvgc2026regmb"-style), not just name/author.
  - **Policy additions** (required before writing the fetch itself, per the
    item's own "don't bolt this on silently" framing): CLAUDE.md gained a
    second `pokepast.es` exception scoped tightly to its own `/<id>/json`
    endpoint only, invoked only when a user pastes a link - never scraped,
    never polled. `README.md`'s Credits section gained a matching entry.
  - New `services/pokepaste.ts`: `extractPokepasteId()` (matches a trimmed
    `pokepast.es/<id>` link), `fetchPokepaste()` (the JSON call), and
    `detectRegulationFromNotes()` (regex-matches "reg m[-\s]?[ab]",
    case-insensitively, returning `null` on no match - pokepast.es doesn't
    guarantee this convention, so callers keep their existing default when
    it doesn't hit).
  - `ImportTeamModal.tsx`'s existing paste `<textarea>` now doubles as the
    link input - no new field. `onBlur` checks whether the box holds
    nothing but a pokepast.es link; if so, fetches it and replaces the
    textarea with the real Showdown text, auto-filling Team Name/Author
    only if they're still empty (never clobbers something the user already
    typed) and always applying a detected Format (low-risk best-effort, the
    dropdown still lets them override). A small spinner reuses the same
    inline-SVG pattern the existing import-progress indicator already had.
  - Live-verified end-to-end with the exact test link from the item text:
    pasted it, confirmed the "Fetching from Pokepaste..." indicator
    appeared then resolved to Team Name "Computah, Fry This Guy", Author
    "vanwheels", Format correctly flipped to Reg M-B, and the textarea
    swapped to the real 6-Pokemon Showdown text (Kryptonite the Metagross,
    etc.) - then completed the actual import and confirmed all 6 Pokemon/
    sprites/name/author/format landed correctly on the Teams page, deleting
    the test team afterward (never touching the user's real "blaze"/
    "metagross team" teams). Also caught and fixed a driver-only gotcha
    along the way (see `run-desktop`'s SKILL.md): dispatching a plain
    `'blur'` event doesn't reach a React `onBlur` handler since native
    `blur` doesn't bubble - `'focusout'` (bubbling, which is what React
    actually listens for) does.

- **Teams: per-Pokemon Showdown export, same-day follow-up to the whole-team
  export** (2026-07-08): new ask (not in the original numbered list) after
  the user tried the whole-team export and liked it, with a reference image
  showing a small download-arrow icon in each Pokemon card's top-right
  corner. `ExportTeamModal.tsx` was generalized from a `team: Team` prop to
  `pokemonList: ShowdownPokemon[]` + `title: string` - `TeamCard.tsx` now
  passes the full `team.pokemon.map(p => p.showdownData)` array (unchanged
  behavior), and a new "⇩" button in `PokemonCard.tsx`'s top-right corner
  (matching the reference image exactly) passes a one-element array and a
  title built from the Pokemon's nickname/species. Kept as one shared
  modal component rather than a second copy, since the two call sites
  differ only in how many Pokemon they pass in. The button shifts from
  `right-2` to `right-9` while `isEditing` (sharing that corner with the
  pre-existing per-slot Delete "×" button, which only shows in edit mode)
  so the two never overlap - confirmed both side-by-side with no collision
  in a screenshot. Live-verified against the user's real "blaze" team
  (never mutated - export is read-only, and edit mode was entered to check
  button positioning without changing any field) that exporting a single
  Pokemon (Accelorate/Blaziken) produces only that Pokemon's text/clipboard
  contents, not the whole team's.

- **Teams: export a team back to Showdown text format** (2026-07-08): item 8
  of the reprioritized third review pass. Asked the user 3 clarifying
  questions up front rather than guessing from the (unavailable-to-this-
  session) reference screenshot mentioned in the item text: modal-with-
  copy-button vs. direct clipboard copy (chose modal), whether "coloring"
  meant a colored on-screen preview or literal Showdown syntax (chose
  colored preview, plain-text clipboard), and how to handle this app's
  "EVs:" field actually being Champions' 0-32 SP scale rather than real
  Showdown's 0-252 (chose: export the raw stored numbers as-is under the
  same "EVs:" label, so re-importing through this app's own parser
  round-trips exactly).
  - `services/parser.ts` gained `formatPokemonLines()` (the reverse of
    `parsePokemonBlock` - one Pokemon's data -> a `FormattedLine[]`, EVs
    kept as structured `{stat, value}` pairs rather than a plain string so
    callers can color them without re-parsing) and `formatShowdownText()`
    (joins multiple Pokemon into full paste text via the same lines).
    Optional lines are omitted whenever at their Showdown-assumed default
    (mirroring real exports) - except Level, always stated explicitly
    since VGC/Champions defaults to 50, not real Showdown's own implicit
    100, so omitting it would silently change the Pokemon if pasted
    elsewhere. Gender is only written explicitly when it deviates from
    `getFallbackGender(species)`, matching the parser's own "explicit only
    when it deviates" logic on the way in. IVs are never emitted - this
    app has never modeled them (see earlier "Remove IV handling from
    renderer flow" commit).
  - New `ExportTeamModal.tsx` (mirrors `ImportTeamModal.tsx`'s layout) is
    wired to a new "⇩" button in `TeamCard.tsx`'s header cluster (next to
    Validate). The preview colors each EVs line's stat abbreviations via
    the same `getStatLabelColor()` used in `StatsColumn.tsx`/
    `CalcStatRows.tsx` from the item 6-7 pass - a "Copy to Clipboard"
    button copies the plain-text form (color can't survive a real
    clipboard paste anyway) with a brief "Copied!" confirmation.
  - Verified round-trip correctness two ways: a throwaway `tsx` script
    (parse -> format -> re-parse, deep-equal-compared against the original
    parse, including a gender-deviation case) confirmed byte-for-byte
    equivalent structured data; then live end-to-end on a disposable test
    team (a Shiny Tera-Electric Pikachu with an explicit female gender tag,
    created via import, exported, copied, deleted after) - the modal's
    colored preview and the actual clipboard contents (read back via
    `navigator.clipboard.readText()`) both matched exactly, "4 HP"/"32
    Atk"/"32 Spe" rendering in the correct red/orange/pink.
  - Stretch goal (exporting *to* Pokepaste via their write API) intentionally
    not attempted - still gated on the research/policy question noted in
    the item text above.

- **Teams tab: colored nature +/- stat denotation, EVs box renamed to SP**
  (2026-07-08): second same-day follow-up round after the user reviewed the
  Nature-selector/Author-relocation pass live. Two pieces:
  1. **Nature +/- denotation**: new `NatureEffect`/`NATURE_EFFECTS`/
     `getNatureEffect()` in `config/vgcData.ts` - the standard 25-nature
     +10%/-10% chart (5 diagonal "neutral" natures map to `null`, since a
     same-stat +/- would cancel out; HP is never affected in any
     generation). `StatsColumn.tsx` renders "(+Atk, -SpA)"-style text next
     to the nature name/selector whenever the chosen nature has an effect,
     reusing the same `getStatLabelColor()` per-stat colors from the item
     6-7 pass above (so "+Atk" renders in the same orange as the ATK row,
     "-SpA" in the same blue as SPA) rather than inventing a second color
     scheme. The header block became a 2-row layout (SP label + total badge
     on row 1, nature + its +/- denotation on row 2) since cramming both
     onto one row left no space for the parenthetical in the ~260px-wide
     card.
  2. **"EVs" renamed to "SP"**: per the user - "Stat Points" is Pokemon
     Champions' actual in-game term (already used correctly elsewhere in
     this app, e.g. `CalcStatRows.tsx`'s own "SP" column and CLAUDE.md's
     "Champions' 0-32 SP scale") - only the *displayed* label in
     `StatsColumn.tsx` changed; internal names (`EVSpread`, `evs` prop,
     `localEVs`/`totalEVs` variables) were deliberately left alone as a
     larger, unrequested rename with no user-facing benefit.

  Live-verified on a disposable test team ("ZZTestSPTeam", a Pikachu with
  Adamant nature - created via import, screenshotted in both read-only and
  edit-mode view, then deleted): confirmed "SP" label, and "Adamant (+Atk,
  -SpA)" rendering with +Atk in the same orange as the ATK stat row and
  -SpA in the same blue as the SPA row, in both view states.

- **Teams tab: relocated Author to the compact header, added an editable
  Nature selector to the EVs box** (2026-07-08): same-day follow-up after
  the user reviewed items 6-7 below live (an annotated screenshot of their
  real "blaze" team) and flagged two things. Two pieces:
  1. **Author moved next to the Regulation badge**: `TeamCard.tsx`'s Author
     UI moved out of the expanded-view block above the Pokemon grid (see
     the Done entry below) into the always-visible compact header row,
     immediately before `RegulationBadge` - a small "by {author}" span in
     read-only view, a small text input (same onBlur-commits/Enter-blurs
     pattern as the team-name field) while `isEditingTeam`. Because this
     row renders regardless of expand state, Author is now visible/editable
     without expanding a team at all. Still hidden entirely when unset.
  2. **Nature selector added to the EVs box** (a genuine pre-existing gap,
     not a regression from items 6-7 - `nature` has been on
     `ShowdownPokemon`/parsed via `parser.ts` since the original import
     flow, and `useActiveEditor.ts` already had an unused `updateNature`,
     but no Teams-tab UI ever rendered or edited it anywhere). New
     `NATURES` (all 25, unrestricted in every VGC/Champions regulation so
     no legality filtering needed) in `config/vgcData.ts`.
     `StatsColumn.tsx` gained a `nature` prop rendered directly beside the
     "EVs" label - a `<select>` while editing (committing through the same
     generic `onUpdatePokemon({ nature })` already used for EV writes, no
     new plumbing needed), a plain "· {Nature}" suffix otherwise, hidden
     when unset. `PokemonCard.tsx` threads `showdownData.nature` through.
     Deliberately did *not* add nature's boosted/lowered stat color-coding
     that the Calc tab's own nature UI has (`CalcPokemonPanel.tsx`, from an
     earlier session) - that reads `@smogon/calc`'s `gen.natures.get()`,
     a heavier dependency not worth pulling into the Teams tab for what the
     user scoped as just "fit it in the EVs box", not stat-effect coloring.

  Live-verified on a disposable test team ("ZZTestNatureTeam", a single
  Pikachu with Adamant nature, author "Ash Ketchum" - created via the
  import modal, screenshotted, then deleted): the Nature dropdown correctly
  pre-filled "Adamant" (parsed from the Showdown text) right next to "EVs",
  and the Author input/text rendered correctly beside the Reg M-A badge in
  both edit and read-only states. Also incidentally confirmed against the
  user's real "blaze" team (read-only, never mutated) that it now shows
  "by vanny" next to its Reg M-B badge in the same relocated spot.

- **Teams/Calc: editable Author field + Pokepaste/Showdown-standard per-stat
  coloring** (2026-07-08): items 6-7 of the reprioritized third review pass,
  done together. Two pieces:
  1. **Author field** (item 6): `Team` gained an optional `author?: string`
     (`types/pokemon.ts`) - no `useTeams.ts` changes needed since
     `updateTeam`'s existing `Partial<Team>` signature already covers a new
     field generically. `ImportTeamModal.tsx` gained an "Author (optional)"
     text input under Team Name, included on creation
     (`author: author.trim() || undefined`) and reset alongside the other
     fields on close/success. `TeamCard.tsx` originally showed it in the
     expanded view above the Pokemon grid - **relocated in a same-day
     follow-up pass to sit next to the Regulation badge in the always-
     visible compact header instead, see the newer Done entry below.**
     Hidden entirely when no author is set, so teams without one (e.g.
     imported from a plain Showdown paste) show no empty chrome. Auto-fill
     from a Pokepaste link import is still a follow-up, gated on the
     not-yet-built Pokepaste-link-import item elsewhere in this file.
  2. **Per-stat coloring** (item 7): new `STAT_LABEL_COLORS`/
     `getStatLabelColor()` in `config/pokemonTheme.ts`, keyed by the short
     display label ('HP'/'Atk'/'Def'/'SpA'/'SpD'/'Spe') rather than either
     tab's own differing stat-key vocabulary (`EVSpread`'s `attack`/
     `specialAttack` vs. `@smogon/calc`'s `atk`/`spa`) - one shared map
     without reconciling those two enums. Applied to `EVStatCell.tsx`'s
     label span (Teams tab EVs) unconditionally, and to `CalcStatRows.tsx`'s
     label span as the fallback case only - nature boost/lower
     (red/blue, already-existing functional signal) still takes precedence
     over the static per-stat color there, so a boosted/lowered stat's
     highlight isn't lost.

  Live-verified both on a disposable test team ("ZZTestAuthorTeam", a
  single Pikachu, author "Ash Ketchum" - created via the import modal,
  screenshotted, then deleted, never touching the user's real teams): the
  Author input rendered pre-filled correctly in edit mode and as "by Ash
  Ketchum" in read-only view. Per-stat colors confirmed on the Calc tab
  (Metagross loaded into Pokemon 1/2) showing HP red/ATK orange/DEF
  yellow/SPA blue/SPD green/SPE pink on both panels simultaneously -
  screenshotting the Teams tab's own EVStatCell got cut off by viewport
  height before reaching the EVs grid, so that half relied on shared-code
  review (same `getStatLabelColor` import/call) rather than a second
  direct screenshot, given the Calc-tab screenshot already proves the
  underlying color function renders correctly.

  **New `run-desktop` gotcha found and written into SKILL.md**: `click
  <sel>`'s `element.click()` does not reliably focus the element for
  subsequent `type` commands - typing after `click #someInput` can land
  nowhere, silently. The reliable way to fill a React-controlled input via
  the driver is a native-setter + dispatched-event `eval`, not
  `click` + `type`.

- **Battle Logger: player roster cells restyled to match the opponent's
  select/input footprint** (2026-07-08): item 5 of the reprioritized third
  review pass. `PlayerFieldPanel.tsx`'s `StaticCell` (the read-only ability/
  item/move text in each player roster row) now carries the same padding/
  border/rounding/background box as `OpponentRowFields.tsx`'s
  `cellSelectClass` select/input cells, just in a dimmer, non-interactive
  shade (`bg-gray-900/60 border-gray-800` vs. the opponent's
  `bg-gray-900 border-gray-700`) - signals "not editable" while occupying
  the same per-cell footprint instead of collapsing to a shorter plain-text
  height. Only the per-cell box was equalized, not the whole column height -
  the opponent side's `OpponentExtras` (ability chip, item-consumed
  checkbox, overflow moves) still adds height the player side structurally
  never has, so the 500px vs. 608px column-height gap measured in an
  earlier pass is still open if fuller parity is wanted later. Live-verified
  on a disposable test battle (team "blaze" + an added Metagross opponent,
  cleaned up after): screenshotted both roster columns side by side and
  confirmed matching boxed cells.

- **Battle Logger: ability audit pass - switch-in table verified, Legendary
  weather/terrain setters added, and a new hit-triggered reactive-ability
  category built from scratch** (2026-07-08): item 4 of the reprioritized
  third review pass. Three pieces:
  1. **`config/onSwitchInAbilities.ts` verified, not broken**: live-tested
     the user's own example (Arbok) during this session's earlier item-4
     testing and confirmed Intimidate's chip works correctly for it - the
     lookup really is ability-name-keyed as the table's own header claimed,
     so there was no species-keying bug to fix. Added the two Gen9
     Paradox-legendary signature abilities that were missing from the
     weather/terrain-setter set: Hadron Engine (Miraidon - sets Electric
     Terrain) and Orichalcum Pulse (Koraidon - sets Sun), both verified
     against Bulbapedia. Each also has a passive raw-stat multiplier in
     their own weather/terrain (not modeled - it's not a stage change,
     same category of thing as Sandstorm's passive Rock-type SpDef boost
     already being out of scope everywhere else in this app). Confirmed no
     other switch-in stat-changing ability exists beyond the
     already-known Intimidate/Intrepid Sword/Dauntless Shield trio and the
     already-excluded Download.
  2. **`config/reactiveAbilities.ts` (stat-lowered trigger) confirmed
     complete**: Defiant/Competitive really are the only two abilities of
     this specific "raise own stat when own stat is lowered" shape in the
     game - no third example found.
  3. **New hit-triggered reactive ability category, built from scratch**:
     the broader "raise a stat when hit by a move matching some condition"
     family (Justified, Rattled, Stamina, Weak Armor, Water Compaction,
     Steam Engine) needed a genuinely different trigger shape, not more
     rows in an existing table, exactly as flagged when this item was
     first captured. Verified each ability's exact trigger/stages against
     Bulbapedia rather than assuming from memory. New
     `config/hitReactiveAbilities.ts` defines a `HitTrigger` union
     (`any-hit` for Stamina, `category: physical` for Weak Armor,
     `move-type: string[]` for the rest) plus a `matchesHitTrigger` pure
     function that explicitly excludes status moves (being hit always
     means a damaging move) and reuses per-target `effectiveness` to skip
     immune hits. This needed the move's type/category to be
     *retrievable from a past logged action*, which nothing stored before
     now - `BattleAction` gained optional `moveType`/`moveCategory` fields
     (`types/pokemon.ts`), populated in `Battlefield.tsx::handleMovePicked`
     at the exact same spot `effectiveness` already gets computed, same
     snapshot-at-log-time pattern. New
     `utils/battleLookup.ts::hasUnappliedHitReactiveEffect` mirrors the
     existing `hasUnappliedReactiveLowerEffect`'s "since the last
     qualifying trigger, not since switch-in" scoping logic, and new
     `useBattleLogActions.ts::applyHitReactiveEffect` mirrors
     `applyReactiveLowerEffect`'s one-tap-apply mutation (looping over
     multiple stat changes for abilities like Weak Armor that touch two
     stats). `BattlefieldSlot.tsx` gained a third chip type alongside the
     existing switch-in/reactive-lowered ones, same purple pill styling.
     Deliberately excluded and documented in the new file's header:
     Anger Point (triggers on being hit by a *crit* specifically - nothing
     tracks crit/miss per hit yet, tied to the already-deferred
     crit/miss-tracking backlog item) and Anger Shell/Berserk (trigger on
     HP crossing the 50% threshold from a hit - this app doesn't track
     numeric/percentage HP anywhere at all). Also simplified: Rattled's
     real trigger is "Bug/Ghost/Dark move OR hit by Intimidate" - only the
     move-type half is modeled, since the Intimidate half would mean
     cross-checking a structurally different trigger source (an
     Intimidate-application note, not a logged move action).

     Live-verified end-to-end on a disposable test battle (Toxapex with
     Stamina vs. an Arbok using Acid, cleaned up after): logging Acid onto
     Toxapex correctly surfaced a "Stamina!" chip (any-hit trigger,
     matching a damaging non-immune hit), and tapping it correctly logged
     "Def +1 (Stamina)" and made the chip disappear (the "already applied
     since last qualifying hit" check working as intended). The
     status-move exclusion in `matchesHitTrigger` (being hit only counts
     for a damaging move) is a single `if (moveCategory === 'status')
     return false` guard verified by direct code review rather than a
     second live UI pass - fighting the opponent-move free-text popover's
     different interaction pattern (vs. the player-move popover already
     scripted for the positive-case test) wasn't a good use of further
     session time for a one-line, type-checked, unambiguous exclusion.

- **Battle Logger: comprehensive pass over guaranteed stat-changing moves,
  plus a real ally-targeting bug found along the way** (2026-07-07):
  follow-up to the Growth-only pass below, after the user pushed back that
  item 3 needed full coverage of every guaranteed stat-changing move, not
  just Growth. Did real research rather than assembling the list from
  memory - cross-checked Bulbapedia's stat-modifier reference page,
  Bulbapedia's "Moves by stat modification" category tree (which cleanly
  splits into per-stat/per-direction subcategories, confirming which
  moves are candidates at all), and individual move pages for anything
  ambiguous, specifically to exclude *chance*-based secondary effects
  (Rock Smash's 50% Def-1, Ancient Power's 10% +1-all, Charge Beam's 70%
  SpA+1, etc.) - those aren't "guaranteed" the way this table requires,
  and there's no way to know from a log alone whether the chance actually
  triggered. `config/moveStatEffects.ts` grew from ~30 entries to ~65:
  new self-boosting moves (Work Up, Hone Claws, Cosmic Power, Geomancy,
  Shift Gear, No Retreat, Clangorous Soul, Victory Dance, Fillet Away,
  Tidy Up, Take Heart, Trailblaze, Psyshield Bash, Torch Song, Mystical
  Power, Flame Charge, Electro Shot, Barrier, Withdraw, Defense Curl,
  Charge, Stockpile), a self-lowering addition (Fleur Cannon), new
  target-lowering moves (Mystical Fire, Snarl, Struggle Bug, Acid Spray,
  Skitter Smack, Spirit Break, Bitter Malice, Lunge, Breaking Swipe, Trop
  Kick, Screech, Metal Sound, Fake Tears, Cotton Spore, Tickle, Tearful
  Look, Icy Wind, Bulldoze, Rock Tomb, Mud Shot), and a new
  target-*raising* category for ally-support moves (Decorate, Coaching,
  Aromatic Mist, Flower Shield) that didn't exist in the table before.
  Documented in the file's header exactly which moves and mechanics are
  deliberately still excluded and why: Belly Drum (sets Attack to exactly
  +6, not a "+6 delta" - would land wrong from a non-zero starting stage),
  Curse (completely different effect depending on the user's own type -
  needs a conditional branch this table doesn't model), Psych Up/Spectral
  Thief (copy/steal the target's *current* stages, unknowable in advance),
  and the various Swap/Split moves (average or exchange stages between
  two Pokemon rather than applying a fixed delta to one).

  Live-verifying the new entries on a disposable test battle (2 player
  Pokemon + 1 opponent, cleaned up after) surfaced a real, previously-
  unnoticed bug unrelated to the stat-effects table itself: Coaching
  (an ally-only support move, should never buff the user who casts it)
  logged as boosting *both* the user and the ally. Root-caused to
  `config/moveTargeting.ts`: PokeAPI's raw move-target vocabulary
  distinguishes `"user-and-allies"` (includes the user) from
  `"all-allies"` (every other Pokemon on the side, explicitly NOT the
  user), but this app's `TargetCategory` mapping collapsed both into one
  `'all-allies'` bucket that always included the mover - fixed by adding
  a separate `'other-allies'` category and correctly splitting the two
  raw PokeAPI slugs across it (`Battlefield.tsx` gained the matching
  auto-resolve branch). That fix alone didn't actually fix Coaching,
  though: checking the cached move data showed PokeAPI itself reports
  Coaching's target as `"user-and-allies"`, which is simply wrong for
  this specific move (Coaching's own documented effect explicitly
  excludes the user) - a PokeAPI *data* gap, not a category-mapping bug,
  same category of issue as the various Champions balance-patch overrides
  already hand-corrected elsewhere in this app. Added a small
  `MOVE_TARGET_OVERRIDES` table (currently just Coaching) checked by move
  name before the raw-target mapping, same override-table pattern as
  `config/championsMoveOverrides.ts`. Live-verified end-to-end: Trailblaze
  correctly gave the user Spe+1 regardless of what was clicked as the
  move's (damage) target - confirming self-effects are independent of
  target selection; Icy Wind correctly applied Spe-1 to the opponent;
  Coaching incorrectly applied Atk+1/Def+1 to both the user and the ally
  before the fix, and correctly applied it to only the ally after.

- **Battle Logger: Growth's weather-conditional stat effect, plus a model
  extension for weather-conditional move stat-effects generally**
  (2026-07-07): item 3 of the reprioritized third review pass. Growth was
  entirely absent from `config/moveStatEffects.ts` and posed a real model
  gap beyond "just add a row": it raises Atk/SpA by 1 stage each normally
  but doubles to +2 each in Sun, and the existing `MoveStatEffect` shape
  (`changes: {stat, stages}[]`) had no way to express a weather-
  conditional stage count. Added a new `MoveStatEffectEntry` internal
  shape (not exported - callers still only ever see the plain
  `MoveStatEffect` `{changes, appliesTo}` they already know how to
  consume) with an optional `inWeather?: Partial<Record<WeatherType,
  {stat, stages}[]>>` that fully *replaces* `changes` while a listed
  weather is active, rather than stacking with it - matches how Growth
  (the only currently-known example) actually works. `getMoveStatEffect`
  gained an optional second `weather` parameter and resolves the override
  internally before returning, so `useBattleLogActions.ts::logAction`'s
  consumption code needed only a one-line change: passing
  `fieldState.weather?.type` (the already-reassigned local `fieldState`
  after this action's own field effects are applied, not the stale
  `battle.fieldState`, so a hypothetical future move that both sets
  weather and has a weather-conditional stat effect in the same log call
  would still resolve correctly) instead of no weather argument at all.
  Live-verified on a disposable test battle (a Ninetales with Growth in
  its moveset, cleaned up after): logging Growth with no weather active
  correctly recorded "Atk +1 (Growth)" / "SpA +1 (Growth)" turn-log notes
  and a "Atk +1, SpA +1" stage-summary badge; advancing to turn 2, setting
  Sun, and logging Growth again correctly recorded the doubled delta -
  "Atk +2 (Growth)" / "SpA +2 (Growth)" - bringing the summary badge to
  "Atk +3, SpA +3" (1 + 2, the stage math compounding correctly across
  both logs).

- **Teams page: collapsing a team while in edit mode now exits edit mode
  too** (2026-07-07): item 2 of the reprioritized third review pass (a
  confirmed bug with a small fix). `TeamCard.tsx`'s Expand/Collapse toggle
  button's `onClick` now also calls `setIsEditingTeam(false)` whenever the
  click collapses the card (`nextExpanded === false`) - previously it only
  ever toggled `isExpanded`, leaving `isEditingTeam` true underneath a
  collapsed card. This was concretely visible via the team-name header,
  which renders as a plain `<h2>` vs. an editable `<input>` based on
  `isEditingTeam` alone, outside the `isExpanded` block - so re-expanding
  a team that had been collapsed mid-edit previously still showed the
  editable input and every Pokémon card's edit controls (since
  `isEditingTeam` is also threaded down as `PokemonCard`'s `isEditing`
  prop). Live-verified: entered edit mode (confirmed the dashed-underline
  editable name input existed), clicked Collapse, then Expand again - the
  header rendered back as plain read-only text and the roster cards no
  longer showed their edit controls, confirming edit mode was actually
  exited by the collapse rather than just visually hidden.

- **Calc page: narrow the move-search box for easier row-selection**
  (2026-07-07): item 1 of the reprioritized third review pass (highest-
  priority item in the batch - a trivial fix with a real daily-use
  annoyance behind it). `CalcMoveGrid.tsx`'s move-name `CalcAutocomplete`
  wrapper changed from `className="flex-1"` (stretched to fill nearly the
  whole row) to `className="w-40 shrink-0"` (fixed 160px) - the row's
  other children (hit-count select, Crit button, percent span) were
  already fixed-width, so removing the one `flex-1` grow item leaves a
  large genuinely-empty stretch of row background between the search box
  and the percent display, all still wired to the row's own `onClick`
  (unaffected - only the search-box wrapper's `stopPropagation` was ever
  blocking it). Live-verified: set Metagross + Meteor Mash in slot 1,
  confirmed via `elementFromPoint` that a click 75% across the row now
  lands on the row `<div>` itself (previously would have hit the
  search-box wrapper), and confirmed clicking there actually flips the
  row's class to the selected state (`border-blue-500 bg-blue-950/40`),
  same as clicking used to require finding the narrow sliver right next
  to the Crit button.

- **Battle Logger: move weather/terrain above the Battlefield, stack side
  conditions vertically** (2026-07-07): item 4 of the second review pass.
  `FieldWeatherBar` moved out of the opponent row's right-hand column
  into its own full-width row above both active-mon rows in
  `Battlefield.tsx`; `SideConditionsRow.tsx` changed from `flex flex-wrap`
  (chips wrapping into however many lines fit) to `flex flex-col
  items-start` (one condition per row), narrowing each side's column
  down to just its longest active label instead of a multi-chip-wide
  wrapped block. Live-verified on a disposable test battle with several
  conditions active on both sides (Tailwind/Reflect+Clay on one side,
  Stealth Rock/Spikes on the other) - weather/terrain/Trick Room render
  as one row up top, each side's conditions stack narrowly next to its 2
  active Pokemon.

  **However**, verifying this against the item's actual goal (shrink the
  opponent roster panel to match the player's) turned up a real gap in
  the premise: `getBoundingClientRect()` on both `PlayerFieldPanel`'s and
  `OpponentFieldPanel`'s outer containers measured exactly 224px wide,
  both - because both are already pinned to a fixed `w-full lg:w-56
  shrink-0` regardless of `Battlefield.tsx`'s own content width. This
  session's Battlefield changes are still a real, verified improvement to
  Battlefield's own layout, but they were never capable of "freeing up
  space forcing the opponent panel wider" the way item 4 assumed - that
  causal link doesn't exist in the current code (the panels' widths are
  independent of Battlefield's). If the opponent panel still reads as
  bigger day to day, it's more likely the *height* difference the Stage 3
  Done entry already measured and left unresolved (500px vs 608px column
  height) - not width. Flagged rather than silently claiming this fully
  solves item 4's stated goal.

- **Calc page: fold stat-stage boosts into the Total column** (2026-07-07):
  item 10 of the second review pass, filed and picked up in the same
  session right after item 2 shipped without it. `useDamageCalc.ts`'s
  `computeRawStats` was renamed/repurposed to `computeBoostedStats`
  (`pokemon1RawStats`/`pokemon2RawStats` -> `pokemon1BoostedStats`/
  `pokemon2BoostedStats`, threaded through `CalcPage.tsx` ->
  `CalcPokemonPanel.tsx` -> `CalcStatRows.tsx`'s "Total" column) -
  generalizes what `computeEffectiveSpeed` already did for Speed alone
  (stage-boost multiplier, paralysis-halving) to all 6 stats; Speed still
  gets the paralysis-halving special case since that's the only stat it
  affects in the real games, the other 5 just get the plain multiplier.
  `computeEffectiveSpeed` itself now delegates to `computeBoostedStats`
  instead of duplicating the formula. Also fixed a latent rounding bug
  caught while generalizing: the pre-existing non-paralyzed branch never
  floored the boosted value, so a boost multiplier landing on a non-clean
  fraction (any base stat not evenly divisible by the stage's multiplier)
  could have rendered a fractional Speed number in the tier banner -
  `computeBoostedStats` floors per-stat, matching how the real stat
  formula rounds. Live-verified: neutral 60-base Speed correctly showed
  Total 80 at 0 SP/boost, 160 at +2 boost (80 * 2), and 80 again once
  Paralyzed was set with the +2 boost still applied (floor(160/2)).

- **Calc page: stat-total column, trimmed/relayouted field-condition
  toggles, spacing pass** (2026-07-07): items 1 (partial)/2/3 of the
  second review pass, built against real calc.pokemonshowdown.com
  reference screenshots the user provided (vs. our own current-state
  screenshot for comparison). Three pieces, plus a set of decisions asked
  and answered up front since the reference images contradicted or
  extended the item text as originally written:
  1. **Stat total column**: `useDamageCalc.ts` gained `computeRawStats`
     (+ `pokemon1RawStats`/`pokemon2RawStats`) - base+SPs+nature only, no
     stage boost, reusing the same underlying `Pokemon.rawStats` the
     existing Speed-tier banner already relies on (just exposed for all 6
     stats instead of only Speed). `CalcStatRows.tsx` shows it as a new
     "Total" column next to the existing Base/SP/Boost ones (Boost - the
     battle-stage -6..+6 input - kept as its own editable field, since
     the engine still needs it; the new Total intentionally excludes it,
     matching the item's own example calculation). Live-verified: neutral
     Hardy/0 SP Abomasnow correctly showed HP 165/Atk 112/Def 95/SpA
     112/SpD 105/Spe 80, matching the base-stat formula with no boost
     applied.
  2. **Field-condition toggle trim + relayout**: cross-referencing the
     real calc's field column against ours found 4 extras (Flower
     Gift/Battery/Power Spot/Steely Spirit) and a couple of differences
     the user resolved via up-front questions rather than guessing: the
     4 extras are now conditionally rendered in `CalcSideConditions.tsx`
     (only shown when that side's own Pokémon's `ability` field actually
     matches - not removed outright, since Champions definitely has
     Pokémon with these abilities), "+1 All Stats" was left out per the
     original item text (even though the reference screenshot shows it
     in the real calc - flagged as a real contradiction, user chose to
     keep the original "drop it" instruction), and two real-calc toggles
     we don't have at all (Power Trick, Switching Out - both natively
     supported by `@smogon/calc`'s `Side` class already) were explicitly
     deferred rather than added. Also switched the two side columns from
     identical/symmetric to mirrored left-aligned (Pokémon 1) /
     right-aligned (Pokémon 2) text and Spikes button order (0,1,2,3 vs
     3,2,1,0), matching the reference exactly - `CalcSideConditions`
     gained an `align: 'left' | 'right'` prop and `CalcFieldPanel`/
     `CalcPage` now thread each Pokémon's live `ability` value down so
     the conditional toggles have something to check against.
     Live-verified: setting Pokémon 1's ability to "Flower Gift" made
     that toggle appear at the bottom of Pokémon 1's column only, with
     Pokémon 2's column (ability still "None") showing no such toggle;
     spikes buttons and toggle text alignment mirror correctly per side.
  3. **Spacing pass**: `p-4`/`gap-3`/`gap-4` trimmed to `p-3`/`gap-2`/
     `gap-1.5` across `CalcPage.tsx`, `CalcMoveGrid.tsx`,
     `CalcResultPanel.tsx`, `CalcPokemonPanel.tsx`, and
     `CalcFieldPanel.tsx`. Only a general tightening pass, not the
     dedicated 1920x1080-targeted density match the item originally
     asked for - measured a real improvement at the 1280x720 minimum
     window regardless (924px `main.scrollHeight` vs the Stage 4
     baseline's 1102px, both against `clientHeight` 661px), but the
     scrollbar isn't eliminated and no specific 1920x1080 verification
     was done. Left open as the remainder of item 1 if further
     tightening is wanted.

  The Stage 4 follow-up to unify this file with the Battle Logger's
  `SideConditionsRow.tsx` into one shared component is still open - both
  still exist as separate, now differently-laid-out implementations.

- **Teams page: fixed sprite-row width + Edit/Delete button order**
  (2026-07-07): items 8-9 of the second review pass. `TeamCard.tsx`'s
  sprite row now always renders 6 slots (`Array.from({ length: 6 }, (_,
  idx) => team.pokemon?.[idx])`), with an empty `w-8 h-8` placeholder div
  standing in for any unfilled slot - live-verified the "blaze" (5
  Pokemon) and "metagross team" (6 Pokemon) cards' name headers both now
  start at the exact same x-coordinate (577px), where before the shorter
  roster's name sat further left. Also swapped the header controls
  cluster so Edit renders before Delete (previously Delete-then-Edit) -
  live-verified via button x-coordinates (Edit at 991px, Delete at
  1027px).

- **Battle Logger: undo/sendIn field-state fix, Mega+switch-out-move fix,
  ally move targeting** (2026-07-07): items 5-7 of the second review pass.

  1. **Undo fix**: `useBattleLogActions.ts::undoLastAction` popped only the
     turn-log entry, never reversing whatever field-state mutation the
     popped action caused - concretely, undoing a `'sendIn'` action left
     the Pokemon still occupying its Battlefield slot with no log entry to
     explain why. Now inspects the popped action's `phase` and, for
     `'sendIn'` specifically, also clears that slot back to `null` in the
     same `updateBattle` call. Deliberately scoped to `'sendIn'` only -
     `'switch'`/`'mega'` aren't reversed the same way, since the app
     doesn't retain enough history to know what to restore (e.g.
     `swapActive` never logs which Pokemon it replaced). Live-verified on
     a disposable test battle: sent a Pokemon into an empty slot, reloaded
     the app (fresh mount, not just in-memory state), clicked Undo Last,
     confirmed both the turn-log entry disappeared and the slot returned
     to empty (bench picker showed the Pokemon as available again).

  2. **Parting Shot fix**: root cause turned out to be different from what
     the item description assumed. Read a real reproduction directly out
     of the user's actual in-progress battle (`battles.json`) rather than
     guessing: the opponent had Mega Evolved *and then* used Parting Shot
     in the same turn. `utils/battleLookup.ts::canSwitchOutThisTurn` had
     an unconditional `actions.some(a => a.phase === 'switch' || a.phase
     === 'mega')` check that blocked switching whenever a `'mega'` action
     existed for that Pokemon this turn, regardless of what move followed
     it - so a Mega'd Pokemon could never switch out via a switch-out move,
     even though Mega Evolving is compatible with any move including
     Parting Shot/U-turn/etc. Fixed by only treating a bare Mega (no move
     logged yet) as blocking; once a move is logged, the existing
     `isSwitchOutMove(...)` check is what decides it, same as the non-Mega
     case. Live-verified by reconstructing the exact scenario (Mega action
     + Parting Shot move action for the same pokemonId) in a disposable
     test battle: the Switch button was disabled before the fix and
     enabled after, with the correct title text.

  3. **Ally targeting**: turned out the click-to-log flow already let you
     target an ally manually (`Battlefield.tsx::handleSlotClick` finalizes
     `pendingTarget` against whatever slot is clicked, regardless of
     side) - verified live by logging Parting Shot onto an ally and
     confirming it applied correctly. The actual gap was discoverability:
     `handleMovePicked`'s candidate-highlighting only lit up opponent
     slots for a `'single-foe'`-category move (PokeAPI's
     `selected-pokemon`/`random-opponent`/etc.), even though real doubles
     lets a single-target move hit any adjacent Pokemon, ally included.
     Widened the fallback candidate list to include ally slots alongside
     opponent slots for this case (previously only the `'unknown'`
     category did that) - `'single-ally'` keeps its own dedicated branch
     since a single ally is usually unambiguous. Live-verified: picking
     Parting Shot now rings both the opponent and the ally in yellow as
     valid targets, not just the opponent.

  All three verified against disposable test battles crafted directly in
  `battles.json` (bypassing fragile multi-step UI setup for state that
  isn't the actual thing under test - see the run-desktop skill's
  DOM-ambiguity gotcha below) and cleaned up afterward; the user's real
  in-progress "metagross team" battle was never touched. **New gotcha for
  `run-desktop`-driven testing on this page**: `click-text`/naive
  `querySelector` frequently mismatch on this page because the same
  Pokemon name/sprite `alt` text appears in multiple places at once (the
  roster sidebar, the Battlefield slot, the opponent tag panel) and the
  sidebar sits earlier in the DOM than the Battlefield - a plain
  `click-text` or `document.querySelector('img[alt=...]')` silently hits
  the sidebar (toggling brought/roster state) instead of the intended
  Battlefield slot. Scope queries to a Battlefield-specific class (the
  slot button's `rounded-lg p-1` combo, or the open popover's
  `div.absolute.z-20`) instead of matching by text/alt alone.

- **Calc page: Kaizo-inspired redesign - nature colors, speed tier, team
  dropdown, field-panel restyle, header cleanup** (2026-07-07): Stage 4,
  the last of the 2026-07-07 UI-polish batch. Five pieces:
  1. Dropped the redundant "Damage Calculator" h1 and "Champions" text
     entirely; "Powered by @smogon/calc" moved to a small centered line
     at the very bottom of the page; the Regulation selector is now the
     first element on the page (was previously sharing a row with the
     deleted header).
  2. Nature color coding: `useDamageCalc.ts` gained `getNatureStatEffect`
     (reads `gen.natures.get()` - @smogon/calc always sets both
     `plus`/`minus` to the *same* stat for a genuinely neutral nature
     like Hardy, rather than leaving them undefined, so equality is
     checked explicitly) and exposes `pokemon1NatureEffect`/
     `pokemon2NatureEffect`, threaded through `CalcPokemonPanel.tsx` into
     `CalcStatRows.tsx` - the boosted stat label shows red+`"+"`, the
     lowered one blue+`"-"`, matching the mainline-games convention.
     Live-verified: Modest Charizard correctly showed `SPA+` red /
     `ATK-` blue.
  3. Speed-tier banner: `useDamageCalc.ts` also exposes `pokemon1Speed`/
     `pokemon2Speed` (`rawStats.spe` with the stage-boost multiplier and
     paralysis halving applied manually - @smogon/calc's own `rawStats`
     doesn't factor in stage boosts, only base/nature/SPs). Doesn't model
     Tailwind/weather speed abilities since the field state has no
     concept of which ability is actually active - would be guessing.
     Rendered as a banner in `CalcFieldPanel.tsx`. Live-verified: a
     Charizard/Ninetales speed tie at 120 correctly flipped to "Pokémon 1
     is faster (240 vs 120)" after a live +2 Speed boost edit.
  4. Field-conditions panel restyle: `CalcSideConditions.tsx`'s 14
     boolean toggles are now full-width stacked buttons (one per row)
     instead of a `flex-wrap` chip cluster, matching the Kaizo/Showdown
     calc reference style; Spikes stays a compact 4-button row (0-3, not
     worth 4 full-width rows for one stackable stat).
  5. Team dropdown (replacing the Kaizo Team/Box concept): new
     `CalcTeamTray.tsx` (a team-name dropdown + up to 6 sprites) is
     embedded directly in `CalcPokemonPanel.tsx` - identical on both the
     Pokémon 1 and Pokémon 2 panels, so unlike Kaizo's opponent-side
     AI-flags/exp-dropped panels, ours gets the same picker both sides.
     Clicking a tray sprite loads it into *that panel's own* slot;
     dragging one (new `utils/calcDragTypes.ts`) can drop onto *either*
     panel, so a Pokémon 1 tray item can be dragged onto the Pokémon 2
     slot and vice versa - deliberately two different affordances for
     "quick-swap which one is loaded into Pokémon 1 or Pokémon 2" per the
     original ask. New `utils/calcTeamImport.ts::teamPokemonToCalcUpdates`
     maps a saved team's `ImportedPokemonInfo` into `CalcPokemonState` -
     species/item/ability/moves are copied as-is (no fuzzy name
     resolution against @smogon/calc's own list; Showdown export names
     already match closely enough, and a rare mismatch just surfaces as
     a normal per-move calc error, not a crash) - and confirmed the
     Team Builder's own `evs` field is already Champions' 0-32 SP scale
     (enforced in `StatsColumn.tsx`), not traditional 0-252 EVs, so it
     copies directly into `CalcPokemonState.sps` with no conversion.
     `App.tsx` now threads `teamsState`/`spriteCacheState` into
     `CalcPage` (previously only `gameDataState` was passed).
     Live-verified end-to-end: clicking a team's Metagross correctly
     populated species/moves/item (Metagrossite, correctly surfacing the
     Mega forme toggle)/ability/nature (Adamant, colored correctly)/SPs
     (66/66 total, matching the saved team exactly); dragging a
     different team member onto the *other* panel correctly cross-loaded
     it (species/moves/item/ability/gender icon all correct).

  **However, like the Battle Logger roster pass in Stage 3, this does
  not achieve "fits the minimum window without scrolling."** Measured
  directly: `main.scrollHeight` 1102px vs `clientHeight` 661px at the
  1280x720 minimum size, even at the page's emptiest default state - and
  this is likely *worse* than before this pass, not better. The
  full-width-stacked-buttons field panel (explicitly requested, item 8)
  and the new per-panel team tray (item 8) both add real height that the
  removed header (~48px saved) doesn't come close to offsetting - the
  Field panel alone now measures 623px tall (14 stacked condition rows ×
  2 columns + weather/terrain + the speed banner). Every individual
  piece of this item was implemented as asked and verified working -
  this is a real tension between "each condition as its own legible
  full-width row" and "fit everything in 661px," not a bug. Flagging
  for a decision rather than picking one unilaterally: worth a dedicated
  compacting pass (e.g. collapsing the two condition columns into a
  single shared table - see the discarded design note in this session -
  or making the team tray collapsible) if eliminating the scrollbar is
  still a priority now that the requested visual/UX pieces are in place.

- **Battle Logger: compact symmetric roster layout (Sprite+Name /
  Ability|Moves / Item|Moves)** (2026-07-07): Stage 3. Both
  `PlayerFieldPanel.tsx`/`OpponentFieldPanel.tsx` now render the same
  3-row-per-Pokemon grid via `RosterRow.tsx`: sprite+name, then
  `Ability | Move 1 + Move 2`, then `Item | Move 3 + Move 4`.
  `TeamRosterColumn.tsx`'s `RosterRowData` widened to carry `ability`/
  `itemDisplay`/`moves` as `ReactNode` cells (not raw strings) - the
  player side passes plain read-only text (its set is fixed at battle
  start), the opponent side passes live editable controls. The old
  `OpponentInfoTags.tsx` (one big block appended below the row) couldn't
  express that - its pieces needed to land in different specific grid
  cells - so it's replaced by 4 small focused components in the new
  `OpponentRowFields.tsx` (`OpponentAbilityCell`, `OpponentItemCell`,
  `OpponentMoveCell`, `OpponentExtras`), each a real component (not inline
  hook calls in the row-building `.map()`) for the same Rules-of-Hooks
  reason `RosterRow.tsx`/`BattlefieldSlot.tsx` were already split out.
  Opponent moves now fill the 4 grid cells sequentially as revealed - the
  next empty cell doubles as the "add a move" input (replacing the old
  separate always-visible input row), with defensive overflow handling in
  `OpponentExtras` for the data model's uncapped 5th+ move edge case.
  Live-verified: ability select commits, item input commits on blur, and
  the sequential move-fill (chip-with-× appears, input auto-advances to
  the next slot) all work correctly on a disposable test battle.

  Also tightened row spacing (smaller sprite, `p-1` card padding, `gap-1`
  grid gaps, `py-0`/`leading-4` on the opponent's select/input/chip cells)
  to shrink each row's footprint - the player roster column dropped from
  606px to 500px, the opponent's from ~700px+ (rough estimate for the old
  bulky block layout) to 608px, both now roughly matching each other.

  **However, this alone doesn't eliminate the Battle Log page's
  scrollbar** at the 1280x720 minimum window size - measured directly
  (`main.scrollHeight` 991 vs `clientHeight` 661, a 330px overflow both
  before and after this pass). The actual tallest column turned out to be
  the *Battlefield* component (428.5px) plus turn controls (24px) plus
  the turn log (332px, within its existing 192-384px range) = 808.5px,
  taller than either roster column even after compacting. The original
  ask was specifically about the rosters not fitting, which is now fixed
  and confirmed via direct height measurement - but the broader "page
  never needs to scroll" goal needs a separate pass at Battlefield.tsx's
  own sizing (not scoped or touched here), since that's now the actual
  bottleneck, not the rosters.

- **Battle Logger: log a turn-log entry when a Pokemon faints**
  (2026-07-07): Stage 2 (part 3, completing Stage 2).
  `useBattleLogActions.ts::setFainted` now appends a "Fainted" note action
  to the current turn (same `appendAction` helper `logAction` already
  uses) whenever a Pokemon is marked fainted - only on the `fainted=true`
  direction, not when un-fainting to correct a misclick, since that's not
  a game event worth logging. Renders via `TurnLog.tsx`'s existing
  note-only path (no new UI needed) as e.g. "Accelorate *(Fainted)*" in
  the mover's side color. Live-verified on a disposable test battle.

- **Battle Logger: side labels + invalid cross-side drag indicator**
  (2026-07-07): Stage 2 (part 2). Added small "OPPONENT'S SIDE"/"YOUR
  SIDE" labels (red/blue, matching the existing player=blue/opponent=red
  convention from `TurnLog.tsx`) above/below each row's two active slots
  in `Battlefield.tsx`. For the drag feedback: HTML5 drag-and-drop only
  lets a drop target read `dataTransfer.getData()`'s actual payload on the
  `drop` event itself (blanked out during `dragover` for security), but
  `dataTransfer.types` (the list of MIME type strings, not their values)
  *is* readable during `dragover` - so `dragTypes.ts` gained a second,
  side-specific type (`pokemonDragTypeForSide(side)`, e.g.
  `...-pokemon-player`) set alongside the existing payload type at drag
  start (`RosterRow.tsx`). `BattlefieldSlot.tsx`'s `EmptySlot` now checks
  `dataTransfer.types.includes(...)` on every `dragover` to show a live
  valid (blue, existing style) vs. invalid (red border/background, ⊘ icon,
  "Can't send in a Pokemon from the other side" title) state per slot,
  rather than the old always-blue-on-any-drag-over highlight. The actual
  drop-rejection logic (`handleDropPayload`'s `payload.side === side`
  check) was already correct and untouched - this only adds the missing
  *feedback while still dragging*. Live-verified on a disposable test
  battle: dragging a player-side roster card over an opponent slot showed
  the red ⊘ indicator, while dragging the same card over a same-side
  empty slot showed the normal blue valid state, simultaneously and
  independently per slot (confirmed via direct React-prop invocation
  through the run-desktop driver, since Chromium's synthetic `DragEvent`
  dispatch doesn't reliably fire real `dragover` listeners for automated
  testing - real mouse-driven drags in actual use go through the normal
  browser drag pipeline unaffected by this testing quirk).

- **Battle Logger: "sending in" vs "switching in" for fainted-slot
  replacement** (2026-07-07): Stage 2 (part 1) of the 2026-07-07
  UI-polish batch. `useBattleLogActions.ts::switchIn` (fills an EMPTY
  active slot - the start of battle, or a just-fainted slot's
  replacement) and `swapActive` (replaces an already-OCCUPIED slot - a
  manual Switch-button swap, or the continuation of a switch-out move
  like U-turn) were already two cleanly-separate functions, just not
  tagged differently - the existing "doesn't cost a turn action" carve-out
  only checked `turns.length === 1`, so it covered Turn 1's initial leads
  but not a later-turn fainted-slot replacement. Gave `BattleAction` a new
  `phase: 'sendIn'` (alongside the existing `'switch'`/`'mega'`/`'move'`),
  used only by `switchIn` (note text also changed to "Sent in" vs
  "Switched in", so the turn log now reads correctly either way).
  `canActThisTurn`/`canSwitchOutThisTurn` (`utils/battleLookup.ts`) now
  simply never block on a `'sendIn'` phase action regardless of turn
  number, and the old turn-1-only special case is gone entirely - Turn 1
  leads and fainted-slot replacements are now the same code path.
  `hasAppliedAbilityEffectSinceSwitchIn` and the Battlefield's switched-in
  arrow indicator both widened to match `'sendIn'` too, so switch-in
  abilities (Intimidate etc.) and the arrow still work for both cases.
  Live-verified end-to-end on a disposable test battle (created and
  deleted via direct `battles.json` edits, not the user's real data): sent
  a Pokemon in on turn 1 (log correctly read "Sent in"), advanced to turn
  2, fainted it, sent in a replacement mid-turn, and confirmed via the
  Mega button's title attribute ("Mark as Mega Evolved", not "Already
  acted this turn") that the replacement could still act the same turn -
  the exact bug this fixed. Caught and fixed a real mistake mid-session:
  briefly mutated the user's actual in-progress "metagross team" battle
  while first attempting this test via ambiguous `click-text "Fainted"`
  (multiple matching buttons on screen) - restored via direct
  `battles.json` edits back to the exact original `playerFaintedIds`/
  `playerActiveIds`, confirmed by re-screenshotting. Lesson for future
  live-testing: use a disposable battle for anything that mutates state,
  not an existing real one.

- **Side menu cleanup, Teams validator warnings, and a major CSS bug fix**
  (2026-07-07): Stage 1 of the 2026-07-07 UI-polish batch. Dropped the
  "VGC Team Manager" subtext and moved Settings to the bottom of the
  sidebar (`App.tsx`, a second `<ul className="mt-auto">` inside the now
  `flex flex-col` `<nav>`). `teamValidation.ts::validateTeam` gained two
  new checks, same warning-only severity as the existing checks (the
  function is only ever called from `TeamValidationButton.tsx`'s on-demand
  popup - nothing gates save/export on it): a team-size check (<6
  Pokemon) and **Item Clause** (two Pokemon holding the same item),
  mirroring the existing Species Clause duplicate-detection pattern
  exactly. Both live-verified (`blaze`, a 5-mon team, correctly shows "1
  issue found - Team has only 5 Pokémon (6 required)").

  While chasing why `mt-auto` wasn't visibly pushing Settings down, found
  a real, app-wide bug: `src/renderer/index.css`'s global
  `* { margin: 0; padding: 0; }` reset sat *outside* any `@layer` block,
  right after `@import "tailwindcss"`. Per the CSS Cascade Layers spec,
  unlayered CSS unconditionally beats layered CSS regardless of
  specificity or source order - and Tailwind v4 wraps every one of its
  own utility classes (including every `p-*`/`m-*`/`space-y-*`) in
  layers. Confirmed via computed styles that this had been silently
  zeroing out **every margin and padding utility class in the entire
  app**, the whole time (`py-2 px-4` on a nav button was resolving to
  `0px 0px`). Fixed by wrapping the reset in `@layer base { ... }`, the
  standard fix. This is a real, previously-invisible root cause behind a
  lot of the "doesn't quite fit" cramped feeling driving the rest of this
  UI-polish batch - since spacing now actually renders as intended, later
  stages (Battle Logger layout, Calc redesign) need to budget real
  padding/gaps, not the accidentally-collapsed space seen before. Also
  fixed a double-padding/misalignment side effect this exposed in the
  sidebar (`nav`/the status-footer `div` both had their own redundant
  `p-4` on top of the `aside`'s own inline padding, previously invisible
  since padding was zeroed - dropped down to `pt-4`). Spot-checked
  Teams/Calc/Battle Log tabs post-fix for other breakage - none found,
  though Calc's already-known "doesn't fit minimum window" issue (tracked
  in TODO.md's Calc-related notes) is now confirmed still open and
  unaffected by this fix either way.

- **Battle Logger: type effectiveness, opponent ability/item pickers,
  screen duration, Mega ability change, log auto-scroll, faint-on-
  Battlefield, deterministic stat-changing moves** (2026-07-07): another
  manual-testing punch list. Turn 1's initial send-in no longer counts as
  a turn action (`canActThisTurn`/`canSwitchOutThisTurn` now ignore a
  `'switch'` phase entry when `turns.length === 1`) - leads can move
  immediately, matching real Team Preview. Opponent Pokemon selection now
  matches the player side exactly: roster-row clicks are a no-op, active-
  switching only via a Battlefield empty-slot picker or drag - `utils/
  dragTypes.ts`'s payload widened to JSON `{side, pokemonId}` so a drop
  target can reject a mismatched-side drag, and `TeamRosterColumn.tsx`
  split into a real `RosterRow.tsx` component (needed for the Mega-sprite
  work below).

  New `config/typeEffectiveness.ts` (the standard 18-type chart, confirmed
  unchanged from mainline by an earlier Champions audit) computes a
  per-target multiplier at log time, shown as a "Super Effective!"/"Not
  Very Effective"/"No Effect" tag in `TurnLog.tsx` - live-verified an
  Earth Power (Ground) into a Fire/Flying target correctly tags "No
  Effect" (immunity). `OpponentPokemonEntry` gained `types`, fetched live
  (not from the bulk species-list picker, which has no type data) the
  moment an opponent is added.

  The opponent move datalist (added last round) now submits on click
  instead of requiring Enter - the input's `onChange` treats an exact
  match against the suggestion list as a pick. `OpponentInfoTags.tsx`'s
  ability field is now a real `<select>` populated from the same
  species-learnset call the Team Builder's own picker uses, item gained a
  `VGC_ITEMS` datalist, and a "Consumed" checkbox appears for actually-
  consumable items (`config/vgcData.ts::isConsumableItem` - berries +
  Focus Sash/Mental Herb/White Herb). Reflect/Light Screen/Aurora Veil
  gained the same "via Light Clay" extended-duration confidence toggle
  weather already had (8 turns vs. 5) - `SideConditions` gained 3 new
  optional flags, no migration needed.

  Mega Evolving now sets the mon's ability to its real guaranteed Mega
  ability (new `config/megaAbilities.ts`, ~40 entries - deliberately
  covers only real mainline Megas, not the Champions-invented ones like
  Raichu X/Y that have no canonical ability to verify against) and, if
  that ability sets weather/terrain, auto-applies it to the field in the
  same call (no separate confirm chip, since a Mega's ability is
  deterministic the instant it's declared) - live-verified Charizard-Y
  auto-setting Sun with the correct fixed "via Mega" duration. Caught and
  fixed a real bug during verification: the auto-applied weather's note
  didn't mention the ability by name, so the (already-redundant) manual
  "Drought!" switch-in chip kept showing since `hasAppliedAbilityEffect
  SinceSwitchIn` had nothing to match against - fixed by folding the
  ability name into the Mega Evolved note. Also fixed the roster-panel
  sprite to Mega-swap alongside the Battlefield one (previously only the
  Battlefield did) - confirmed both show the same Mega form's numeric
  PokeAPI id.

  The turn log now auto-scrolls to the newest turn as it grows
  (`ActiveBattleView.tsx`, a ref + effect keyed on turn/action count).
  The fainted toggle moved off the roster panel (a Pokemon can only faint
  while active) onto the Battlefield's control row - marking fainted now
  also clears that Pokemon's active slot in the same call, live-verified
  the slot re-opens for a replacement. New `config/moveStatEffects.ts`
  auto-applies deterministic stat changes when a move is logged (Draco
  Meteor's self -2 SpA, Charm's target -2 Atk, etc., not exhaustive) -
  reuses the exact stat-note format the reactive-ability chip already
  scans for, so a move-inflicted drop correctly triggers a target's
  Defiant/Competitive chip with no extra wiring; live-verified Draco
  Meteor correctly dropping the user's own SpA by 2.

  Crit/miss outcome tracking, raised in the same round, was explicitly
  flagged by the user as "something to keep an eye on" rather than a
  concrete ask - folded into the already-deferred status-condition/
  move-outcome-chips backlog item (tracked in TODO.md's Battle Logger roadmap) instead of built here.

- **Battle Logger: turn action economy, persistent slots, move autofill,
  auto field-effects** (2026-07-07): a manual testing pass turned up 6 real
  gaps in how the log modeled doubles' actual turn structure. (1) Each
  active slot now gets exactly one action per turn - new `utils/
  battleLookup.ts::canActThisTurn`/`canSwitchOutThisTurn` gate the move-
  popover, Mega button, and Switch button (renamed from "Bench"), reading
  the current turn's already-logged actions. Mega Evolving counts as
  acting (can't Mega then switch out same turn); a switch-out move
  (U-turn/Volt Switch/Parting Shot/etc. - new `config/switchOutMoves.ts`)
  is the one exception, since the resulting switch is a continuation of
  that move's action, not a second one - `TurnLog.tsx`'s "Failed?" chip
  (previously Protect-repeat-only) now also covers these unconditionally,
  since whether they trigger the swap depends on typing/abilities the log
  can't know. (2) A side must field 2 active Pokemon whenever 2+ are still
  alive - switching out now goes through a forced-replacement picker
  (`swapActive`, one `updateBattle` call) instead of leaving the slot
  empty, unless there's truly nobody left to bring in. (3) Opponent moves
  typed into the freeform field now autocomplete against every PokeAPI
  move name (new `services/pokeapiService.ts::fetchAllMoveNames` + `hooks/
  useMoveNameList.ts`, fetched once and cached, wired into a `<datalist>`
  in `MoveLogPopover.tsx`) - previously a bare text box with no signal
  whether a typed move would actually resolve. (4) Logging a move that
  sets a field effect (new `config/moveFieldEffects.ts`: weather/terrain/
  Trick Room/screens/hazards) now updates the tracker in the same
  `logAction` call automatically - hazards always land on the *opposing*
  side, screens/Tailwind on the mover's own, matching real rules; Trick
  Room used while already active cancels it early instead of refreshing
  the duration. (5) Fixed the root cause of switching visually "sliding" a
  Pokemon into the wrong field position: `playerActiveIds`/
  `opponentActiveIds` changed from a plain `string[]` (order = whichever
  slot, no persistent meaning) to a fixed 2-element `(string | null)[]`
  tuple where the index IS the left/right position, never spliced -
  `swapActive` specifically preserves this by replacing in-place at the
  outgoing Pokemon's existing index. (6) Only one Mega per side per battle
  now enforced side-wide (`setMegaEvolved` checks the whole roster's
  already-used ids, not just the clicked Pokemon), with the Mega button
  hidden entirely on every other Pokemon on that side once used.

  Live-verified end-to-end (`.claude/skills/run-desktop/`, ground-truth-
  checked against `battles.json` directly after an early false start where
  a test-script DOM selector - not the app - matched the wrong popover):
  a freshly-switched-in Pokemon's Move/Mega/Switch controls dim and
  no-op; swapping one active Pokemon for a benched one via the forced
  picker correctly kept the untouched slot's Pokemon pinned to its
  original side while the new one took the exact vacated slot; Mega-ing
  one Pokemon correctly hid the Mega button on a second, still
  Mega-capable Pokemon on the same side for the rest of the battle; typing
  a partial opponent move populated live suggestions (937 total loaded)
  and submitting "Trick Room" both logged it and lit up the field tracker
  at a 5-turn countdown with no manual toggle; a Tailwind use similarly
  auto-lit the mover's own side tracker. Reopening a legacy pre-tuple
  battle loaded cleanly with no console errors, confirming the
  `useBattles.ts` migration (pads old arrays into the new 2-slot shape).

- **Battle Logger: Mega redesign, reactive abilities, more switch-in
  effects, field-effects relocation** (2026-07-07): the Mega button is now
  hidden entirely for non-mega-capable species (`config/megaEvolution.ts`'s
  new `getMegaFormsForSpecies`), resolves automatically from the holder's
  known item when unambiguous, and only shows a small X/Y picker for the
  genuinely ambiguous case (Charizard/Raichu, item not yet confirmed).
  Declaring Mega now also swaps the Battlefield sprite to the real Mega
  form (`hooks/useMegaSprite.ts`, already used by the Team Builder,
  finally reused here) and - opponent side only - auto-fills their item
  field with the resolved Mega Stone, since declaring Mega always reveals
  it. `Battlefield.tsx`'s per-slot rendering moved into a new
  `BattlefieldSlot.tsx` real component specifically so `useMegaSprite` (a
  hook) has a legal per-slot lifecycle - the old `renderSlot` was a plain
  helper called a variable number of times per render, which would have
  violated the Rules of Hooks the moment a hook call was added to it.

  New reactive-ability chip (Defiant/Competitive - `config/
  reactiveAbilities.ts`): shows whenever a Pokemon's most recent stat
  change was a decrease and hasn't yet had a matching reactive-ability
  note logged since (`utils/battleLookup.ts::hasUnappliedReactiveLowerEffect`) -
  can re-trigger multiple times per stint on the field, unlike the
  switch-in chip which only fires once per switch-in.

  `config/onSwitchInAbilities.ts` widened to a discriminated union so an
  ability's effect can be a stat change OR a weather/terrain set - added
  Drought/Drizzle/Sand Stream/Snow Warning and the 4 Surge abilities.
  Applying a weather/terrain switch-in effect auto-computes
  `wasMegaEvolved` from whether the source is currently Mega Evolved, so
  `FieldWeatherBar`'s existing duration-confidence display (fixed 5 turns
  vs. an honest 5-8 range) needed no new UI to pick this up. Added Trick
  Room as a new field-wide effect (`FieldState.trickRoom`, fixed 5-turn
  duration, never ability-triggered).

  Relocated field-effect display into the Battlefield's previously-empty
  side margins, matching the user's own mockup screenshots:
  `SideConditionsRow.tsx` (screens/Tailwind/hazards) next to each side's
  active row - discovered it had been dead code, built earlier this
  session but never actually imported anywhere, so this is also where it
  finally got wired in - and the relocated `FieldWeatherBar` (now also
  covering Trick Room) in the top-right.

  Two bugs caught during verification: (1) declaring Mega and syncing the
  opponent's item were two separate sequential `battleLogActions` calls
  off the same stale `battle` reference - the same class of lost-update
  race already hit and fixed once this session for `switchActive` -
  combined into one `updateBattle` call (`setMegaEvolved` now takes an
  optional `revealedItem` param). (2) Even after that fix, the opponent's
  ability/item text inputs in `OpponentInfoTags.tsx` kept showing stale
  (usually blank) values after an external change like the mega-sync or
  an ability-effect chip - their local draft `useState` only seeded from
  props on mount and never resynced; added a `useEffect` per field to fix
  it. Verified the underlying fix directly against the persisted
  `battles.json` (not just the DOM) after the second bug's discovery made
  DOM-only verification suspect.

- **Battle Logger: layout rework, drag-to-field, stat-stage tracking**
  (2026-07-07): the Battlefield's top row now aligns with the roster
  boxes, and the turn log + Undo Last/Next Turn controls moved into the
  space below the Battlefield instead of a separate full-width block.
  Fixed a real bug: `Battlefield.tsx`'s bench picker only ever rendered
  inside the *occupied*-slot branch of `renderSlot`, so if both of a
  side's slots were empty (e.g. right after bringing 4 with none active
  yet), clicking either did nothing visible - `benchSlot` state now
  tracks the exact `{side, index}` clicked, and both branches share a
  wrapper that can render the picker, so it always attaches to the
  actually-clicked slot. On top of the fix, added the user's preferred
  interaction: drag a roster card (native HTML5 drag-and-drop, no new
  dependency) onto an empty Battlefield slot to switch it in - same
  underlying `switchActive` action as the picker/roster click, so
  logging/the switch-in arrow work identically either way. Click-to-pick
  stays as a fallback alongside drag.

  New stat-stage tracking: `Battle.statStages` (keyed by pokemonId,
  Atk/Def/SpA/SpD/Spe, -6..+6), a "Stats" corner button + new
  `StatStagePopover.tsx` for manual +/- taps, a summary badge under each
  active mon, and auto-reset to empty when a Pokemon leaves the field
  (bench or faint) - matches the real game. New
  `config/onSwitchInAbilities.ts`: a curated table (Intimidate, Intrepid
  Sword, Dauntless Shield - deliberately not Download, see TODO.md)
  mapping an ability to its stat effect; a one-tap "apply" chip shows on
  the Battlefield when a Pokemon's known ability matches, and in
  `OpponentInfoTags.tsx` when a matching ability is typed in after the
  Pokemon's already active - never automatic, matches the app's "manual
  log, not a simulator" philosophy already used for the Protect-fail
  chip. New `utils/battleLookup.ts::hasAppliedAbilityEffectSinceSwitchIn`
  correctly scopes "already applied" to the Pokemon's current stint on
  the field (not just the current turn), since the effect only triggers
  once per switch-in however many turns it stays out.

- **Battle Logger Stage 2: interactive click-to-log flow** (2026-07-07):
  `ActionEntryBar.tsx`'s manual dropdown bar is gone entirely, replaced by
  click-mon -> click-move -> click-target directly on `Battlefield.tsx`
  (new `MoveLogPopover.tsx` for the move list). Target resolution uses a
  new `MoveData.target` field (fetched from PokeAPI like power/pp/accuracy)
  mapped to a coarse category in `config/moveTargeting.ts` - self/field
  moves auto-log immediately, spread moves auto-target every foe/ally, a
  genuinely single-target move highlights the field and waits for one
  click (manual override always allowed regardless of highlight, since
  this is a log, not a rules enforcer). Also: player roster rows now
  toggle brought status on a full-box click (was a tiny "+" corner
  button), matching the opponent roster's existing box-click-to-toggle-
  active feel; active-switching for the player moved entirely into the
  Battlefield (click an empty slot for a bench picker, a corner "Bench"
  button to swap out) since the roster click was now claimed by brought-
  toggling. New `Battle.megaEvolvedIds` + a per-slot "Mega" button. New
  small arrow (▲/▼) under/above a Battlefield slot for a Pokemon that
  switched in that turn, cleared automatically next turn. `TurnLog.tsx`
  now groups each turn's actions switch -> mega -> move regardless of tap
  order, and shows a "Failed?" chip on Protect-family moves - but only on
  a repeat use (`utils/battleLookup.ts::isRepeatProtectUse`), never the
  first, per the user's ask not to waste a tap on the common case.
  `FieldWeatherBar.tsx` gained a "via Mega" toggle: a Mega Evolution's
  ability-triggered weather/terrain is always a fixed 5-turn duration (no
  held-rock ambiguity possible), shown as `(5)`; anything else shows the
  honest `(5-8?)` uncertain range until confirmed.

  Two bugs caught during verification (see the run-desktop skill below):
  a stale `game-data-cache.json` entry for a move fetched before `target`
  existed had no `target` field at all, silently falling into the
  "unknown target" bucket - fixed by treating a cached move without
  `target` as a cache miss in `useGameData.ts::getCachedMove`, forcing one
  self-healing re-fetch (same read-boundary philosophy as the Champions
  override tables). Also: deleting `ActionEntryBar.tsx` silently dropped
  the only "Next Turn"/"Undo Last" controls in the app - added a small
  turn-controls row back in `ActiveBattleView.tsx` above the turn log.

  Also built **`.claude/skills/run-desktop/`**: a Playwright `_electron`
  driver + SKILL.md for automated UI testing (click by DOM text/selector,
  read console/page errors directly, screenshot) instead of driving the
  real OS mouse - the old approach couldn't distinguish a real renderer
  crash from a missed click. `playwright-core` added as a devDependency.
  Gotcha worth remembering: `ELECTRON_RUN_AS_NODE` (often already set in
  this shell) makes `electron.exe` boot as plain Node with no window -
  the driver strips it defensively before every launch.

- **Battle Logger: sprite bug fix + battlefield redesign Stage 1**
  (2026-07-07): Basculegion's sprite wasn't loading in the Battle Logger -
  root cause was that `PickBroughtFourGrid.tsx`/`PlayerFieldPanel.tsx` were
  the only places in the app trusting a raw, copied `spriteUrl` snapshot
  field instead of recomputing it live via `getPixelSpriteUrl()` like
  `PokemonCard.tsx`/`TeamCard.tsx` already do; this one Pokemon's stored
  value was a stale, malformed URL from an older version of the fetch code
  (`.../902-male.png`, a file that doesn't exist - the real one is
  `902.png`, no suffix). Fixed generally (recompute live from
  `pokedexNumber`/`species`/`gender`), not patched as a one-off, so any
  future staleness of this kind can't recur the same way.

  Then a full battlefield layout redesign (Stage 1 of 2 - see the plan
  file for Stage 2, not yet built): both full 6-Pokemon rosters now show
  vertically (`TeamRosterColumn.tsx`, shared/parameterized, replacing the
  old 2-at-a-time grid); the separate "Pick 4 to Bring" screen is gone -
  `StartBattleFlow.tsx` now goes straight from team selection into the
  battle with all 6 snapshotted (`Battle.playerRoster`, renamed from the
  old fixed-4 `broughtFour`), and which 4 are actually brought is chosen
  live from the roster column (new `broughtIds` field + `toggleBrought`
  mutation, capped at 4). Fixed a real bug in the process: the opponent
  roster had no cap at all - now hard-capped at 6
  (`MAX_OPPONENT_ROSTER_SIZE`), enforced both in the mutation and the "+
  Add" button. New `Battlefield.tsx` shows just the 4 currently-active
  combatants, opponent 2 on top / player 2 on bottom, matching the user's
  own prototype layout; the turn log now sits below the whole battlefield
  row instead of squeezed between the two rosters. `OpponentInfoTags.tsx`
  dropped the `teraType` input entirely (removed from the type too, not
  left as a dead field) - not reliably discoverable mid-battle, unlike
  moves/ability/item which stay. Old persisted battles (pre-redesign, with
  the legacy `broughtFour` shape) are migrated at the read boundary in
  `useBattles.ts` rather than breaking - verified live against a real
  legacy in-progress battle, which loaded correctly with all 4 of its old
  brought Pokemon pre-checked. Also verified live: brought-cap at 4 (5th
  Pokemon on a 5-mon team correctly stayed un-bringable), opponent cap at
  6 (add button disappears at 6/6), and Basculegion's sprite rendering
  correctly in the new roster column and battlefield both.
- **Battle Logger: field/side-condition tracking** (2026-07-07): weather
  (Rain/Sun/Sandstorm/Snow) and terrain (Electric/Grassy/Misty/Psychic) are
  field-wide, one active at a time per group; screens (Reflect/Light
  Screen/Aurora Veil), Tailwind, Safeguard, and Mist are per-side with a
  turn countdown computed from standard duration (Tailwind 4, others 5) -
  a helpful default only, always manually clearable since real games can
  extend (Light Clay, weather rocks) or end things early (Rapid Spin,
  Defog). Hazards (Stealth Rock, Sticky Web, Spikes 0-3, Toxic Spikes 0-2)
  have no countdown since they persist untimed. New
  `types/pokemon.ts` `FieldState`/`SideConditions` on `Battle` (single
  current-state snapshot, same pattern as `playerActiveIds`), new
  `config/fieldConditions.ts` (durations/labels/countdown calc, reuses
  `pokemonTheme.ts`'s `getTypeTheme()` for weather/terrain colors instead
  of a new palette), 5 new mutations in `useBattleLogActions.ts`, and two
  new components (`FieldWeatherBar.tsx`, `SideConditionsRow.tsx` - the
  latter shared between `PlayerFieldPanel.tsx`/`OpponentFieldPanel.tsx`).
  Backfills `fieldState` for battles saved before this existed
  (`useBattles.ts`'s read boundary) so old records don't crash the new UI.
  Verified live: countdown decrements correctly turn-by-turn (Rain 5->2,
  Tailwind 4->1 after 3 "Next Turn" clicks), manual clear works at any
  count, hazard stacking cycles 0-max correctly, and all state survives a
  tab-switch-away-and-back (confirms persistence through the existing
  write-through, not just component state).
- **Full movepool diff processed from the "Pokémon Ch." tab** (2026-07-07):
  the 227-row `Learnset` tab turned out to be a raw per-species dump, not a
  diff - the user redirected to `Pokémon Ch.` instead, which has the same
  ~226 species pre-diffed against their Scarlet/Violet and historical
  movepools (Additions/Returns/Deletions columns). Fetched directly via the
  sheet's CSV export endpoint (`gviz/tq?tqx=out:csv&sheet=...`, bypassing
  WebFetch's AI-summarization layer which had already silently truncated
  the `Learnset` tab once - not reliable for bulk tabular data) and parsed
  programmatically (proper quoted-CSV parsing, since several cells have
  embedded newlines). `championsMovepoolChanges.ts` now covers 182 species
  with additions and 138 with removals, replacing the ~15-species table
  sourced from a Reddit thread. Several of that thread's claims didn't
  survive the cross-check and were dropped: Scolipede "gains Pounce",
  Barbaracle "gains Chilling Water", Scrafty/Staraptor "loses Parting
  Shot/Knock Off", Scolipede/Overqwil "loses Mortal Spin", Malamar "loses
  Octolock", Mawile "loses Dazzling Gleam" - none corroborated by this more
  comprehensive source. Also fixed a typo inherited from that table:
  "trailblazer" isn't a real move slug (it's "Trailblaze") - would have
  silently never matched. Full reasoning and the exact dropped claims are
  in the config file's header comment.
- **Mega Evolution list confirmed correct; Tera Blast doesn't exist in
  Champions at all** (2026-07-06): follow-up to the spreadsheet cross-check
  above. The user confirmed in-game that all the Mega Evolutions currently
  in `config/megaEvolution.ts` are valid - the spreadsheet's "doesn't work
  as of now" list for those species was stale, no code change needed.
  Separately, Tera Blast is confirmed to not exist in Pokemon Champions at
  all (not a per-species removal - a game-wide absence), which resolves
  the "227-row movepool diff, mostly Tera Blast" lead without needing to
  process most of it: `championsMovepoolChanges.ts` now unconditionally
  strips `tera-blast` from every species' learnset via a new
  `GLOBALLY_REMOVED_MOVES` list (PokeAPI's mainline Scarlet/Violet data
  includes it as a universal TM move for nearly every species). Whatever
  remains in that 227-row diff beyond Tera Blast is still an open lead,
  see below.
- **Move flag tags (Sound/Bullet/Punch/etc.)** (2026-07-06): Champions
  displays visible tags on moves so interactions with abilities like
  Soundproof/Bulletproof/Strong Jaw are clear at a glance. Checked first
  and confirmed PokeAPI does *not* actually expose these flags (an earlier
  TODO note assumed it did - wrong). Used `@smogon/calc`'s bundled Gen 9
  Showdown movedex instead, which does track exactly 8 real flags (contact,
  bite, sound, punch, bullet, pulse, slicing, wind) - extracted to a static
  `config/moveFlagsData.generated.ts` via a one-off codegen script
  (`scripts/generateMoveFlags.ts`, rerun with `npx tsx` if the package's
  bundled data ever changes) rather than importing `@smogon/calc` at
  runtime, which would've pulled its ~500KB bundle back into the main
  chunk (it's deliberately lazy-loaded only for the Calc tab). New
  `config/moveFlags.ts` applies flags at the same read-boundary pattern as
  the Champions overrides (`useGameData.ts`), added `flags: string[]` to
  `MoveData`, and a small themed badge row in `TooltipContent.tsx` (colors
  in `pokemonTheme.ts`). Verified live: Dark Pulse correctly shows a
  "Pulse" tag, Iron Head (contact-only) shows none. **Contact is
  deliberately excluded** from the visible set (too common to be a useful
  callout) and the other 7 are shown as a reasonable default - which flags
  Champions' own UI actually surfaces hasn't been confirmed in-game yet,
  flagged as an assumption in the config file's header comment.
- **Champions data-correctness audit (part 3 - "Data Comparative Champions"
  spreadsheet cross-check)** (2026-07-06): the user found and shared a much
  higher-quality source than Serebii/Bulbapedia's summaries - a community
  spreadsheet by RoiDadadou cross-referencing datamined values (Kaphotics,
  Anubis) and battle-mechanics research (DaWoblefet); see README Credits.
  Cross-checked it against everything already in `championsMoveOverrides.ts`
  - all previously-encoded values matched (including Dire Claw, which the
  user separately asked about and turned out to already be correct: 30%
  status chance, unchanged power/accuracy). The spreadsheet also surfaced
  moves we were missing entirely: **added overrides** for Gear Grind,
  Anchor Shot, Revelation Dance, Dragon Hammer, Snipe Shot, Bolt Beak,
  Fishious Rend, Astral Barrage, Triple Dive, Hyper Drill, Blood Moon
  (power/accuracy changes), and Clangorous Soul (now never misses -
  `accuracy: null`). **Added missing PP exceptions**: Purify (20->8), Shell
  Trap (->12), Obstruct (->8), Spin Out (->12), Nihil Light (->8) - these
  don't fit the standard retiering formula, same category as the
  Protect-line exceptions already handled. **Found and fixed a real bug in
  the just-shipped move-flag tags feature**: Dire Claw/Crush Claw/Shadow
  Claw/Dragon Claw are reclassified as slicing moves in Champions (Sharpness-
  boostable), but `@smogon/calc`'s mainline-sourced data doesn't know that,
  so the generated flags table was missing `slicing` for all 4 - added a
  small `CHAMPIONS_ADDED_FLAGS` correction layer in `config/moveFlags.ts`.
  All new values spot-verified via a scratch script (see the no-test-runner
  convention). **Rejected**: the spreadsheet's "15 vs 16 damage rolls"
  claim - the user flagged this as unconfirmed themselves, and separately
  noticed Pokemon Showdown's own Champions-mode calc still shows 16 rolls,
  a second independent signal the claim is stale/wrong. Not encoding it.
  **Also rejected**: the `Moves Deleted` tab entirely - it conflates "no
  current Pokemon can learn this move" (a roster gap) with the move not
  existing, and flags moves we know are real (Rage Fist, Make It Rain) as
  absent. Two things surfaced that needed a decision, now resolved: the
  Mega Evolution species list was confirmed valid by the user in-game (no
  code change needed), and Tera Blast's removal turned out to be a simple
  blanket rule, not a per-species diff (see the Mega Evolution Done entry
  below). See TODO.md's spreadsheet-reliability note for the overall
  downgrade and the still-open `Learnset` tab lead.
- **Champions data-correctness audit (part 2)** (2026-07-06): follow-up to
  the balance-patch fix below, checking for further Champions-specific
  gaps. Stat Points confirmed by the user directly in-game: max 32/stat, 66
  total (per-stat clamp already existed in `CalcStatRows.tsx`; added a soft
  66-total warning, updated `useDamageCalc.ts`'s `spToEv` comment from
  "unconfirmed" to confirmed). Movepool changes from a Reddit thread
  (r/stunfisk "Some movepool changes in Champions Version 1.1", via
  user-provided screenshots since reddit.com fetching is blocked) added to
  `config/championsMovepoolChanges.ts` (renamed from
  `championsMovepoolAdditions.ts`, now handles removals too): 5 species
  gaining moves, 10 losing them (one claimed removal, Grimmsnarl "loses
  False Surrender," excluded as an unrecognized/likely-erroneous move
  name). Self-serve research pass (no game access needed) confirmed via
  Bulbapedia's dedicated changes section and Serebii's patch history: the
  ability-changes list (Healer + Unseen Fist) is exhaustive; crit-hit
  mechanics and the type chart are unchanged from mainline (only display
  labels changed); no dedicated "changed items" page exists (unlike moves/
  abilities/status conditions), and a shared Showdown replay's Life Orb
  recoil (~10%, matching mainline) backs that up; patch history through
  v1.1.0 (2026-06-17) has no further balance changes beyond what's already
  encoded. Two leads remain open, blocked on the user: the community
  Google Sheet of full Champions movepools (not a diff - needs manual
  cross-referencing against PokeAPI's mainline data per species:
  https://docs.google.com/spreadsheets/d/1DeXjzohTUdKNERu6dsHsnznneva8MDJjglI3lqDLgm4)
  and anything noticed live during play that doesn't match the app (how
  the original Make It Rain gap was caught).
- **Champions balance-patch data correctness fix** (2026-07-06): PokeAPI
  (our only game-data source) models mainline Scarlet/Violet with no concept
  of Pokemon Champions' own balance patches - caught concretely when Make It
  Rain's tooltip showed 100%/-1 Sp.Atk instead of Champions' actual 95%/-2.
  Turned out to be systemic: ~19 moves with power/accuracy/type/effect
  changes, PP retiered game-wide (not just those 19 - nearly every move's PP
  changed via a formula), 2 ability changes (Healer, Unseen Fist), and 3
  status condition changes (freeze/paralysis/sleep odds), verified against
  Serebii's Updated Attacks/Status Conditions pages and Bulbapedia's
  Champions article. New `config/championsMoveOverrides.ts` (+PP retier),
  `championsAbilityOverrides.ts`, `championsMechanics.ts` (status condition
  reference, not wired into UI yet - for future Battle Logger stat-inference
  use), `championsMovepoolAdditions.ts` (seeded with only the one confirmed
  example, Swampert + Wave Crash - see TODO.md's Backlog section).
  Applied at the read
  boundary in `useGameData.ts` (self-healing against already-cached stale
  entries, no cache-version bump needed) and via `@smogon/calc`'s own
  `Move` `overrides` option in `useDamageCalc.ts` - confirmed the live damage
  calculator was actually under-calculating every Champions-buffed move
  before this fix, not just showing wrong tooltip text. Also removed 'Hail'
  from the Calc's weather options (Gen 9 replaced it with 'Snow' game-wide,
  unrelated to Champions specifically but directly adjacent). Bulbapedia
  added as a second dev-time reference source alongside Serebii (Credits +
  CLAUDE.md updated).
- **Battle Logger MVP** (2026-07-06): the project's primary objective.
  Manually log a live VGC battle turn-by-turn while playing on a separate
  device - pick a saved team, bring 4 of its Pokemon, log an ordered
  sequence of actions per turn exactly as observed (no turn-order
  prediction), track which 2 Pokemon are active/fainted per side, build an
  opponent roster incrementally with simple revealed move/ability/item tags
  (ephemeral, per-battle), set a win/loss result, and browse/delete past
  battles. New `battles.json` store (`useBattles.ts` CRUD +
  `useBattleLogActions.ts` for the higher-level mutations, mirroring
  `useTeams.ts`/`useRosterActions.ts` exactly) and a new lazy-loaded
  `components/battlelog/` tab. Verified end-to-end in a real running
  instance (not just type-check/lint) - team pick, 4-pick cap, battle
  start, action logging, opponent quick-add via the reused
  `SpeciesPickerCard`, win/loss, persistence, and delete all confirmed
  working against real saved teams.
- **Project health/cleanup pass** (2026-07-06): removed 12 stale one-off doc
  files (content already in git history/CLAUDE.md); removed dead code
  (`MoveBanner.tsx`, unused move-category-theme block, unused `VGC_MOVES`);
  fixed a real bug where `TeamCard.tsx`'s collapsed sprite row was missing
  the gender/divergent-form sprite logic `PokemonCard.tsx` has (extracted to
  shared `utils/spriteUrl.ts`); removed unused `postcss`/`autoprefixer`/
  `concurrently` deps; fixed `dist-electron/` being accidentally tracked in
  git; lazy-loaded the Calc tab (`React.lazy`, moved `useDamageCalc` inside
  `CalcPage` so `@smogon/calc` only loads when the tab opens - split the
  766KB main bundle into a 268KB main chunk + separate 499KB Calc chunk);
  softened the 250-line component rule from a hard cap to a smell-test
  guideline (CLAUDE.md/.clinerules); reclaimed `.git` from 119MB to 363KB via
  `git gc` (old dangling blobs, nothing reachable was touched); restored and
  modernized ESLint (was completely broken - no config existed - now on
  ESLint 9 flat config + `typescript-eslint` v8 + `eslint-plugin-react-hooks`,
  which also fixed a minimatch ReDoS vulnerability in the old toolchain);
  set up `electron-builder` for Windows (nsis installer + portable, verified
  working end-to-end - produces `release/ChoiceBuds Setup 0.1.0.exe` and
  `release/ChoiceBuds 0.1.0.exe`) and Mac (dmg + zip, config in place but
  **needs an actual Mac or macOS CI runner to produce/test** - can't be
  built or verified from Windows); tracked `package-lock.json` for
  reproducible installs.
- **Widen bulk first-launch sync to shiny + item sprites** (2026-07-06)
  `useInitialSync.ts` now also downloads each species' shiny sprite and every
  `VGC_ITEMS` entry's sprite during the one-time bulk pass, not just normal
  Pokemon sprites. `SpeciesRosterEntry` gained a `shinySpriteUrl` field
  (`useSpeciesRoster.ts`, roster cache bumped to `v3` to invalidate old
  cached entries missing it).
- Add offline startup sync and sprite caching (normal sprites + move/ability/
  learnset data for the Reg M-B dex)
- Add damage calculator tab and regulation picker
- Refactor editors and add team validation
- Add in-slot item picker and dismissable hook

