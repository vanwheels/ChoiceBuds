# ChoiceBuds - Completed Work Archive (2026-10-17 to 2026-10-17, Mobile Web & UI Polish)

Archived from `COMPLETED.md` at the 2026-10-17 Mobile Web & UI Polish
milestone boundary. Newest entries first.

**[Team Picker Sprites: Shared Component + Adoption] — Legs 3-4** (2026-10-17)
New `TeamPickerDropdown.tsx` (searchable, sprite-per-row, same pattern as
`AbilityPickerPanel.tsx`/`ItemPickerPanel.tsx`) replaces the plain native
`<select>` previously duplicated across `CalcTeamTray.tsx`,
`SpeedTiersPage.tsx`, `TypeMatchupPage.tsx`, and `RecordMatchForm.tsx` -
those couldn't show sprites inline, so species recognition required opening
the team first. Verified live on all 4 sites via `run-desktop`, including
`CalcTeamTray`'s own separate click/drag-to-load sprite row underneath the
dropdown and its live sync with `RecordMatchForm`'s picker through the
existing Battle Log session integration. See commit 661e7e9.

**[Download App Sidebar Link Visibility] — Leg 2** (2026-10-17)
`AppWeb.tsx`'s sidebar footer "Get the desktop app" link became a solid
accent-gold button with a new `DownloadIcon` (`SidebarIcons.tsx`), moved
above the Settings nav item per live feedback, and shortened to "Desktop
App" to stop it wrapping onto a second line. The reorder in `Sidebar.tsx`
(`renderFooter` now renders before `BOTTOM_NAV_ITEMS`, whichever block
comes first gets `mt-auto`) applies to both the desktop rail and mobile
drawer, and falls back correctly when no `renderFooter` is passed (App.tsx's
desktop sidebar). Verified live. See commit 66650cd.

**[Mobile Web Content-Area Padding Fix] — Leg 1** (2026-10-17)
Battle Log, Statistics, Type Matchup, Speed Tiers, and Settings (plus
`RecordMatchForm`'s in-place record/edit view, part of the same Battle Log
tab) each gained their own `px-4 md:px-0` on their root container, matching
`TeamsPage.tsx`'s existing pattern so `AppWeb.tsx`'s unpadded mobile `<main>`
no longer leaves them edge-to-edge below `md`. Verified live on
`dev:mobile`. See commit 0ef6aaa.
