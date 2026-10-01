# Web TeamCard Expand Infinite-Loop Bug — root-cause investigation

Leg 1 of the "Web TeamCard Expand Infinite-Loop Bug" TODO item. Root-causing
only — no code changed by this pass beyond this doc and TODO.md, per
CLAUDE.md's scoping-before-building convention. The fix is Leg 2.

## Symptom (as originally reported)

Expanding a `TeamCard` with 4+ Pokémon at a viewport narrower than 768px
throws a React "Maximum update depth exceeded" warning repeatedly — doesn't
crash, but spams re-renders indefinitely (CPU/battery burn, degraded UI).
Only reachable on the web build or a resized browser — desktop Electron
enforces a 1280px minimum window width (`main.ts`), so it was never visible
there. Confirmed pre-existing (reproduces identically on unmodified `main`
via `git stash`), not caused by the Responsive Layout Audit CSS work it was
discovered during.

## Why the desktop driver (`run-desktop`) couldn't reproduce it

`.claude/skills/run-desktop/driver.mjs`'s `resize` command sets Electron's
content size directly, but `main.ts`'s `minWidth: 1280` clamps it — confirmed
live, `window.innerWidth` never drops below that floor. The driver's `zoom`
command (`webContents.setZoomFactor`) sidesteps that floor by scaling
CSS-pixel density instead of the window's actual DIP size, and did get
`window.innerWidth` down to 691px in a zoomed Electron window — but clicking
Expand there, repeatedly, over several seconds, never reproduced the loop.
Zoom-based narrowing is evidently not equivalent to a real viewport resize
for this bug (see the timing explanation below for why).

Real repro required a true narrow viewport, which meant testing against the
web build (`npm run dev:web`, port 5174) in an actual Chromium browser via
`playwright-core`'s `chromium.launch()` (not the Electron-only path
`run-desktop` uses) — `chromium` wasn't installed for this project yet
(`playwright-core` only vendors the driver, not a browser binary); installed
via the project's own pinned version: `node
node_modules/playwright-core/cli.js install chromium` (installing via a
mismatched global `npx playwright install` pulled an incompatible browser
revision and failed at launch — must use the project's own `playwright-core`
version's bundled CLI).

The web build (`AppWeb.tsx`) stores teams in IndexedDB, separate from the
desktop app's `teams.json` — started empty, so a disposable 4-species team
was imported via the real "Add New Team" paste-text flow for testing (never
touched the user's real Electron `teams.json`).

## Repro conditions, confirmed empirically

- 3 Pokémon: never loops, at any width tested (375–1512px).
- 4 Pokémon: loops, but **only when resizing the browser to <768px width
  while the card is already expanded** with a freshly-imported (never
  before cached) roster. Starting already-narrow and then clicking Expand
  did **not** reproduce it in 3/3 trials in this session, despite matching
  the original bug report's framing ("expanding ... at a viewport narrower
  than 768px"). This is a timing-sensitive trigger, not a hard requirement —
  consistent with the original investigator's own description of
  inconsistent bisection results.
- Previously ruled out (still holds): `ResizeObserver` doesn't exist
  anywhere in `src/renderer` (confirmed again this session via grep, also
  checked `matchMedia`/`IntersectionObserver` — none of those exist either,
  so nothing branches on width in JS). Card-width squish alone isn't it
  either (reproduces whether `PokemonCard` is squished to ~47px or healthy
  at ~276px).

## Root cause, confirmed via live stack trace

Captured the exact JS call stack at the "Maximum update depth exceeded"
`console.error` call by patching `console.error` in a disposable Playwright
script (not committed) to call `new Error().stack` the first time it saw
that message. Result (one real capture, from several repro attempts):

```
Error: STACK_CAPTURE
    at dispatchSetStateInternal (.../react-dom_client.js:5160:14)
    at dispatchSetState (.../react-dom_client.js:5133:4)
    at http://localhost:5174/@fs/D:/Projects/ChoiceBuds/src/renderer/components/EditOverlays.tsx:167:4
