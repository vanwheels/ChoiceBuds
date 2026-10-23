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

`useSettings.ts`'s `{ ...DEFAULT_SETTINGS, ...database }` merge only
backfills a top-level key that's missing from the saved file entirely — a
nested singleton (`playerProfile`, `favoritePokemon`) that already existed
before a new field was added to its interface keeps that field
`undefined` through the shallow spread. `undefined` then drops out of
`JSON.stringify` on sync push, which the Worker's `isOptionalSingleton`
check rejects, failing the *entire* push. Any field added to an
already-live nested singleton needs its own explicit backfill check (see
the `playerProfile`/`favoritePokemon` `updatedAt` fix,
`docs/postmortems/public-profiles-and-team-sharing.md`), not just a type
change.

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
  `usePokemonFormToggle` (keyed by a roster slot's own stable id, not
  species) holds the live "currently Mega-Evolved"/"currently in an
  alternate stat-forme" display override that the team card, team builder,
  and battle logger share (Mega & Alt-Form Toggle State, see TODO.md) — a
  module-level store (subscribed to via `useSyncExternalStore`, same
  session-only-cache shape as `useMegaSprite`'s sprite lookup) rather than
  persisted/synced state, since Mega Evolution and Aegislash's Blade/Shield
  only happen in-battle and are never part of a saved set.
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
- `useTeams.ts`/`useBattles.ts`/`useSavedPokemon.ts`'s own `applySyncedState`
  all reconcile rather than blindly overwriting local state with a
  pull/push response: per record, each keeps whichever side (local vs. the
  response) has the newer `updatedAt`, rebuilds its base order from local
  order (not the response's) so a locally-added record the response doesn't
  know about yet keeps its position instead of landing at the end, and
  drops any response record that still has a pending local tombstone rather
  than letting a late response resurrect a local delete — see
  `docs/investigations/teamcard-notes-sync-race.md` for the race this
  closes (first fixed in `useTeams.ts`, then mirrored into the other two).
  `useTeams.ts`'s own version of this algorithm is a pure
  `reconcileSyncedTeams` in `utils/teamSyncReconciliation.ts` (split out of
  the hook itself, see Split useTeams.ts in COMPLETED.md); `useSavedPokemon.ts`
  mirrors that as `reconcileSyncedSavedPokemon` in
  `utils/savedPokemonSyncReconciliation.ts` (see Split useSavedPokemon.ts in
  COMPLETED.md). `useBattles.ts` still keeps theirs inline.
- `GET /profile/:username` (no auth) is the one place the Worker reads
  inside an otherwise-opaque `Team`/`SavedPokemonEntry` record on purpose —
  `worker/src/publicProfile.ts`'s pure `extractPublicTeam`/
  `extractPublicFavoritePokemon` filter the stored `SyncPayload` down to
  whichever teams/the account's `FavoritePokemon` are toggled visible
  (private by default), dropping a team whose name fails `safetyFilter.ts`'s
  check entirely and blanking just a Pokémon's nickname if that fails
  instead (Public Profiles: Per-Item Visibility Toggles, see TODO.md).
  `FavoritePokemon` keeps the original binary `isPublic` toggle; a `Team`
  instead carries a 3-state `visibility` (`'private'`/`'closed'`/`'open'` —
  Teamsheet Open/Closed Visibility Tiers, see TODO.md/COMPLETED.md): a
  `closed` team exposes species/nickname/sprite only (the original exposure
  shape), an `open` team additionally exposes its full competitive set
  (item/ability/moves/EVs/nature) per Pokémon. An existing `isPublic: true`
  team migrated to `closed`, never `open`, on `TeamsDatabase`'s
  schemaVersion 1-to-2 bump (`utils/teamMigrations.ts`'s
  `migrateTeamsDatabase`/`normalizeTeam`, split out of `useTeams.ts` itself
  — see Split useTeams.ts in COMPLETED.md) — widening to the new full-set
  tier needs an explicit choice, not a silent migration. `FavoritePokemon`
  is a second account-wide singleton alongside `PlayerProfile`, merged the
  same `mergeSingleton` last-write-wins way.
  A Team Pokemon's own stored `spriteUrl` field is a static value captured
  once at import time and is never shiny-aware (every real on-screen card
  in the renderer recomputes it live instead via `utils/spriteUrl.ts`'s
  `getPixelSpriteUrl`, which does respect the live `shiny` flag), so
  `extractPublicPokemon` recomputes it the same way from the record's own
  `pokedexNumber`/species/gender/shiny via `worker/src/spriteUrl.ts` — a
  hand-duplicated port of that same renderer function, same "separate build
  targets, no shared package" reasoning as `safetyFilter.ts` — falling back
  to the stored field only when `pokedexNumber` is missing/malformed (very
  old data predating that field).
- The order teams appear in on a profile is its own field, `Team
  .profileOrder` — deliberately separate from the private Teams tab's own
  `sortOrder` (Drag-to-Rearrange Previewed Teams, see TODO.md/COMPLETED.md),
  since reordering one must never silently reorder the other.
  `handleProfileGet` sorts by it (`worker/src/publicProfile.ts`'s
  `sortTeamsForProfile`) before `extractPublicTeam` filters/shapes the
  result; the renderer's `useTeams.ts::setProfileTeamOrder` stamps it (plus
  a fresh `updatedAt`) only on the teams named in a completed drag on your
  own profile page, leaving every other team - including the array's own
  element order - untouched.

## In-app profile navigation

- `src/renderer/hooks/useProfileNav.ts` — a back-stack of usernames (not a
  single optional field) layered on top of `ActiveTab` in both `App.tsx`/
  `AppWeb.tsx`: opening a profile pushes a username without changing the
  active tab, so "Back" just pops the stack and whichever tab was already
  active underneath reappears untouched. A real stack rather than one field
  because the profile page's own username lookup can open a second profile
  without losing the first — back from there returns to the previous
  profile, not straight to the tab. `closeProfile` resets the whole stack
  at once; `Sidebar.tsx`'s `onTabChange` calls it before switching tabs so
  picking a different tab always lands on that tab rather than leaving a
  (now-hidden) profile view stuck on screen underneath.
- `src/renderer/components/profile/ProfilePage.tsx` — renders inside
  `<main>` (not a route) whenever the stack is non-empty, sharing its
  fetch/render logic (`usePublicProfile`/`ProfileCard`) with the standalone
  `/u/<username>` route (`PublicProfilePage.tsx`) so both render off the
  same `GET /profile/:username` call via `usePublicProfile`. Own-profile
  detection compares lowercased usernames (`worker/src/index.ts` lowercases
  every lookup server-side) against `useSync`'s `syncUsername`; when they
  match, every own-profile editing affordance — favorite-Pokémon edit, each
  section's "+ Team" picker, cross-section drag, and the per-team "×"
  remove control — is permanently visible, gated only by `isOwnProfile`.
  There is no Edit-mode toggle: one shipped in Profile Editing & Visibility
  Controls Leg 4 and was removed again the same milestone (Leg 5) once it
  was clear that gating editing behind an extra click put this page out of
  step with the rest of the app's always-on-editing convention (e.g.
  `PokemonCard.tsx`'s own permanent "×"). The old always-visible
  `ProfileEditControls.tsx` panel (per-team visibility dropdowns + a
  favorite-Pokémon search box, originally moved here from Settings'
  `PublicProfileSection`) is gone outright — team visibility is instead set
  from three places, all committing through the same
  `updateTeam(team.id, { visibility })` call: the Teams tab's own
  `TeamVisibilityBadge` (next to `RegulationBadge` in
  `TeamCardHeader.tsx`), each profile section's "+ Team" picker
  (`AddTeamToProfileDialog.tsx`), and dragging a card across the
  Open/Closed boundary. `FavoritePokemonEditor.tsx` replaces the plain
  favorite-Pokémon display: the sprite (or "+" placeholder) is permanently
  clickable and opens a `Modal.tsx` popup with the species search box and
  shiny/public toggles. Edits write through the normal
  `teamsState`/`settingsState` mutators and reflect immediately; the
  `ProfileCard` preview rendered alongside can lag a few seconds behind
  since it still reflects `useSync`'s last-synced server copy.
- `ProfileCard` splits a profile's teams into "Open Teamsheets"/"Closed
  Teamsheets" sections (`ProfileTeamSection`, one instance per tier) instead
  of one flat list, and a localStorage-backed grid/list layout choice
  (`useProfileLayout`, same pattern as `useSidebarCollapsed`) controls how
  every team's Pokémon render (`ProfileTeamCard` → `ProfilePokemonTile`/
  `ProfilePokemonRow`) — a visual-style redo so both tiers read as real team
  cards (sprite/item/ability/moves/stat-alignment, mirroring
  `TeamPosterTile.tsx`'s team-poster-export layout) rather than plain text
  rows. `gameDataState`/`spriteCacheState` (App.tsx/AppWeb.tsx mount both
  once, app-wide) are threaded down from `ProfilePage` through to
  `ProfilePokemonTile`/`ProfilePokemonRow` (`utils/profileGameData.ts`'s
  cache-only lookups, same as `TeamPosterTile`'s — never a live PokeAPI
  fetch, so viewing a profile never adds new network calls) for real
  type-colored move chips and PokeAPI-sourced item icons there. Both props
  are optional on every component in this chain, since the standalone
  `/u/<username>` route (`PublicProfilePage.tsx`) deliberately never pulls
  in the PokeAPI-backed game-data cache (see Web build section below) —
  without them, items only get an icon via `getItemFallbackSpriteUrl`'s
  static Serebii fallback set and moves render as neutral chips.
  `ProfileCard` itself (not each section) owns both tiers' ordered-id
  arrays via `useCrossTierReorder` (a `useGridReorder`-adjacent hook reusing
  its pure `pickSlotIndex`/`moveToIndex`), so a drag crossing the
  Open/Closed boundary can move an id out of one tier's array and into the
  other's — committing through `onAddTeamToTier` (the visibility write)
  then `onReorderTeams` (the dropped-at-the-end position), only persisting
  the latter once the former actually succeeds. This is safe even though
  `Team.profileOrder` is one flat field across every team because
  `sortTeamsForProfile` is a stable sort and the section split happens
  again, client-side, before either array's order is read.
  Because `usePublicProfile`'s fetch is one-shot and never refreshes
  mid-session, `ProfileCard` keeps its own optimistic local state so
  adds/removes/moves show immediately instead of waiting on a reload:
  `utils/publicTeamSynthesis.ts`'s `synthesizePublicTeam` (mirroring
  `worker/src/publicProfile.ts`'s `extractPublicTeam`) builds a client-side
  `PublicTeam` stand-in for a team added to a tier for the first time (one
  with no real `PublicTeam` yet), merged into an overlay map. Each tier's
  ordered-id array is still resynced only off the *real* fetched teams
  (never the overlay-merged list) — keying the resync off the overlay
  instead would reset straight back to the stale fetch and resurrect a team
  removed earlier in the same session the moment any unrelated add changed
  what the merged list contains (confirmed live during Leg 5).
- Pinned via `Sidebar.tsx`'s footer entry (desktop rail + mobile drawer,
  hidden entirely when signed out) above the Settings entry, reusing the
  same `renderNavItem` row styling/active-highlight the tab items use —
  generalized to take an explicit `isActive`/key pair instead of deriving
  it from `ActiveTab`.
