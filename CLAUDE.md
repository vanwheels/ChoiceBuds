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

**Hard rule:** `src/main/**` must never import from `src/renderer/**`. The preload script intentionally types its IPC payloads as `any` instead of importing renderer types — an earlier bug (see `DUPLICATE_BUNDLING_FIX.md`) caused Vite to bundle every renderer component twice (once for the renderer, once for the preload build) because `preload.ts` imported a type from `../renderer/types/pokemon`, breaking HMR. The renderer casts `window.electron` results to the real types from `src/renderer/types/pokemon.ts` itself.

### Renderer layers

- `src/renderer/types/pokemon.ts` — single source of truth for all data contracts (`ShowdownPokemon`, `ImportedPokemonInfo`, `Team`, `TeamsDatabase`, `PokeAPICache`, `GameDataCache`, etc.). Add new fields here first.
- `src/renderer/hooks/` — all state lives here; components stay presentational. Notable hooks:
  - `useTeams` — CRUD over the teams array, persists to disk through `window.electron` on every mutation, also owns UI-only expanded-card-id state.
  - `useDatabase` — stale-while-revalidate cache of PokeAPI species data (`pokeapi-cache.json`), 30-day entry expiration, periodic background cleanup.
  - `useGameData` — in-memory (not persisted) cache of move/item/ability lookups, fetched live from PokeAPI on demand.
  - `useActiveEditor` — scratchpad/draft state for the Pokémon edit overlay; mutations only apply to the draft clone and are committed to `useTeams` explicitly on save.
- `src/renderer/services/parser.ts` — pure, offline, regex-based Showdown/Pokepaste text parser. No API calls, no side effects. Produces `ShowdownPokemon[]`.
- `src/renderer/services/pokeapi.ts` — all `fetch` calls to `https://pokeapi.co/api/v2`. Handles species-name normalization for gender-divergent forms (Basculegion, Indeedee, Oinkologne, Meowstic all have separate `-male`/`-female` PokeAPI slugs) and enriches parsed Showdown data with API stats/types/sprites, going through the `useDatabase` cache getter/setter.
- `src/renderer/config/` — static lookup tables only: `pokemonRules.ts` (gender-lock/genderless/gendered-form species lists + `getFallbackGender`), `pokemonTheme.ts` (type/category → Tailwind class maps), `vgcData.ts` (VGC-legal items/moves lists). No hardcoded colors or species lists belong anywhere else.
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
- `src/renderer/components/*` must stay under 250 lines; extract sub-components rather than growing one file.
- All core app state changes flow through custom hooks in `src/renderer/hooks/`; never manage cross-render state directly in JSX/markup.
- Static theme tables, hex colors, and type/category maps live in `src/renderer/config/`, never inlined in components or utilities.
- Only direct JSON `fetch` calls to `pokeapi.co` are allowed for game data — no scraping, no third-party proxy middleware. **Exception (explicitly authorized):** `serebii.net` may be hotlinked as a static `<img>` source for assets PokeAPI doesn't cleanly provide (move category badges, item sprite fallbacks like Fairy Feather). This is image hotlinking only — never fetched/parsed as data, and never used as a stand-in for the pokeapi.co JSON endpoints above.
- Use explicit TypeScript interfaces for every data contract; `as any` is forbidden except at external boundary wrappers (e.g. the preload bridge, per the rule above).
