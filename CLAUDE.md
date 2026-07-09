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

## Style rules (from `.clinerules`)

- Strict decoupled architecture — no monolithic files.
- `src/renderer/components/*` should stay small and single-purpose; extract sub-components when a file starts mixing unrelated concerns rather than growing one file. This used to be a hard 250-line cap — that number was tuned for a previous pay-per-token AI workflow's cost pressure, not for its own sake. Treat it as a smell test now (does this file still do one thing?), not a line-count gate — a cohesive file a bit over 250 lines doesn't need to be split just to hit a number, but a file dragging in unrelated responsibilities should still be split regardless of length.
- All core app state changes flow through custom hooks in `src/renderer/hooks/`; never manage cross-render state directly in JSX/markup.
- Static theme tables, hex colors, and type/category maps live in `src/renderer/config/`, never inlined in components or utilities.
- Only direct JSON `fetch` calls to `pokeapi.co` are allowed for game data at runtime — no scraping, no third-party proxy middleware. PokeAPI models mainline Scarlet/Violet only, with no concept of Pokemon Champions' own balance patches — see `config/championsMoveOverrides.ts`/`championsAbilityOverrides.ts`/`championsMovepoolAdditions.ts` for how that gap is hand-corrected. **Exception (project policy — a decision made for this codebase, not a documented grant of permission from either site):** `serebii.net` and `bulbapedia.bulbagarden.net` may be used two ways:
  1. Hotlinked as a static `<img>` source for assets PokeAPI doesn't cleanly provide (move category badges, item sprite fallbacks like Fairy Feather) — image hotlinking only, never fetched/parsed as JSON, never a stand-in for the pokeapi.co endpoints above.
  2. Read manually (a one-off fetch during development, never a live runtime call) as a factual reference to hand-author static config in `src/renderer/config/`/`utils/` (e.g. VGC-legal item lists, regulation legality tables, Mega Stone mappings, Champions balance-patch overrides) when no other source has the data. This covers extracting individual game-mechanics facts into our own config structures only — never copying either site's written text or page layout wholesale, and never a live/automated scrape.

  **Second exception (also project policy, decided 2026-07-08):** `pokepast.es` may be fetched live at runtime, but *only* through its own `/<id>/json` endpoint (`services/pokepaste.ts`), and *only* to import a team a user explicitly pastes a `pokepast.es/<id>` link for in `ImportTeamModal.tsx` — never HTML-scraped, never polled/background-fetched, never used as a stand-in for the pokeapi.co endpoints above. The endpoint returns the paste's own `title`/`author`/`notes`/`paste` fields directly as JSON, so there's no scraping involved.

  Any new external data or asset source (a new site to hotlink from, a new npm package supplying game data, a new API) needs a matching entry added to README.md's Credits section in the same change that introduces it — don't let Credits drift out of date.
- Use explicit TypeScript interfaces for every data contract; `as any` is forbidden except at external boundary wrappers (e.g. the preload bridge, per the rule above).
- When researching a Bulbapedia/Serebii fact for a config file under the exception above: for "what's the complete set of X" questions, use Bulbapedia's category-listing pages (e.g. `Category:Moves_by_stat_modification`) rather than a freeform-summarized reference page — a category page just enumerates its members, so there's nothing for a summarizer to drop. For "what exactly does X do," fetch that entry's own dedicated page individually and cross-check anything with more than one effect or a non-obvious percentage before hardcoding it into a config file — a shared prose reference page condensed into a summary has silently dropped stat/effect count and mislabeled chance-based vs. guaranteed effects before.

## Workflow conventions

These reflect how the user actually wants to work in this project, independent of which machine (Windows or macOS) Claude Code happens to be running on.

- **Task tracking** lives in `TODO.md` at the repo root (active/in-progress work), with finished work archived to `COMPLETED.md`. Read `TODO.md` first when resuming work or asked what's next; only open `COMPLETED.md` for historical detail on how/why something already-done was built.
- **Commit messages**: the user commits through their own git client rather than asking Claude to run `git commit`. Proactively draft a commit summary + description after finishing a meaningful checkpoint (a `TODO.md` item, a live-verified fix) — don't wait to be asked. Put the summary and description in two separate fenced code blocks (not embedded together with prose) so each can be copy-pasted independently. Don't run `git commit` unless the user separately asks for that.
- **Live UI testing**: drive the app via `.claude/skills/run-desktop` (Playwright-based, cross-platform — see its `SKILL.md`) instead of OS-level mouse/keyboard automation. When a test mutates persisted state (faint toggles, switch-ins, team edits, etc.), always create a fresh disposable battle/team for it rather than testing against the user's real data, and clean it up afterward.
- **Curated effect tables** (`config/moveStatEffects.ts`, `config/onSwitchInAbilities.ts`, `config/reactiveAbilities.ts`, `config/hitReactiveAbilities.ts`) should hold comprehensive, research-backed coverage of their effect category, not a hand-picked subset. If asked to add one specific missing move/ability, treat that as a signal the whole category needs auditing rather than a request for just that row, and document in the file's header what's deliberately excluded (chance-based effects, data the app doesn't track yet) instead of silently omitting it.
