# Architecture

Systems, ownership, state, and data flow as the app stands today. History
lives in `COMPLETED.md`/`MILESTONES.md`, not here.

## Process split (Electron)

- `src/main/main.ts` — owns the `BrowserWindow`, window-state persistence
  (`windowState.ts`), and the Windows-only auto-updater. Registers IPC
  handlers from `src/main/ipc/*.ts` at startup rather than defining them
  inline: `fileHandlers.ts` (every userData JSON read/write), `shellHandlers.ts`
  (`shell:open-external`), `spriteHandlers.ts` (sprite cache get/download),
  `pokepasteHandlers.ts` (`pokepaste:create`).
- `src/main/paths.ts` — the one place that knows each persisted file's name
  inside `app.getPath('userData')`: `teams.json`, `pokeapi-cache.json`,
  `game-data-cache.json`, `battles.json`, `savedPokemon.json`, `settings.json`,
  `vgcpastes-cache.json`, `vgcrealsets-cache.json`, `window-state.json`.
- `src/main/atomicWrite.ts` — every write goes through `atomicWriteFile()`
  (write to `.tmp`, then rename over the target) so a crash mid-write can't
  truncate a file to zero bytes, and queues writes per-path so two concurrent
  writers to the same file can't race on that shared `.tmp` file.