```

That line lands inside one of `EditOverlays.tsx`'s two per-Pokémon
data-fetch `useEffect`s (the learnset/moves+abilities effect at raw-source
line ~151, or the Champions-usage effect at line ~172 — type-only import
elision in the dev-served JS shifts line numbers by a few lines from the
`.tsx` source, so the capture doesn't pin down which of the two exactly;
both share the identical dependency-array shape described below, so it
doesn't change the diagnosis either way).

Reading `useGameData.ts` directly confirms the mechanism — no further live
testing needed to establish this part, it's directly visible in the
`useCallback` dependency chains:

- `getCachedMove`, `getCachedItem`, `getCachedAbility`,
  `getCachedSpeciesLearnset`, `getCachedChampionsUsage` are each
  `useCallback`'d with `[cache]` as their only dependency.
- `getMoveData`, `getItemData`, `getAbilityData`, `getSpeciesLearnset`,
  `getChampionsUsage` each depend on one of the above — so they too get a
  new identity on every `cache` change.
- `getEnrichedSpeciesOptions` depends on `getSpeciesLearnset`, `getMoveData`,
  `getAbilityData`, and `getCachedChampionsUsage` — new identity on every
  `cache` change, transitively.

`cache` is a single `useState` live in one `useGameData()` instance,
instantiated once near the app root and threaded down through
`TeamsPage` → `TeamCard` → `PokemonCard` → `EditOverlays` as the
`gameDataState` prop. Every `setCache` call anywhere in the app — triggered
by any cache miss resolving, for any species, from any mounted card —
produces a new `cache` object, which gives `getEnrichedSpeciesOptions` and
`getChampionsUsage` new identities, which re-fires **every** mounted
`EditOverlays` instance's effects (both list those functions in their
dependency arrays), regardless of whether that instance's own species data
actually changed.

With 4+ `PokemonCard`s concurrently mounted and holding freshly-imported,
never-before-cached species, each one's first real fetch resolves on its own
timer, writes to `cache`, and re-triggers every other (and its own) effect
again. Some of those re-fires resolve from cache near-instantly, call
`setLegalMoves`/`setMoveUsage`/etc. with a fresh array reference, and
re-render — without writing to `cache` again, so on its own this is a
bounded cascade (proportional to the number of still-uncached entries), not
literally infinite. The width/row-count correlation is what tips it over
React's internal loop-detection threshold rather than being a second,
independent cause: `TeamCard.tsx`'s `@container` grid collapses to fewer
columns below certain widths, stacking more `PokemonCard`s (each with its
own Framer Motion `Reorder.Item` layout-animation machinery) into the same
tight render window as the cache-churn cascade above — more concurrent work
landing in the same commit window is what pushes the re-render count past
React's limit. This also explains why Electron's `zoom`-based narrowing
didn't reproduce it (same CSS columns, same card count, but zoom doesn't
change the real DOM layout work the way an actual resize + reflow does) and
why starting already-narrow-then-expanding didn't either in this session's
trials (no resize event, no reflow burst, just a one-time mount) — the
fetches still cascade either way, but only a real resize's reflow burst
reliably supplies enough concurrent render pressure to cross the threshold
in a single commit window.

## Fix direction (for Leg 2, not decided/implemented here)

The getters need to stop changing identity on every unrelated cache write.
Options to weigh in Leg 2:
- Read the cache via a `ref` inside each getter instead of closing over the
  `cache` state value directly, so the getters themselves can have a stable
  (e.g. `[]` or near-empty) dependency array while still always reading the
  latest cache contents.
- Split `cache` into per-domain state slices (moves/items/abilities/
  learnsets/usage) so a write to one domain doesn't bump every other
  domain's getters' identity — doesn't fully solve it within one domain
  (multiple species' moves still share one slice) but shrinks the blast
  radius.
- Something narrower scoped to `EditOverlays.tsx`'s effects specifically
  (e.g. depend on the resolved data rather than the getter function
  identity) — smaller change, but leaves the same footgun for any future
  consumer of these getters.

Whatever shape the fix takes, it must preserve every self-healing
forced-miss behavior already documented inline in `useGameData.ts`
(`hasChampionsMoveData !== true`, `target`/`meta` presence, the
`spriteUrl === ''` placeholder convention) — those are deliberate so a miss
later gets filled in, not incidental.
