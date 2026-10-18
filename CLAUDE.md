# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Conventions: v2.

## Project

ChoiceBuds — an Electron + React + TypeScript desktop app for importing and
managing Pokémon VGC (Video Game Championships) teams from Showdown/Pokepaste
export text. Teams and a PokeAPI response cache are persisted as JSON files
in the OS userData directory (no database).

## Commands

- `npm run dev` — start Vite + Electron in development (renderer at `http://localhost:5173`, hot reload). This is the **App** target: `App.tsx`'s desktop shell, enforced 1280x720 minimum window size.
- `npm run dev:web` — start the web build's own Vite dev server (`http://localhost:5174`) — see `ARCHITECTURE.md`'s Web build section. This is the **Web** target: `AppWeb.tsx` at ordinary desktop browser width.
- `npm run dev:mobile` — opens a real Chrome window (`scripts/devMobile.mjs`, via `playwright-core`'s `channel: 'chrome'`, no separate browser download) at a 375x812 phone viewport against the same web dev server, self-starting it if `dev:web` isn't already running. This is the **Mobile Web** target: `AppWeb.tsx` below the 768px `md:` breakpoint. Don't try to simulate this by resizing the `dev`/`dev:web` window/tab by hand — Electron's window has an enforced 1280 minimum width that `resize` can't get under (see `.claude/skills/run-desktop/driver.mjs`'s own `zoom` workaround for why that skill needs a page-zoom trick instead), and a manually narrowed browser tab won't carry the right touch/mobile user agent either.
- `npm run build` — type-check (`tsc`) then production build via `vite build`
- `npm run build:web` — type-check then production build of the web entry, output to `dist/web/`
- `npm run type-check` — `tsc --noEmit` only
- `npm run lint` — ESLint over `src` for `.ts`/`.tsx`
- `npm run test` — Vitest, single run (`test:watch` for watch mode). Config
  is `vitest.config.ts` (jsdom environment, `src/**/*.test.ts`), separate
  from `vite.config.ts` since the Electron/Tailwind plugins there have
  nothing to do with unit tests. `setupFiles` stubs `window.electron`
  (`src/renderer/test/setupElectronMock.ts`) with `vi.fn()` mocks before
  every test, since jsdom has no real Electron main process behind it.
  Coverage starts with pure `services/`/`utils/` functions
  (`services/parser.test.ts` is the first one, converted from a former
  console.log-assertions script) and now also covers a first batch of
  simpler `hooks/` (via `@testing-library/react`'s `renderHook`/`act`) —
  see `TODO.md`'s testing-workflow entry for which hooks are covered so far
  and which are intentionally still open. Not yet wired into CI.

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

- Strict decoupled architecture — no monolithic files.
- `src/renderer/components/*` should stay small and single-purpose; extract
  sub-components when a file starts mixing unrelated concerns rather than
  growing one file. This used to be a hard 250-line cap — that number was
  tuned for a previous pay-per-token AI workflow's cost pressure, not for its
  own sake. Treat it as a smell test now (does this file still do one
  thing?), not a line-count gate — a cohesive file a bit over 250 lines
  doesn't need to be split just to hit a number, but a file dragging in
  unrelated responsibilities should still be split regardless of length.
- All core app state changes flow through custom hooks in `src/renderer/hooks/`; never manage cross-render state directly in JSX/markup.
- Static theme tables, hex colors, and type/category maps live in `src/renderer/config/`, never inlined in components or utilities.
- External data/asset sources for game data (PokeAPI plus nine specific,
  dated exceptions covering Serebii/Bulbapedia, Pokepaste, GitHub Releases,
  championsbattledata.com, Showdown sprites/source, and the VGCPastes
  sheet) are governed by `.claude/rules/external-data-sources.md`, scoped to
  `src/renderer/services/**` and `src/renderer/config/**`.
- Use explicit TypeScript interfaces for every data contract; `as any` is forbidden except at external boundary wrappers (e.g. the preload bridge, per the rule above).

## Workflow conventions

These reflect how the user actually wants to work in this project,
independent of which machine (Windows or macOS) Claude Code happens to be
running on.

- **Task tracking** lives in `TODO.md` at the repo root (active/in-progress
  work), with finished work archived to `COMPLETED.md`. Read `TODO.md` first
  when resuming work or asked what's next; only open `COMPLETED.md` for
  historical detail on how/why something already-done was built.
- **Commit messages** (updated 2026-07-13): Claude now runs `git commit`/
  `git push` directly — the user handed this over ("starting with this
  one"), replacing the prior GitHub Desktop-only workflow. Still proactively
  draft a commit summary + description after finishing a meaningful
  checkpoint (a `TODO.md` item, a live-verified fix) — don't wait to be
  asked — and still put the summary and description in two separate fenced
  code blocks when discussing a commit in chat, since that's independently
  useful for the user to read/copy. But the actual `git commit`/`git push`
  no longer needs separate permission each time; treat it like any other
  local, reversible action on this solo `main` branch (no PR review gate in
  place).
- **GitHub Releases** (process changed 2026-07-16 by the release-build-
  automation item below — read that first): tag matches `package.json`'s
  `version` with a leading `v` (e.g. `v0.1.0` for `"0.1.0"` — the update
  checker in `services/github.ts` strips the `v` before comparing, so they
  must match). Sequencing now matters: **push the version tag first**
  (`git tag vX.Y.Z && git push origin vX.Y.Z`) and let
  `.github/workflows/release.yml` build and attach installers to a fresh
  **draft** release — do not run `gh release create` first, since that would
  create the release+tag itself and the workflow's own build would then
  find an existing non-draft-incompatible release for that tag and skip
  attaching anything (confirmed live 2026-07-16 with a throwaway test tag —
  see `TODO.md`). Once the workflow's run finishes, draft the title + body
  the same two-fenced-code-block way as before, then fill them in with
  `gh release edit vX.Y.Z --title "..." --notes "..."` (not
  `gh release create` — the release object already exists as a draft). Only
  flip it live (`gh release edit vX.Y.Z --draft=false`) once the user
  confirms the content and gives the go-ahead — a Release is a visible,
  external, public-facing action, so always confirm before publishing one,
  unlike a routine commit/push.
- **Release build automation** (added 2026-07-16, verified live the same
  day with a throwaway tag — see `TODO.md` for the full trail):
  `.github/workflows/release.yml` builds the Windows and macOS installers on
  any `v*.*.*` tag push and attaches them to a GitHub Release via
  `electron-builder --publish always`. electron-builder resolves the target
  release by `package.json`'s `version` field, not by the pushed git tag
  directly, and lands as a **draft** release when none exists yet for that
  version — see the sequencing note in the GitHub Releases bullet above for
  why the tag must be pushed before `gh release create`/`gh release edit`
  touches that version at all. No signing secrets are configured, so output
  is unsigned, matching current manual builds.
- **Live UI testing** (narrowed 2026-08-31 for token efficiency — matches
  the global default now): default to manual verification for visual/UI
  changes, same as other projects — the user checks the running app
  themselves. Reserve `.claude/skills/run-desktop` (Playwright-based,
  cross-platform — see its `SKILL.md`) for cases manual checking doesn't
  reliably cover: verifying a fix against persisted-state mutations (faint
  toggles, switch-ins, team edits) where a wrong result doesn't show up as
  "looks off" on screen, a pre-release regression pass, or whenever
  explicitly asked to test/verify. When it's used for a state-mutating case,
  always create a fresh disposable battle/team for it rather than testing
  against the user's real data, and clean it up afterward. Still never fall
  back to OS-level mouse/keyboard automation.
- **Web verification: dev server to iterate, live site to close** (revised
  2026-10-16 now that `deploy-web.yml` runs lint/test/`build:web` — which
  itself runs `tsc` — before every deploy and stops on failure; the original
  live-only rule from 2026-10-08's Web Bug Sweep Leg 3 was really working
  around a push that hadn't gone out yet, not evidence `dev:web` was
  unreliable). Default to `npm run dev:web`'s local dev server
  (`http://localhost:5174`) while iterating on a web-only fix. Once it looks
  right locally, commit and push to `main`, then do one live retest on
  choicebuds.vannyproductions.com (via `deploy-web.yml`, takes a couple
  minutes to land) before calling the fix done — base-path/routing and
  GitHub Pages-specific behavior only show up there, not on localhost.
- **Worker changes need their own manual deploy** (added 2026-10-17,
  confirmed live the same day when a Public Profiles leg's new endpoint
  came back 404 on the live site right after merging): pushing to `main`
  only redeploys the web app (`deploy-web.yml`) — `worker/` has no CI
  deploy step at all, per its own README's "infrastructure you own and
  run" framing. Any change under `worker/src/` isn't actually live until
  someone runs `cd worker && npx wrangler deploy`. Claude's sandbox
  auto-mode classifier blocks Claude from running `wrangler deploy`
  itself (denied outright, no retry worth attempting), so hand the user
  the exact command to run themselves rather than trying to work around
  the block — then verify live once they confirm it ran. This recurred
  twice within one milestone (Public Profiles & Team Sharing) even with
  this bullet already written, because each time it was only caught
  reactively, after a live check had already come back 404/stale. Before
  attempting *any* live verification of a change touching `worker/src/`,
  proactively ask whether `wrangler deploy` has been run for it yet —
  don't wait for the live check to fail first.
- **Curated effect tables** (`config/moveStatEffects.ts`,
  `config/onSwitchInAbilities.ts`, `config/reactiveAbilities.ts`,
  `config/hitReactiveAbilities.ts`) should hold comprehensive,
  research-backed coverage of their effect category, not a hand-picked
  subset. If asked to add one specific missing move/ability, treat that as a
  signal the whole category needs auditing rather than a request for just
  that row, and document in the file's header what's deliberately excluded
  (chance-based effects, data the app doesn't track yet) instead of silently
  omitting it.
- **Batching into legs, with `/clear` in between** (added 2026-08-29,
  carried over from the user's GW2 Squaded project): when a piece of work
  naturally splits into multiple chunks (a manual-testing batch's individual
  items, a multi-phase feature's phases), break it into discrete legs — each
  one a self-contained unit that gets implemented and verified (and ideally
  committed) before moving on. Durable state belongs in
  `TODO.md`/`COMPLETED.md`/git, not conversation memory, specifically so a
  leg boundary is a safe place for the user to run `/clear` and free up
  context without losing anything real. Call out the boundary explicitly
  when a leg finishes ("that's one leg done, safe to `/clear` before the
  next") rather than silently plowing into the next leg in the same context.
