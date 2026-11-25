# Architecture

Systems, ownership, state, and data flow as the app stands today. History
lives in `COMPLETED.md`/`MILESTONES.md`, not here. Each section links its
deep-dive in `docs/architecture/`; editing rules live in `.claude/rules/`.

## Process split (Electron)

`src/main/` owns the window, auto-updater, and every userData file read/write
(IPC handlers in `src/main/ipc/`, file names in `paths.ts`, crash-safe queued
writes in `atomicWrite.ts`). `preload.ts` exposes `window.electron`;
`src/renderer/` is the React app. Main never imports the renderer, because
doing so double-bundles it and breaks HMR
(`.claude/rules/main-renderer-import-boundary.md`).
→ [electron-process-split.md](docs/architecture/electron-process-split.md)

## Persisted data versioning

Every persisted collection carries `schemaVersion` plus a migration hook that
backfills in memory on load, so a format change has one place to land.
Nested settings singletons need explicit field backfills
(`.claude/rules/settings-nested-singleton-backfill.md`).
→ [persisted-data-versioning.md](docs/architecture/persisted-data-versioning.md)

## Renderer layers

- `types/` — every data contract (`pokemon.ts` is the barrel).
- `hooks/` — all state; persisting hooks queue mutations through a ref so
  same-tick updates can't lose a write.
- `services/` — the pure Showdown parser, PokeAPI fetches, storage adapter,
  sync API.
- `config/` — static tables only, including Champions balance overrides
  applied at `useGameData`'s read boundary, keyed by regulation.
- `components/` — presentational only.

→ [renderer-layers.md](docs/architecture/renderer-layers.md)

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

`worker/` is a Cloudflare Worker storing one `SyncPayload` per sync identifier in KV;
`services/syncApi.ts` is the only renderer code that calls it, and `useSync`
runs it manually, one direction at a time, since nothing arbitrates
conflicts. Each persisting hook reconciles responses per record by
`updatedAt`, honoring local tombstones and normalizing incoming records the
way the load path does. `GET /profile/:username` is the one endpoint that
reads inside records, filtering to visible teams/favorites.
→ [cross-device-sync.md](docs/architecture/cross-device-sync.md)

## In-app profile navigation

`useProfileNav` keeps a username back-stack layered over the active tab;
`ProfilePage` and the standalone `/u/<username>` route share `ProfileCard`.
Own-profile editing is always on, gated only by `isOwnProfile`, with local
optimistic state because the profile fetch is one-shot.
→ [profile-navigation.md](docs/architecture/profile-navigation.md)

## Web build

`web/` is a second Vite entry over the same `src/renderer/`, persisting
through `services/storage/`'s IndexedDB adapter instead of Electron IPC.
`AppWeb.tsx` has full tab parity and never requires sign-in. `web/download/`
is a separate landing page; `/u/<username>` mounts a standalone profile page
that never loads the PokeAPI game-data cache. Mobile pages pad themselves
(`.claude/rules/mobile-web-page-padding.md`).
→ [web-build.md](docs/architecture/web-build.md)

## Feature deep-dives

- [Tourney tab](docs/architecture/tourney-tab.md) — hand-authored event
  table, pure upcoming-event filter.
- [Mobile Teams swipe deck](docs/architecture/mobile-teams-swipe-deck.md) —
  per-Pokémon swipe overlay with an add page; modals stack above it.
- [Box entry modal](docs/architecture/box-entry-modal.md) — one shared modal
  instance, so the grid doesn't reflow and prev/next doesn't flicker.
- [Type Matchup coverage](docs/architecture/type-matchup-coverage.md) —
  offensive/defensive tables with per-table Mega preview state.
- [Ability-affects-move indicator](docs/architecture/ability-affects-move-indicator.md)
  — `abilityMoveBoosts.ts` rules, evaluated once per render in `EditOverlays`.
- [Calc popup](docs/architecture/calc-popup.md) — `useDamageCalc` over
  `@smogon/calc`, lazy-loaded behind the Calc tab.
- [Mega & alt-form display toggle](docs/architecture/mega-alt-form-toggle.md)
  — session-only display override keyed by slot id; battle logger tracks
  real Mega Evolution separately.
- [Tag-chip search](docs/architecture/tag-chip-search.md) — shared chip
  matching for the team builder and Box, Mega-aware.
- Gender/form handling — two files must stay in sync
  (`.claude/rules/gender-form-handling.md`).
