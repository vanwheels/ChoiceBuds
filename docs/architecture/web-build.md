# Web build

Deep-dive split out of `ARCHITECTURE.md`; the summary there links here.

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
