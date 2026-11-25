# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Conventions: v2.

## Project

ChoiceBuds — an Electron + React + TypeScript desktop app for importing and
managing Pokémon VGC (Video Game Championships) teams from Showdown/Pokepaste
export text. Teams and a PokeAPI response cache are persisted as JSON files
in the OS userData directory (no database).

## Commands

- `npm run dev` — Vite + Electron dev (renderer at `http://localhost:5173`,
  hot reload). The **App** target: `App.tsx`'s desktop shell, enforced
  1280x720 minimum window size.
- `npm run dev:web` — the web build's own Vite dev server
  (`http://localhost:5174`); see `ARCHITECTURE.md`'s Web build section. The
  **Web** target: `AppWeb.tsx` at desktop browser width.
- `npm run dev:mobile` — opens real Chrome (`scripts/devMobile.mjs`, via
  `playwright-core`'s `channel: 'chrome'`) at a 375x812 phone viewport
  against the web dev server, starting it if needed. The **Mobile Web**
  target: `AppWeb.tsx` below the 768px `md:` breakpoint. Don't simulate it by
  resizing the `dev`/`dev:web` window by hand: Electron's 1280 minimum width
  can't be resized under (hence `run-desktop`'s page-zoom trick), and a
  narrowed tab lacks the touch/mobile user agent.
- `npm run build` — type-check (`tsc`) then production build via `vite build`
- `npm run build:web` — type-check then production build of the web entry,
  output to `dist/web/`
- `npm run type-check` — `tsc --noEmit` only
- `npm run lint` — ESLint over `src` for `.ts`/`.tsx`
- `npm run test` — Vitest, single run (`test:watch` for watch mode). Config
  is `vitest.config.ts` (jsdom, `src/**/*.test.ts`), separate from
  `vite.config.ts` because the Electron/Tailwind plugins there don't apply
  to unit tests. `setupFiles` stubs `window.electron`
  (`src/renderer/test/setupElectronMock.ts`) with `vi.fn()` mocks, since
  jsdom has no Electron main process. Hooks are tested with
  `@testing-library/react`'s `renderHook`/`act`. `deploy-web.yml` runs it
  before every web deploy.

## Architecture

See `ARCHITECTURE.md` for the process split, renderer layers, data flow,
cross-device sync, web build, and gender/form handling.

## Web build

- **Hard rule:** the web app must never require an account to be usable.
  Teams/Box/the calc (and any future web feature) always work fully
  signed-out, stored only in that browser's local storage (IndexedDB) — same
  model as Pokémon Showdown. Signing in only turns on cross-session/
  cross-device sync; it is never a prerequisite for using the app, so no
  web-only feature or onboarding flow should gate behind sign-up/log-in (a
  sidebar prompt or dismissible modal, not a route/render gate).

## Style rules

- Editing affordances default to always-on, gated only by ownership
  (`isOwnProfile`, etc.), never behind an explicit Edit-mode toggle —
  `PokemonCard.tsx`'s permanent "×" and the profile page's permanent edit
  controls are the convention. Check it before scoping any new gating
  mechanism for an editing affordance (see
  `docs/postmortems/profile-editing-and-visibility-controls.md`).
- Strict decoupled architecture — no monolithic files.
- `src/renderer/components/*` stay small and single-purpose; extract
  sub-components when a file starts mixing unrelated concerns. The test is
  "does this file still do one thing?", not a line count: a cohesive file a
  bit over 250 lines needn't be split, but one with unrelated
  responsibilities should be regardless of length.
- All core app state changes flow through custom hooks in
  `src/renderer/hooks/`; never manage cross-render state directly in JSX.
- Static theme tables, hex colors, and type/category maps live in
  `src/renderer/config/`, never inlined in components or utilities.
- External data/asset sources for game data (PokeAPI plus specific, dated
  exceptions covering Serebii/Bulbapedia, Pokepaste, GitHub Releases,
  championsbattledata.com, Showdown sprites/source, and the VGCPastes
  sheet) are governed by `.claude/rules/external-data-sources.md`, scoped to
  `src/renderer/services/**` and `src/renderer/config/**`.
- Use explicit TypeScript interfaces for every data contract; `as any` is
  forbidden except at external boundary wrappers (e.g. the preload bridge).

## Workflow conventions

- **Task tracking:** read `TODO.md` first when resuming or asked what's
  next; open `COMPLETED.md` only for how/why something already-done was
  built.
