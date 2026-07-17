# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

ChoiceBuds — an Electron + React + TypeScript desktop app for importing and managing Pokémon VGC (Video Game Championships) teams from Showdown/Pokepaste export text. Teams and a PokeAPI response cache are persisted as JSON files in the OS userData directory (no database).

## Commands

- `npm run dev` — start Vite + Electron in development (renderer at `http://localhost:5173`, hot reload)
- `npm run build` — type-check (`tsc`) then production build via `vite build`
- `npm run type-check` — `tsc --noEmit` only
- `npm run lint` — ESLint over `src` for `.ts`/`.tsx`

There is no test runner wired up. `src/renderer/services/parser.test.ts` is a standalone script (console.log assertions, no Jest/Vitest) — run it directly with a TS runner (e.g. `npx tsx src/renderer/services/parser.test.ts`) if you need to exercise it; it is not part of `npm run build`/CI.

## Architecture

### Process split (Electron)

- `src/main/main.ts` — main process. Owns the `BrowserWindow`, and all filesystem I/O for `teams.json` and `pokeapi-cache.json` in `app.getPath('userData')`, exposed to the renderer via `ipcMain.handle('file:*', ...)`.
- `src/main/preload.ts` — contextBridge script exposing `window.electron.{readTeamsDatabase, writeTeamsDatabase, readPokeAPICache, writePokeAPICache, getUserDataPath}`.
- `src/renderer/` — the React app (Vite root aliases `@` → `src/renderer`).

**Hard rule:** `src/main/**` must never import from `src/renderer/**`. The preload script intentionally types its IPC payloads as `any` instead of importing renderer types. Previously `preload.ts` imported a type from `../renderer/types/pokemon`, which caused Vite's electron plugin to bundle every renderer component twice — once for the renderer entry, once for the separately-compiled preload build — since importing from the renderer directory pulls all of that code into whichever bundle references it. That broke HMR (DevTools Sources showed every component appearing twice, and file edits stopped being picked up). The renderer casts `window.electron` results to the real types from `src/renderer/types/pokemon.ts` itself instead.

### Renderer layers

- `src/renderer/types/pokemon.ts` — single source of truth for all data contracts (`ShowdownPokemon`, `ImportedPokemonInfo`, `Team`, `TeamsDatabase`, `PokeAPICache`, `GameDataCache`, etc.). Add new fields here first.
- `src/renderer/hooks/` — all state lives here; components stay presentational. Notable hooks:
  - `useTeams` — CRUD over the teams array, persists to disk through `window.electron` on every mutation, also owns UI-only expanded-card-id state.
  - `useDatabase` — stale-while-revalidate cache of PokeAPI species data (`pokeapi-cache.json`), 30-day entry expiration, periodic background cleanup.
  - `useGameData` — in-memory (not persisted) cache of move/item/ability lookups, fetched live from PokeAPI on demand.
  - `useActiveEditor` — scratchpad/draft state for the Pokémon edit overlay; mutations only apply to the draft clone and are committed to `useTeams` explicitly on save.