- `src/main/preload.ts` — contextBridge script exposing `window.electron`:
  read/write for every persisted collection above, plus `openExternal`,
  `getSpritePath`/`downloadSprite`, `createPokepaste`, and the auto-updater's
  `onUpdateStatus`/`getUpdateStatus`/`installUpdate`. Preload types every
  payload `any` instead of importing renderer types — a past attempt to import
  one renderer type caused Vite's electron plugin to bundle the entire
  renderer twice (once for the renderer entry, once for preload's own build),
  which broke HMR. The renderer casts `window.electron` results to the real
  types in `src/renderer/types/pokemon.ts` itself.
- `src/renderer/` — the React app (Vite root aliases `@` → `src/renderer`).

**Hard rule:** `src/main/**` must never import from `src/renderer/**`, for the
HMR-breaking reason above.

## Persisted data versioning

Every persisted collection (`TeamsDatabase`, `BattlesDatabase`,
`SavedPokemonDatabase`, `GameDataCache`, `AppSettings`) carries a
`schemaVersion` field (currently `1` for all of them) and a matching
migration hook — `migrateTeamsDatabase`/`migrateBattlesDatabase`/
`migrateSavedPokemonDatabase` in their respective hooks,
`migrateGameDataCache` in `utils/cacheManager.ts`, and `useSettings.ts`'s
existing spread-over-defaults merge. Each hook backfills a missing
`schemaVersion` to `1` in memory on load rather than rewriting the file; a
future format change bumps the number and adds the real migration logic to
the matching hook.

## Renderer layers

- `src/renderer/types/` — single source of truth for all data contracts,
  split into four domain files (most call sites import from `types/pokemon`
  regardless of which file actually defines a given type — not worth a mass
  path rewrite): `pokemon.ts` (barrel; also holds the core team/Pokémon-set
  types and re-exports the other three), `battle.ts` (Battle Logger domain —
  UI archived, but `Battle`/`BattlesDatabase` are still live), `settings.ts`
  (persisted app-settings/sync-payload types), `gameData.ts` (cached
  PokeAPI/Champions-usage types).
- `src/renderer/hooks/` — all state lives here; components stay
  presentational. Notable hooks: `useTeams` (CRUD over teams, persists via
  the storage adapter on every mutation), `useDatabase` (PokeAPI species
  cache — entries never expire once cached, see `utils/cacheExpiry.ts`'s
  `NEVER_EXPIRES`), `useGameData` (move/item/ability/learnset/Champions-usage
  cache — everything except `ChampionsUsageEntry` is likewise permanent),
  `useInitialSync` (on launch, diffs the legal species roster against
  `GameDataCache.lastSyncedSpeciesNames` and bulk-syncs whatever's missing;
  gates the app behind a `LoadingScreen` — this plus Champions usage's 5-day
  refresh are the only things that need network after first launch). Editing
  a Pokémon goes straight through `useTeams().updateTeam()` calls from
  `TeamCard.tsx` — there is no separate draft/commit scratchpad hook.
- `useTeams`, `useSavedPokemon`, `useBattles`, and `useSettings` each mirror
  their state into a ref and queue mutations through it rather than closing
  over state captured at render time, so two concurrent `update*` calls in
  the same tick can't silently lose one's write (the second overwriting the
  first's un-rerendered result). `useDatabase` doesn't need this — its one
  write path already uses a functional `setState` update. See
  `docs/investigations/sibling-hooks-lost-update-audit.md` for the audit
  that found/fixed this.
- `src/renderer/services/parser.ts` — pure, offline, regex-based
  Showdown/Pokepaste text parser: `parseShowdownText()` → `ParseResult`
  (`ShowdownPokemon[]` plus parse errors). No API calls, no side effects.
- `src/renderer/services/pokeapi.ts` — all `fetch` calls to
  `https://pokeapi.co/api/v2`. `normalizeSpeciesForAPI()` handles
  gender-divergent species' separate `-male`/`-female` slugs;
  `enrichPokemonWithAPI()` enriches parsed data with API stats/types/sprites
  through the `useDatabase` cache getter/setter.
- `src/renderer/config/` — static lookup tables only (type/move/ability data,
  VGC legality lists, theme maps, Champions balance-patch overrides applied
  at the read boundary in `useGameData.ts`: `championsMoveOverrides.ts`,
  `championsAbilityOverrides.ts`, `championsMovepoolChanges.ts`). No
  hardcoded colors or species lists belong anywhere else. External-source
  policy for this directory and `services/` lives in
  `.claude/rules/external-data-sources.md`.
- `src/renderer/components/` — presentational only.

## Data flow for an import

1. User pastes Showdown text into `ImportTeamModal` → `parseShowdownText()`
   (pure, sync) → `ParseResult`.
2. Each parsed Pokémon is enriched via `enrichPokemonWithAPI()`, which checks
   `useDatabase`'s cache first and only calls PokeAPI on a miss, writing the
   result back through `setCacheEntry`.
3. The resulting `ImportedPokemonInfo[]` is wrapped into a `Team` and
   persisted via `useTeams().addTeam()`, which writes the full
   `TeamsDatabase` through the storage adapter.
4. Editing an existing team's Pokémon calls `useTeams().updateTeam()`
   directly from `TeamCard.tsx` — there is no separate draft/commit step.

## Cross-device sync (Worker)

- `worker/` — a standalone Cloudflare Worker (own `package.json`/
  `wrangler.toml`), storing one JSON blob per pairing identifier in Workers
  KV via `PUT`/`GET /sync/:identifier`. No accounts, no auth beyond the
  identifier itself — infrastructure each user deploys and owns themselves
  (see `worker/README.md`).
- `src/renderer/services/syncApi.ts` — the only renderer code that talks to
  the Worker's HTTP API; pushes/pulls the app's `TeamsDatabase`/
  `BattlesDatabase` as one `SyncPayload`.
- `src/renderer/hooks/useSync.ts` — orchestrates sync. Deliberately manual
  and one-directional-at-a-time (push *or* pull, user-triggered) rather than
  continuous background sync, since there's no backend arbitrating real
  conflicts.
- Unrelated despite the similar name: `useUsageSync.ts` keeps
  `ChampionsUsageEntry` ladder-usage data fresh from championsbattledata.com
  — nothing to do with this cross-device Worker sync.

## Web build

- `src/renderer/services/storage/` — the `StorageAdapter` interface
  (`read<T>(key)`/`write<T>(key, value)`, keyed by a closed `StorageKey`
  union), with two implementations: `electronAdapter.ts` (delegates to
  `window.electron`; used whenever it exists — desktop app and Vitest's
  mock) and `indexedDBAdapter.ts` (one `choicebuds` IndexedDB database, one
  `kv` object store). `index.ts`'s `getStorageAdapter()` picks lazily on
  first call rather than at module-eval time, since Vitest's
  `setupElectronMock.ts` installs its mock in a `beforeEach` that runs after
  the module graph is first imported. `useTeams`, `useDatabase`,
  `useGameData`, `useBattles`, `useSavedPokemon`, `useSettings`,
  `useVgcPastesCache`, and `useVgcRealSetsCache` all persist through it.
  Only `useDebouncedWrite`, `useSpriteCache`, and `useUpdateCheck` still
  touch `window.electron` directly — the first two guard with
  `if (!window.electron)` and no-op on web, and `useUpdateCheck` is simply
  never instantiated there (no in-app-update concept for a web build).
- `web/` — a second Vite entry (`web/index.html`/`main.tsx`/`vite.config.ts`),
  sharing the root `package.json`'s `node_modules` rather than being a
  standalone project — an alternate front door onto `src/renderer/`, not a
  separate runtime. Builds to `dist/web/`, dev server on port 5174 (Electron's
  stays on 5173, so both can run at once).
- `src/renderer/AppWeb.tsx` — the web shell, sibling to `App.tsx`. Every
  `Sidebar` tab now renders its real page on web (Teams, Box, Battle Log,
  Statistics, Type Matchup, Speed Tiers, Settings, Calc) — full UI parity
  with desktop, not a reduced nav. `useSync`/`useBattles` wire up optional
  sign-in-to-sync (Showdown-style: Teams/Box/the calc all work fully
  signed-out, stored in this browser's IndexedDB). Not wired on web:
  `useInitialSync`/`useUsageSync`'s bulk first-launch dex sync, since it's a
  perf pre-warm rather than a functional requirement — `useGameData` already
  fetches lazily on a cache miss, and `useSpeciesStatsPrefetch` quietly fills
  species stats/types in the background instead so the Add-Pokémon table
  isn't blank on a cold IndexedDB.

## Gender/form handling

VGC-legal species have two gender concerns that must stay in sync across two
files: `config/pokemonRules.ts::getFallbackGender` (parsing-time fallback
when Showdown text omits an explicit `(M)`/`(F)`) and
`services/pokeapi.ts::normalizeSpeciesForAPI` (PokeAPI models
Basculegion/Indeedee/Oinkologne/Meowstic as distinct `-male`/`-female`
resources, not one gender-neutral entry). When adding a new
gender-divergent or gender-locked/genderless species, update both.
