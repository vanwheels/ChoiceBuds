# Full Web Feature Parity — Scoping Session

Scoped 2026-09-29, following on from Web Version: Teams & Box MVP (see that
milestone's [postmortem](../postmortems/web-version-teams-box-mvp.md)). Goal:
identify what's left to port from desktop to web and split it into concrete
build legs, same process as that milestone's own scoping session (see
[web-version-scope.md](web-version-scope.md)).

## What's already live on web

`AppWeb.tsx` currently wires: `useTeams`, `useDatabase`, `useSavedPokemon`,
`useActiveEditor`, `useGameData`, `useSpeciesRoster`, `useSpriteCache`,
`useSettings`, `useSync` (with a `useWebBattlesStub` standing in for real
battle data), rendering `TeamsPage` + `BoxPage` behind a hand-rolled 2-item
nav.

## Survey: what's missing and why

Checked every desktop-only tab/section (`App.tsx`'s `BattleLogPage`,
`StatisticsPage`, `TypeMatchupPage`, `SpeedTiersPage`, `SettingsPage`,
`CalcPopup`) plus `ExportTeamModal`/`ReleaseNotesMarkdown` for direct
`window.electron` calls, to find the actual porting cost of each rather than
assuming every tab needs its own storage-adapter leg like Teams/Box did.

**Zero porting cost — already storage-adapter-clean:**
`CalcPopup`/`useDamageCalc`, `TypeMatchupPage`, `SpeedTiersPage`, and
`Sidebar.tsx` itself have no `window.electron` dependency anywhere in their
tree. All their props (`teamsState`, `gameDataState`, `databaseState`,
`spriteCacheState`, `savedPokemonState`, `settingsState`,
`speciesRosterState`) are hooks already ported during Teams/Box Parity. These
just need wiring into web's nav — no hook-porting leg required, unlike every
Teams/Box-era leg.

**One hook needs porting:** `useBattles.ts` still calls `window.electron.
read/writeBattlesDatabase` directly (same shape `useTeams`/`useDatabase` had
before their own ports). This is the one real gap blocking `BattleLogPage`
and `StatisticsPage` (`StatisticsPage` itself has no Electron dependency — it
only derives stats client-side from the `battles` array, so once
`useBattles` is ported, `StatisticsPage` is free). Also needs `useSync`'s
`useWebBattlesStub` swapped for the real hook.

**`SettingsPage` — mostly clean, two small exceptions:**
- `UpdateCheckSection`/`useUpdateCheck.ts` wraps Electron's `autoUpdater` IPC
  (`onUpdateStatus`/`getUpdateStatus`/`installUpdate`) — there's no
  equivalent concept on web (a web app is always whatever was last deployed;
  nothing to check or install). **Decision: exclude this section entirely on
  web**, not a porting target — it doesn't map to anything on this platform.
- `ReleaseNotesMarkdown.tsx` and `ExportTeamModal.tsx` both call
  `window.electron.openExternal(url)` to open a link in the OS browser. On
  web the app *is* the browser, so this is a one-line swap to a plain
  `<a href target="_blank" rel="noopener">` per call site — not a hook port.
- `ExportTeamModal`'s "Create Pokepaste Link" button
  (`services/pokepaste.ts::createPokepaste`) already has a documented
  null-safe fallback for web (`if (!window.electron) return null`) because
  the real POST has to be proxied through Electron's main process (no CORS
  headers on `pokepast.es/create` — see root `CLAUDE.md`'s seventh
  exception). `ExportTeamModal` already renders a "Could not create the
  Pokepaste link" error for a null result, so nothing breaks — the button
  just won't work on web yet. Making it work would mean standing up a proxy
  (e.g. a new Worker route) — out of scope here; ship the graceful failure
  as-is and revisit only if it turns out to matter to users.

**Nav shell decision (asked live, 2026-09-29):** with Calc/Type
Matchup/Speed Tiers/Battle Log/Statistics/Settings all landing, `AppWeb.tsx`
ends up needing the same 7 tabs `App.tsx` already has. Its current
hand-rolled 2-button nav (a deliberate call made when web only had Teams+Box
— see its own header comment) stops making sense once the tab list matches.
**Decided: reuse `Sidebar.tsx` and `App.tsx`'s lazy-load/visited-tabs
pattern** instead of continuing to grow a second hand-rolled nav
implementation. `Sidebar.tsx` has no Electron dependency of its own (confirmed
live) — it only type-imports `ActiveTab` from `App.tsx`, a type-only import
with no runtime coupling, so reuse doesn't pull any Electron code into the
web bundle.

**Deliberately still not wired (carried over from Teams/Box Parity, still
true here):** `useInitialSync`/`useUsageSync` (bulk first-launch dex
pre-warm — a perf optimization, not a functional requirement, since
`useGameData` already fetches lazily on a cache miss).

## Resulting legs

Ordered so the nav-shell rework lands first (everything else depends on it
having somewhere to plug into), then legs are sequenced cheapest/most
self-contained first:

1. **[Web Nav Shell: Adopt Sidebar.tsx] — Leg 1** — rework `AppWeb.tsx` to
   use the real `Sidebar.tsx` + `App.tsx`'s lazy-load/visited-tabs pattern in
   place of the hand-rolled 2-button nav. Still only Teams+Box functionally
   wired at the end of this leg — pure shell/structure change.
2. **[Web Calc & Matchup Tools Parity] — Leg 1** — wire `CalcPopup`,
   `TypeMatchupPage`, `SpeedTiersPage` into the now-generalized nav. No hook
   porting needed (see survey above) — depends on Leg 1 only for having a
   real nav to add tabs to.
3. **[Web Battle Log Storage Adapter Port] — Leg 1** — port `useBattles.ts`
   to the storage adapter (mirrors `useTeams`/`useDatabase`'s own port),
   swap `AppWeb.tsx`'s `useWebBattlesStub` for the real hook in `useSync`'s
   wiring. Data-layer only, no new UI — matches how Web App Scaffold: Storage
   Adapter was kept separate from the Teams/Box UI legs that consumed it.
4. **[Web Battle Log & Statistics Parity] — Leg 1** — wire `BattleLogPage` +
   `StatisticsPage` into the nav (depends on Leg 3's adapter port).
5. **[Web Settings Parity] — Leg 1** — wire `SettingsPage` into the nav,
   excluding `UpdateCheckSection`; fix `ReleaseNotesMarkdown`/
   `ExportTeamModal`'s `openExternal` calls with a web `<a target="_blank">`
   fallback; leave the Pokepaste-create button's existing null-fallback error
   path as-is (see survey above).