- `ProfileCard`'s per-section regulation filter (pill row: All/Reg M-A/
  Reg M-B/Reg M-C, built off the same `ALL_REGULATION_IDS`/
  `getRegulationLabel` source `TeamsPage.tsx`'s own Format Filter Buttons
  use) narrows both Open/Closed sections to one regulation at a time;
  shared by the in-app profile page and the standalone `/u/<username>`
  route since both render through `ProfileCard`.
- Any open-teamsheet team on someone else's profile (own profile and
  closed-teamsheet teams excluded) gets an "Import to my Teams" action:
  `utils/profileTeamImport.ts` converts the `PublicTeam`'s Pokemon into
  `ShowdownPokemon`, then runs them through the normal
  `enrichPokemonWithAPI` → `useTeams().addTeam()` pipeline — the same path
  a pasted Showdown export goes through, not a separate import mechanism.

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
- `web/download/` — a third Vite entry mounting
  `components/DownloadPage.tsx`, independent of `web/`'s main app bundle.
  Serves `choicebuds.vannyproductions.com/download/`: fetches the latest
  release via `services/github.ts::fetchLatestRelease()` (the same call the
  in-app update checker uses), sniffs Windows vs. macOS
  (`utils/detectPlatform.ts`), and picks the matching electron-builder
  artifact (`utils/releaseAssets.ts`) — falling back to a GitHub Releases
  link if the fetch fails or a platform's assets are missing. The signed-out
  Teams/Box web app keeps the domain root; this is a separate landing page,
  not a route inside `AppWeb.tsx`.
