# Post-mortem: Full Web Feature Parity

**Date:** 2026-09-29 to 2026-09-30. **Status:** Shipped. Boundary: `git log`
range `0718b74..9131aef` — starts at the scoping commit (right after Web
Version: Teams & Box MVP shipped), ends at the Web Settings Parity closeout.
Full implementation detail for every item below lives in its own
`COMPLETED.md` entry — this doc is the retrospective, not a restatement.

## What shipped

Six legs (one scoping, five build), landed over two days:

1. **Scoping.** Surveyed every desktop-only tab (Battle Log, Statistics,
   Type Matchup, Speed Tiers, Settings, Calc Popup) for actual
   `window.electron` dependencies instead of assuming each needed its own
   storage-adapter port. Found Calc/Type Matchup/Speed Tiers were already
   storage-adapter-clean (zero porting cost), only `useBattles.ts` needed a
   real hook port, and Settings needed two small `openExternal` fallbacks
   plus excluding the auto-update section entirely (no web equivalent).
   Also decided to replace `AppWeb.tsx`'s hand-rolled 2-button nav with the
   real `Sidebar.tsx` now that the tab list was about to match desktop's.
   Full reasoning in
   [docs/investigations/web-feature-parity-scope.md](../investigations/web-feature-parity-scope.md).
2. **Web Nav Shell: Adopt Sidebar.tsx.** Replaced the hand-rolled nav with
   `Sidebar.tsx` + `App.tsx`'s lazy-load/visited-tabs pattern. Since
   `Sidebar.tsx` hardcodes all 7 desktop tabs, every tab appeared in the web
   nav immediately, ahead of being functionally wired — covered with a
   `WebComingSoon.tsx` placeholder for the 5 not-yet-ported tabs. See commit
   `ccf4d57`.
3. **Web Calc & Matchup Tools Parity.** Wired `CalcPopup`, `TypeMatchupPage`,
   `SpeedTiersPage` into the nav — no hook porting needed, confirmed clean
   during scoping. See commit `f6fd79d`.
4. **Web Battle Log Storage Adapter Port.** Ported `useBattles.ts` to the
   `StorageAdapter` interface, mirroring `useTeams`/`useDatabase`'s earlier
   port; swapped `AppWeb.tsx`'s always-zero `useWebBattlesStub` for the real
   hook and deleted the stub. Data-layer only, no new UI. See commit
   `d9d5cd7`.
5. **Web Battle Log & Statistics Parity.** Wired `BattleLogPage` and
   `StatisticsPage` into the nav, including the `battleLogSession` state
   that links an in-progress match session to the floating Calc popup's
   opponent tray. See commit `d5003c4`.
6. **Web Settings Parity.** Wired `SettingsPage` in, excluding
   `UpdateCheckSection` entirely (`updateCheckState` made an optional prop)
   and giving `ReleaseNotesMarkdown.tsx`/`ExportTeamModal.tsx`'s
   `openExternal` calls a plain `<a target="_blank">` fallback for web.
   Deleted `WebComingSoon.tsx`, now unreferenced. See commit `9131aef`.

Every Sidebar tab now renders its real page on both desktop and web.

## What went well

- **The scoping leg's per-tab `window.electron` survey paid off directly**:
  three of the five remaining tabs (Calc, Type Matchup, Speed Tiers) turned
  out to need zero hook porting, so the milestone's actual porting surface
  was one hook (`useBattles`) plus two link-opening call sites in Settings —
  far smaller than a "port everything" assumption would have produced.
- **Splitting the nav-shell rework into its own first leg** meant every
  later leg could just wire a page into an already-generalized nav, rather
  than each leg separately extending a hand-rolled 2-button one.
- **No scope creep inside any of the five build legs** — each stayed to
  exactly what the scoping doc specified, including the two narrow
  `openExternal` fallbacks in the final leg.

## What didn't go well / friction points

- **None worth flagging.** Unlike Web Version: Teams & Box MVP (which hit a
  hosting-platform pivot and a live KV race), this milestone's scoping
  correctly predicted the actual porting cost of every remaining leg, and
  no leg needed rework or a live-discovered fix.

## Scope creep observed

- None. The `WebComingSoon.tsx` placeholder added in the Nav Shell leg was
  itself scoped as temporary scaffolding from the start (see that leg's
  `COMPLETED.md` entry) and was deleted in this milestone's final leg once
  every tab it stood in for had a real page — not a leftover to clean up
  later.

## What changes for the next milestone

- **The "survey actual dependencies before assuming a porting leg per tab"
  approach from this milestone's scoping is worth repeating** whenever a
  future desktop feature needs a web port — it's what kept this milestone
  to one real hook port instead of five.
- **No web milestone yet addresses the flagged mobile-friendliness or
  content-area padding gaps** (both noted in `TODO.md`'s Future Milestones
  section) — worth a scoping pass once product priorities call for it, not
  automatically next.
