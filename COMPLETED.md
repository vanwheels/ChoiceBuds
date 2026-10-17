# ChoiceBuds - Completed Work Log

Archive of finished work, split out of `TODO.md` (2026-07-08) to keep the
active task list quick to scan. Newest entries first. Cross-references to
still-open items point to `TODO.md`; references to other entries here stay
local ("see below"/"see above").

Archived at milestone boundaries as of the 2026-09-30 split (Post-Parity
Polish - see `MILESTONES.md`), per CLAUDE.md's archiving rules: a shipped
milestone becomes the real cutoff instead of an arbitrary entry count.
Entries prior to this file's oldest are in:
- [docs/archive/completed-2026-06-17-to-2026-07-09.md](docs/archive/completed-2026-06-17-to-2026-07-09.md)
  (the 50 oldest entries as of the 2026-08-31 split)
- [docs/archive/completed-2026-07-09-to-2026-09-01.md](docs/archive/completed-2026-07-09-to-2026-09-01.md)
  (everything through the Battle Logger Re-eval + Data & Process Cleanup
  milestone, split out at the 2026-09-08 Card UI Polish boundary)
- [docs/archive/completed-2026-09-01-to-2026-09-13.md](docs/archive/completed-2026-09-01-to-2026-09-13.md)
  (Card UI Polish through Regular Calc Popup and everything shipped between
  them, split out at the 2026-09-13 Regular Calc Popup boundary)
- [docs/archive/completed-2026-09-13-to-2026-09-30.md](docs/archive/completed-2026-09-13-to-2026-09-30.md)
  (VGCPastes Real-Set Sourcing through Post-Parity Polish and everything
  shipped between them, split out at the 2026-09-30 Post-Parity Polish
  boundary)
- [docs/archive/completed-2026-09-30-to-2026-10-16.md](docs/archive/completed-2026-09-30-to-2026-10-16.md)
  (Web TeamCard Expand Infinite-Loop Bug through Project Revision v2 and
  everything shipped between them, split out at the 2026-10-16 Project
  Revision v2 boundary)
- [docs/archive/completed-2026-10-16-to-2026-10-16.md](docs/archive/completed-2026-10-16-to-2026-10-16.md)
  (the Prettier Adoption milestone's three legs, split out at the
  2026-10-16 Prettier Adoption boundary)
- [docs/archive/completed-2026-10-16-to-2026-10-16-maintenance-code-health-sweep.md](docs/archive/completed-2026-10-16-to-2026-10-16-maintenance-code-health-sweep.md)
  (the Maintenance & Code Health Sweep milestone's seven legs, split out at
  the 2026-10-16 Maintenance & Code Health Sweep boundary - named with the
  milestone slug since it shares its date range with the Prettier Adoption
  archive above)
- [docs/archive/completed-2026-10-16-to-2026-10-17.md](docs/archive/completed-2026-10-16-to-2026-10-17.md)
  (the TeamCard Bug Fixes & Dev Tooling milestone's four legs, split out at
  the 2026-10-17 TeamCard Bug Fixes & Dev Tooling boundary)

## Teams Tab Search Bar — 2026-10-17