- `/u/<username>` (`web/main.tsx`) mounts a standalone
  `components/PublicProfilePage.tsx` instead of the full `AppWeb` shell, so
  an unauthenticated visitor never pulls in Teams/Box/sync state — it only
  calls the Worker's public `GET /profile/:username`. A GitHub Pages
  `404.html` (stash-URL-then-`history.replaceState`) makes a direct link to
  this route work on the static-hosted build, which has no server-side
  history fallback the way the dev server does.
- `src/renderer/utils/safetyFilter.ts` and `worker/src/safetyFilter.ts` are
  hand-duplicated (own test suite each) rather than shared, since the
  renderer and Worker are separate build targets with no shared package —
  same duplication pattern as each side's own `USERNAME_PATTERN`. Built on
  `obscenity`, with a handful of allowlist entries for real VGC
  species/ability/item names it otherwise false-flags (e.g. "Neutralizing
  Gas"). Enforced at username entry (client + Worker, on `/signup`) and
  again server-side on public team names/Pokémon nicknames inside
  `worker/src/publicProfile.ts`, since the generic sync endpoint stays
  opaque to those fields by design.
- `src/renderer/AppWeb.tsx` — the web shell, sibling to `App.tsx`. Every
  `Sidebar` tab now renders its real page on web (Teams, Box, Battle Log,
  Statistics, Type Matchup, Speed Tiers, Tourney, Settings, Calc) — full UI
  parity with desktop, not a reduced nav. `useSync`/`useBattles` wire up optional
  sign-in-to-sync (Showdown-style: Teams/Box/the calc all work fully
  signed-out, stored in this browser's IndexedDB). Not wired on web:
  `useInitialSync`/`useUsageSync`'s bulk first-launch dex sync, since it's a
  perf pre-warm rather than a functional requirement — `useGameData` already
  fetches lazily on a cache miss, and `useSpeciesStatsPrefetch` quietly fills
  species stats/types in the background instead so the Add-Pokémon table
  isn't blank on a cold IndexedDB.
- `AppWeb.tsx`'s `<main>` is deliberately unpadded below the `md` breakpoint,
  so every tab rendered inside it (Battle Log, Statistics, Type Matchup,
  Speed Tiers, Settings, plus `RecordMatchForm`'s in-place record/edit view)
  supplies its own `px-4 md:px-0` on its root container instead — matching
  `TeamsPage.tsx`/`BoxPageGrid.tsx`'s existing pattern. A new mobile-web page
  needs the same `px-4 md:px-0` or it renders edge-to-edge below `md`; don't
  add padding to `AppWeb.tsx`'s `<main>` itself, since that would double up
  on pages that already have their own.

## Tourney tab

- `src/renderer/config/tourneyEvents.ts` — a hand-authored, config-only table
  of TPCi's sanctioned VGC circuit events (Regionals, Special Events,
  Internationals, Worlds) for the current season, same pattern as the
  Champions balance-override files: sourced from Serebii's `playpokemon`
  pages per `external-data-sources.md` exception #2 (manual research only,
  no live fetch — no official structured schedule API exists, see
  `docs/investigations/tourney-tab-schedule-source-research.md`), and
  refreshed by hand as TPCi announces new season dates rather than on a
  fixed interval. No Global Challenge events or signup deadlines are
  listed — deliberately excluded (not shown on either source page), per the
  file's own header.
- `src/renderer/utils/tourneyEvents.ts::getUpcomingEvents` — pure filter/sort
  over the config, keeping only events that haven't ended yet and ordering
  soonest-first. `components/tourney/TourneyPage.tsx` renders the result via
  `TourneyEventCard.tsx`; tier badge colors live in their own
  `config/tourneyEventTheme.ts` table, mirroring `pokemonTheme.ts`'s
  `REGULATION_THEMES`. Dates parse through `parseISODate` (UTC-anchored) to
  avoid a local-timezone shift misreading an ISO `YYYY-MM-DD` calendar day —
  same treatment `config/seasons.ts` gives its own ISO date strings.

## Mobile Teams swipe deck

- `src/renderer/components/MobileTeamSwipeOverlay.tsx` — the full-screen,
  swipeable card-per-Pokémon view for a team on mobile widths (below the
  `md` breakpoint). Whenever the roster has fewer than 6 Pokémon, an extra
  page past the last card opens `MobileAddPokemonPage.tsx` (wrapping the
  same `AddPokemonStatTable` desktop uses) to append a new slot; at 0
  Pokémon this becomes the overlay's only page — a dedicated empty-state
  screen with the same add affordance, replacing an earlier bail-out-and-
  auto-close effect.
- `components/Modal.tsx` sits above these swipe overlays in z-index, so a
  dialog opened from within one (e.g. Roster Swap's species picker) renders
  on top instead of being hidden behind the overlay — a prerequisite for any
  modal-opening affordance added inside the swipe deck.

## Gender/form handling

VGC-legal species have two gender concerns that must stay in sync across two
files: `config/pokemonRules.ts::getFallbackGender` (parsing-time fallback
when Showdown text omits an explicit `(M)`/`(F)`) and
`services/pokeapi.ts::normalizeSpeciesForAPI` (PokeAPI models
Basculegion/Indeedee/Oinkologne/Meowstic as distinct `-male`/`-female`
resources, not one gender-neutral entry). When adding a new
gender-divergent or gender-locked/genderless species, update both.