- **Commits:** after a meaningful checkpoint (a TODO item, a live-verified
  fix), draft the summary and description unprompted, in two separate
  fenced code blocks in chat, then commit/push directly to `main` (solo
  branch, no PR gate).
- **GitHub Releases:** the tag is `package.json`'s `version` with a leading
  `v` (`services/github.ts` strips the `v` before comparing). Sequence:
  1. Push the tag first (`git tag vX.Y.Z && git push origin vX.Y.Z`).
     `.github/workflows/release.yml` builds Windows/macOS installers and
     attaches them via `electron-builder --publish always`, which resolves
     the release by `package.json`'s `version` and creates it as a draft.
     Never run `gh release create` first: electron-builder then finds an
     existing release and attaches nothing.
  2. After the run finishes, draft title + body as two fenced code blocks
     and fill them in with `gh release edit vX.Y.Z --title ... --notes ...`.
  3. Publish (`gh release edit vX.Y.Z --draft=false`) only after the user
     confirms the content. Output is unsigned (no signing secrets).
- **Live UI testing:** default to the user's manual verification for UI
  changes. Use `.claude/skills/run-desktop` only where manual checking is
  unreliable (persisted-state mutations like faint toggles, switch-ins,
  team edits; a pre-release regression pass) or when asked. For
  state-mutating runs, use a fresh disposable battle/team and clean it up
  afterward. Never fall back to OS-level mouse/keyboard automation.
- **Web verification:** iterate on `npm run dev:web`
  (`http://localhost:5174`). Once it looks right, push to `main` and do one
  live retest on choicebuds.vannyproductions.com (`deploy-web.yml`, a couple
  of minutes) before calling it done: base-path/routing and GitHub
  Pages-specific behavior only show up there.
- **Curated effect tables** (`config/moveStatEffects.ts`,
  `config/onSwitchInAbilities.ts`, `config/reactiveAbilities.ts`,
  `config/hitReactiveAbilities.ts`) hold comprehensive, research-backed
  coverage of their effect category, not a hand-picked subset. A request to
  add one missing row means audit the whole category, and the file header
  documents what's deliberately excluded (chance-based effects, untracked
  data) instead of silently omitting it.
- **Leg boundaries:** when a leg finishes, say so explicitly ("that's one
  leg done, safe to `/clear` before the next") rather than continuing into
  the next leg in the same context.
- **Scoping-only legs still get a COMPLETED.md entry**, with the scope
  doc's commit hash, the moment they're marked done. Inline notes in
  TODO.md's done-when bullets don't substitute (see
  `docs/postmortems/ability-affects-move-indicator-scoping.md`).
- **Verify a scoping premise about a data store before building on it:**
  grep the store's consumers and confirm the premise holds (see
  `docs/postmortems/calc-page-rework.md`).
- **Deferred means tracked:** any "deferred" in a leg's COMPLETED.md entry
  gets a matching TODO.md item in the same commit (see
  `docs/postmortems/calc-page-rework.md`).
- **Table-driven fixes get a sibling check:** before closing a fix for one
  species/row in Mega, form or sprite code, ask which other rows share the
  cause and grep or test the whole table. `TODO.md`'s Mega Stone
  slug-coverage test is the standing check for Mega slugs (see
  `docs/postmortems/sprite-filter-and-search-fixes.md`).
- **Sprite sizing gets a multi-form check:** before closing a sprite sizing
  change, view at least three species of different native sizes (a base
  form, a Mega, a regional form), not just the reported one (see
  `docs/postmortems/calc-follow-ups.md`).

## Active checks

- Make the user's manual check as small as possible: build the state it
  needs yourself (test account, teams, battles, storage) before handover,
  then hand over numbered steps, each with its expected result. If a state
  can't be built without the user, say which and why.
- Before a manual check or a test, ask: would this case show a different
  result if the change did nothing? If the fixture or seeded state already
  holds the value the code writes (or lacks what it acts on), pick another.
- When planning a leg, run `wc -l` on each file it adds to, tests included;
  if one would pass ~300 lines, file and run its split as an earlier leg.
- A `Manual verification: yes` leg gets its COMPLETED.md entry only after
  the user reports the check, and the entry states what was checked.
- When planning a leg, give each "deployed" done clause a live check step,
  or reword it to "in the repo". Pushing to `main` deploys only the web
  app; a `worker/src/` change is live only after the user runs
  `cd worker && npx wrangler deploy` (the sandbox blocks Claude), so that
  handoff is the live check's first step.