Added a search input to `TeamsPage.tsx` (desktop header + mobile search
popover, mirroring `BoxPageToolbar.tsx`'s own pattern) that filters the
Teams list live by partial, case-insensitive species/nickname match across
each team's roster. New `utils/teamSearch.ts::teamMatchesSearch`, layered
on top of the existing format filter rather than replacing it; tested.
Verified live by Vanny. See commit 9f34fe6.

## Web Content-Area Padding Fix — 2026-10-17

`AppWeb.tsx`'s `<main>` had no padding at all, unlike `App.tsx`'s desktop
`<main>` (2rem/1.5rem inline styles), so ported pages rendered edge-to-edge
in the browser - most visible on the Battle Log page's card grid butting
against the viewport edges. Added `md:px-8 md:py-6` to `AppWeb.tsx`'s
`<main>`, matching `App.tsx`'s 2rem/1.5rem but gated to `md` and up rather
than unconditional: `TeamsPage.tsx`'s content div (`px-4 md:px-0`) and
`BoxPageGrid.tsx` (`px-4 md:px-8`) already supply their own mobile padding
and assume `<main>` stays at 0 below `md`, so matching `App.tsx` verbatim
would have double-padded them on mobile web. Battle Log/Statistics/Type
Matchup/Speed Tiers/Settings have no padding of their own and are still
edge-to-edge below `md` - filed as a separate Unscheduled TODO item rather
than folded into this leg, since fixing it means touching 5 files' own
layout, not just `<main>`. Verified live on choicebuds.vannyproductions.com.
See commit `e836d52`.

## Sibling Hooks' applySyncedState Stale-Overwrite Race — 2026-10-17

Flagged while fixing TeamCard Notes: Data Loss on First Blur After Expand
(see `docs/investigations/teamcard-notes-sync-race.md`): `useBattles.ts`'s
and `useSavedPokemon.ts`'s own `applySyncedState` shared the exact same
blind-overwrite shape that bug's fix closed in `useTeams.ts`'s - a debounced
auto-sync response landing after a local edit already won the
`enqueueMutation` queue would silently discard that edit, same mechanism,
different collections (battle notes/edits, Box entries). Both hooks now
take the same per-record `updatedAt` reconciliation, local-order-preserving
base (a local-only record keeps its own list position instead of landing
at the end), and tombstone-aware drop/clear `useTeams.ts` already had -
`applySyncedState` on both now takes a second argument, `pushedTombstones`,
mirroring `useTeams.ts`'s signature. `useSync.ts`'s `syncNow` now passes
`payload.battleTombstones`/`payload.savedPokemonTombstones` through to each
call (previously computed but unused for these two). Four new regression
tests in each of `useBattles.test.ts`/`useSavedPokemon.test.ts`, mirroring
`useTeams.test.ts`'s existing `applySyncedState` cases (overwrite + clear
tombstones, local-edit-wins-the-race, local-only-record-keeps-position,
delete-not-resurrected). Not manually verified live - same reasoning as the
Teams fix, this is a queue-ordering race unit tests cover more reliably
than a live repro. See commit `24c9c13`.

## Web Download/Landing Page — 2026-10-17

Added a new Vite build input (`web/download/`) mounting `DownloadPage.tsx`
at `choicebuds.vannyproductions.com/download/`, independent of the main web
app bundle at the domain root (placement decided 2026-10-17: the Teams/Box
web app stays at root, the landing page doesn't replace it, since the
original "default download entry point" framing from Web Hosting &
Domain's scoping note predated the web app actually shipping there). Calls
`fetchLatestRelease()` (`services/github.ts`, extended to also return each
release's `assets` - `name`/`downloadUrl` pairs) and picks the
OS-appropriate installer via two new pure, tested modules:
`utils/detectPlatform.ts` (binary Windows/macOS user-agent sniff - no third
build target exists) and `utils/releaseAssets.ts` (matches
electron-builder's real artifact names from `package.json`'s `build`
config - `ChoiceBuds-Setup-*.exe` NSIS installer vs. the plain
`ChoiceBuds-*.exe` portable build, `*-universal.dmg` vs. `*-universal-mac.zip`).
Falls back to a GitHub Releases link if the fetch fails or a platform's
assets are missing. `AppWeb.tsx`'s sidebar footer gets a small "Get the
desktop app" link to `/download/` for discoverability - flagged by Vanny
post-verification as worth making more visible later, not urgent now (see
`TODO.md`'s Unscheduled section). Verified the asset-picking logic against
the real latest release's live asset list, not just fixtures, and
confirmed live on choicebuds.vannyproductions.com after deploy. See commit
`bc0a41e`.

No other entries yet since the last milestone boundary.