- `src/renderer/services/parser.ts` — pure, offline, regex-based Showdown/Pokepaste text parser. No API calls, no side effects. Produces `ShowdownPokemon[]`.
- `src/renderer/services/pokeapi.ts` — all `fetch` calls to `https://pokeapi.co/api/v2`. Handles species-name normalization for gender-divergent forms (Basculegion, Indeedee, Oinkologne, Meowstic all have separate `-male`/`-female` PokeAPI slugs) and enriches parsed Showdown data with API stats/types/sprites, going through the `useDatabase` cache getter/setter.
- `src/renderer/config/` — static lookup tables only: `pokemonRules.ts` (gender-lock/genderless/gendered-form species lists + `getFallbackGender`), `pokemonTheme.ts` (type/category → Tailwind class maps), `vgcData.ts` (VGC-legal items/moves lists), `championsMoveOverrides.ts`/`championsAbilityOverrides.ts`/`championsMovepoolAdditions.ts`/`championsMechanics.ts` (Pokemon Champions balance-patch corrections over PokeAPI's mainline-only data — applied at the read boundary in `useGameData.ts`, not baked into the cache). No hardcoded colors or species lists belong anywhere else.
- `src/renderer/components/` — presentational only; each stays under ~250 lines by design (see below).

### Data flow for an import

1. User pastes Showdown text into `ImportTeamModal` → `parseShowdownText()` (pure, sync) → `ShowdownPokemon[]`.
2. Each parsed Pokémon is enriched via `enrichPokemonWithAPI()` in `pokeapi.ts`, which checks `useDatabase`'s cache first and only calls PokeAPI on a miss, then writes the result back through `setCacheEntry`.
3. The resulting `ImportedPokemonInfo[]` is wrapped into a `Team` and persisted via `useTeams().addTeam()`, which writes the full `TeamsDatabase` to disk through the preload bridge.
4. Editing an existing team's Pokémon goes through `useActiveEditor`: `enterEditMode` deep-clones the target `ImportedPokemonInfo` into a draft, all `update*` calls mutate only the draft, and `getCommittableData()`/`updateTeam()` is what actually persists.

### Gender/form handling

VGC-legal species have two gender concerns that must stay in sync across two files:
- Parsing-time fallback (`config/pokemonRules.ts::getFallbackGender`) — used when Showdown text omits an explicit `(M)`/`(F)`.
- API-slug normalization (`services/pokeapi.ts::normalizeSpeciesForAPI`) — PokeAPI models Basculegion/Indeedee/Oinkologne/Meowstic as distinct `-male`/`-female` resources, not a single gender-neutral entry.

When adding a new gender-divergent or gender-locked/genderless species, update both files.

## Style rules

- Strict decoupled architecture — no monolithic files.
- `src/renderer/components/*` should stay small and single-purpose; extract sub-components when a file starts mixing unrelated concerns rather than growing one file. This used to be a hard 250-line cap — that number was tuned for a previous pay-per-token AI workflow's cost pressure, not for its own sake. Treat it as a smell test now (does this file still do one thing?), not a line-count gate — a cohesive file a bit over 250 lines doesn't need to be split just to hit a number, but a file dragging in unrelated responsibilities should still be split regardless of length.
- All core app state changes flow through custom hooks in `src/renderer/hooks/`; never manage cross-render state directly in JSX/markup.
- Static theme tables, hex colors, and type/category maps live in `src/renderer/config/`, never inlined in components or utilities.
- Only direct JSON `fetch` calls to `pokeapi.co` are allowed for game data at runtime — no scraping, no third-party proxy middleware. PokeAPI models mainline Scarlet/Violet only, with no concept of Pokemon Champions' own balance patches — see `config/championsMoveOverrides.ts`/`championsAbilityOverrides.ts`/`championsMovepoolAdditions.ts` for how that gap is hand-corrected. **Exception (project policy — a decision made for this codebase, not a documented grant of permission from either site):** `serebii.net` and `bulbapedia.bulbagarden.net` may be used two ways:
  1. Hotlinked as a static `<img>` source for assets PokeAPI doesn't cleanly provide (move category badges, item sprite fallbacks like Fairy Feather) — image hotlinking only, never fetched/parsed as JSON, never a stand-in for the pokeapi.co endpoints above.
  2. Read manually (a one-off fetch during development, never a live runtime call) as a factual reference to hand-author static config in `src/renderer/config/`/`utils/` (e.g. VGC-legal item lists, regulation legality tables, Mega Stone mappings, Champions balance-patch overrides) when no other source has the data. This covers extracting individual game-mechanics facts into our own config structures only — never copying either site's written text or page layout wholesale, and never a live/automated scrape.

  **Second exception (also project policy, decided 2026-07-08):** `pokepast.es` may be fetched live at runtime, but *only* through its own `/<id>/json` endpoint (`services/pokepaste.ts`), and *only* to import a team a user explicitly pastes a `pokepast.es/<id>` link for in `ImportTeamModal.tsx` — never HTML-scraped, never polled/background-fetched, never used as a stand-in for the pokeapi.co endpoints above. The endpoint returns the paste's own `title`/`author`/`notes`/`paste` fields directly as JSON, so there's no scraping involved.

  **Third exception (also project policy, decided 2026-07-09):** `api.github.com`'s public `/repos/vanwheels/ChoiceBuds/releases/latest` endpoint (`services/github.ts`) may be polled automatically once per app launch, read-only, solely to compare the running version (`utils/appVersion.ts`, sourced from `package.json`) against the latest published GitHub Release, surfacing the result on the Settings page (`useUpdateCheck.ts`/`UpdateCheckSection.tsx`). This is the app's first *automatic*, non-user-triggered external call — every other external fetch above is either on-demand/cached (PokeAPI) or explicitly user-initiated (Pokepaste) — worth calling out as its own category rather than folding it silently into the on-demand/user-initiated exceptions.

  **Fourth exception (also project policy, decided 2026-07-16):** `championsbattledata.com`'s public `/api/*` JSON endpoints (e.g. `/api/index`, `/api/battle/:format/:name`, `/api/pokemon/:name`, `/api/metadata/:name`) may be fetched for Pokémon Champions ranked-ladder usage data (per-species move/held-item/ability/nature ("stat_alignment") rankings, EV-equivalent-on-Champions'-own-0-32-scale ("stat_points") rankings, and teammate co-occurrence) to power stat-inference features. No auth/key required, CORS-enabled, plain JSON responses (never HTML-scraped, never a stand-in for the pokeapi.co endpoints above). It's a fan-made project (not affiliated with Game Freak/Nintendo/The Pokémon Company), so, matching the RoiDadadou-spreadsheet caution elsewhere in this doc, spot-check individual values that look off rather than trusting the feed blindly. Its `stat_points` fields are already on this app's native 0-32 Stat Point scale (see `utils/championsStats.ts`) — no EV-scale conversion needed to consume them.

  Any new external data or asset source (a new site to hotlink from, a new npm package supplying game data, a new API) needs a matching entry added to README.md's Credits section in the same change that introduces it — don't let Credits drift out of date. (The GitHub-releases update check above is an exception to *this* sub-rule too: it's checking the app's own release history, not crediting a third-party data/asset source, so it doesn't get a Credits entry.)
- Use explicit TypeScript interfaces for every data contract; `as any` is forbidden except at external boundary wrappers (e.g. the preload bridge, per the rule above).
- When researching a Bulbapedia/Serebii fact for a config file under the exception above: for "what's the complete set of X" questions, use Bulbapedia's category-listing pages (e.g. `Category:Moves_by_stat_modification`) rather than a freeform-summarized reference page — a category page just enumerates its members, so there's nothing for a summarizer to drop. For "what exactly does X do," fetch that entry's own dedicated page individually and cross-check anything with more than one effect or a non-obvious percentage before hardcoding it into a config file — a shared prose reference page condensed into a summary has silently dropped stat/effect count and mislabeled chance-based vs. guaranteed effects before.

## Workflow conventions

These reflect how the user actually wants to work in this project, independent of which machine (Windows or macOS) Claude Code happens to be running on.

- **Task tracking** lives in `TODO.md` at the repo root (active/in-progress work), with finished work archived to `COMPLETED.md`. Read `TODO.md` first when resuming work or asked what's next; only open `COMPLETED.md` for historical detail on how/why something already-done was built.
- **Commit messages** (updated 2026-07-13): Claude now runs `git commit`/`git push` directly — the user handed this over ("starting with this one"), replacing the prior GitHub Desktop-only workflow. Still proactively draft a commit summary + description after finishing a meaningful checkpoint (a `TODO.md` item, a live-verified fix) — don't wait to be asked — and still put the summary and description in two separate fenced code blocks when discussing a commit in chat, since that's independently useful for the user to read/copy. But the actual `git commit`/`git push` no longer needs separate permission each time; treat it like any other local, reversible action on this solo `main` branch (no PR review gate in place).
- **GitHub Releases** (process changed 2026-07-16 by the release-build-automation item below — read that first): tag matches `package.json`'s `version` with a leading `v` (e.g. `v0.1.0` for `"0.1.0"` — the update checker in `services/github.ts` strips the `v` before comparing, so they must match). Sequencing now matters: **push the version tag first** (`git tag vX.Y.Z && git push origin vX.Y.Z`) and let `.github/workflows/release.yml` build and attach installers to a fresh **draft** release — do not run `gh release create` first, since that would create the release+tag itself and the workflow's own build would then find an existing non-draft-incompatible release for that tag and skip attaching anything (confirmed live 2026-07-16 with a throwaway test tag — see `TODO.md`). Once the workflow's run finishes, draft the title + body the same two-fenced-code-block way as before, then fill them in with `gh release edit vX.Y.Z --title "..." --notes "..."` (not `gh release create` — the release object already exists as a draft). Only flip it live (`gh release edit vX.Y.Z --draft=false`) once the user confirms the content and gives the go-ahead — a Release is a visible, external, public-facing action, so always confirm before publishing one, unlike a routine commit/push.
- **Release build automation** (added 2026-07-16, verified live the same day with a throwaway tag — see `TODO.md` for the full trail): `.github/workflows/release.yml` builds the Windows and macOS installers on any `v*.*.*` tag push and attaches them to a GitHub Release via `electron-builder --publish always`. electron-builder resolves the target release by `package.json`'s `version` field, not by the pushed git tag directly, and lands as a **draft** release when none exists yet for that version — see the sequencing note in the GitHub Releases bullet above for why the tag must be pushed before `gh release create`/`gh release edit` touches that version at all. No signing secrets are configured, so output is unsigned, matching current manual builds.
- **Live UI testing**: drive the app via `.claude/skills/run-desktop` (Playwright-based, cross-platform — see its `SKILL.md`) instead of OS-level mouse/keyboard automation. When a test mutates persisted state (faint toggles, switch-ins, team edits, etc.), always create a fresh disposable battle/team for it rather than testing against the user's real data, and clean it up afterward.
- **Curated effect tables** (`config/moveStatEffects.ts`, `config/onSwitchInAbilities.ts`, `config/reactiveAbilities.ts`, `config/hitReactiveAbilities.ts`) should hold comprehensive, research-backed coverage of their effect category, not a hand-picked subset. If asked to add one specific missing move/ability, treat that as a signal the whole category needs auditing rather than a request for just that row, and document in the file's header what's deliberately excluded (chance-based effects, data the app doesn't track yet) instead of silently omitting it.
