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
- [docs/archive/completed-2026-10-17-to-2026-10-17.md](docs/archive/completed-2026-10-17-to-2026-10-17.md)
  (the Bug Fix & Small Features Sweep milestone's five legs, split out at
  the 2026-10-17 Bug Fix & Small Features Sweep boundary)
- [docs/archive/completed-2026-10-17-to-2026-10-17-mobile-web-ui-polish.md](docs/archive/completed-2026-10-17-to-2026-10-17-mobile-web-ui-polish.md)
  (the Mobile Web & UI Polish milestone's four legs, split out at the
  2026-10-17 Mobile Web & UI Polish boundary - named with the milestone slug
  since it shares its date range with the Bug Fix & Small Features Sweep
  archive above)
- [docs/archive/completed-2026-10-17-to-2026-10-17-bug-fix-research-sweep.md](docs/archive/completed-2026-10-17-to-2026-10-17-bug-fix-research-sweep.md)
  (the Bug Fix & Research Sweep milestone's three legs, split out at the
  2026-10-17 Bug Fix & Research Sweep boundary - named with the milestone
  slug since it shares its date range with the Mobile Web & UI Polish
  archive above)
- [docs/archive/completed-2026-10-17-to-2026-10-17-mobile-teams-and-tourney-tab.md](docs/archive/completed-2026-10-17-to-2026-10-17-mobile-teams-and-tourney-tab.md)
  (the Mobile Teams & Tourney Tab milestone's three legs, split out at the
  2026-10-17 Mobile Teams & Tourney Tab boundary - named with the milestone
  slug since it shares its date range with the Bug Fix & Research Sweep
  archive above)
- [docs/archive/completed-2026-10-17-to-2026-10-17-public-profiles-and-team-sharing.md](docs/archive/completed-2026-10-17-to-2026-10-17-public-profiles-and-team-sharing.md)
  (the Public Profiles & Team Sharing milestone's four legs, split out at
  the 2026-10-17 Public Profiles & Team Sharing boundary - named with the
  milestone slug since it shares its date range with the Mobile Teams &
  Tourney Tab archive above)
- [docs/archive/completed-2026-10-18-to-2026-10-18-scoping-sweep.md](docs/archive/completed-2026-10-18-to-2026-10-18-scoping-sweep.md)
  (the Scoping Sweep milestone's three legs, split out at the 2026-10-18
  Scoping Sweep boundary)
- [docs/archive/completed-2026-10-18-to-2026-10-18-profile-system-revamp-foundation.md](docs/archive/completed-2026-10-18-to-2026-10-18-profile-system-revamp-foundation.md)
  (the Profile System Revamp: Foundation milestone's four legs, split out
  at the 2026-10-18 Profile System Revamp: Foundation boundary - named
  with the milestone slug since it shares its date range with the Scoping
  Sweep archive above)
- [docs/archive/completed-2026-10-18-to-2026-10-18-profile-system-revamp-previews-and-import.md](docs/archive/completed-2026-10-18-to-2026-10-18-profile-system-revamp-previews-and-import.md)
  (the Profile System Revamp: Previews & Import milestone's five legs,
  split out at the 2026-10-18 Profile System Revamp: Previews & Import
  boundary - named with the milestone slug since it shares its date range
  with the Profile System Revamp: Foundation and Scoping Sweep archives
  above)

## [Profile Section Remove-Team Control] — Leg 5 (2026-10-19)

A small "×" on each `ProfileTeamCard.tsx` header now takes a team back out
of its Open/Closed section (sets `visibility: 'private'` via the normal
`updateTeam` path) - the one way left to do that from the profile page
itself after Leg 4 removed the old per-team visibility dropdown. Redesigned
mid-leg, twice, off live feedback: first to drop the Edit toggle entirely
(gating "×"/"+ Team"/favorite-Pokemon editing behind it put the page out of
step with the rest of the app's always-on-editing convention) and move
favorite-Pokemon editing into a `Modal.tsx` popup opened by clicking the
sprite; then to fix two bugs the redesign surfaced - the popup's search
results list was an absolutely-positioned dropdown that `Modal.tsx`'s
`overflow-hidden` panel silently clipped (now in-flow, with the current
favorite shown above the search box), and `ProfileCard.tsx`'s section
resync was keyed off a team list that included client-synthesized "+ Team"
stand-ins, so any first-time add was resetting straight back to the stale
fetch and resurrecting teams removed earlier in the same session (now keyed
off the real fetched teams only). Also folds in the former Leg 6 ("Profile
Add-Team Picker: Live Section Refresh"): a new `utils/
publicTeamSynthesis.ts::synthesizePublicTeam` (mirroring `worker/src/
publicProfile.ts::extractPublicTeam`, with its own unit test) builds a
client-side stand-in for a team with no real `PublicTeam` yet, so "+ Team"
shows its pick immediately instead of needing a reload - the same gap that
made the always-visible "+ Team" button's first version look broken.
Completes this milestone's "Done when" criteria. Full suite (875 tests),
lint, and type-check all pass. Manually verified live (all three follow-up
fixes confirmed in the same pass). See commits c1bafe2..c82dab9.

## [Profile Edit Mode: Inline Favorite Pokemon Editing] — Leg 4 (2026-10-18)

`ProfileEditControls.tsx`'s always-visible panel (team visibility dropdowns
+ a permanently-shown species search box for the favorite Pokemon) is now
an explicit "Edit" toggle on the profile page (own profile only) instead,
with the favorite Pokemon editable by clicking directly on its own sprite
rather than a separate search box below it. Widened mid-leg per live
feedback: the per-team visibility `<select>` list was removed outright
(redundant now that visibility is settable from the Teams tab's own
`TeamVisibilityBadge`, the section "+ Team" picker, and cross-section drag)
rather than just hidden behind the toggle, and the duplicate
favorite-Pokemon editor box was deleted entirely - `ProfileEditControls.tsx`
is gone, replaced by `FavoritePokemonEditor.tsx`, which renders directly
inside `ProfileCard.tsx`'s own favorite-Pokemon display (the same box
everyone sees) via a new optional `favoriteEditing` prop, so there's
exactly one favorite-Pokemon UI element instead of two. Full suite (872
tests), lint, and type-check all pass. Manually verified live. See commit
bf5e69f.

## [Teams Page Profile-Visibility Indicator] — Leg 3 (2026-10-18)

The Teams tab now shows and controls each team's public-profile visibility
tier directly, instead of that only being reachable from the profile
page's own `ProfileEditControls.tsx`. A new `TeamVisibilityBadge.tsx`
mirrors `RegulationBadge.tsx`'s clickable-badge-plus-dropdown shape exactly
(backed by a new `TEAM_VISIBILITY_THEMES` table in `pokemonTheme.ts` -
private/closed/open get their own badge colors), rendered next to the
regulation badge in `TeamCardHeader.tsx`'s identity column and wired
through `TeamCard.tsx` to the same `updateTeam(team.id, { visibility })`
call `ProfileEditControls.tsx` already uses. The badge always renders,
including for Private teams, so the Teams tab reflects current visibility
at a glance rather than only once a team is already public. Scoped to
desktop per the TODO item's own file list (`TeamsPage.tsx`/`TeamCard.tsx`)
- `MobileTeamRow.tsx`'s compact row wasn't touched. Manually verified
live. See commit <hash>.

## [Profile Section Drag-and-Drop Between Open/Closed] — Leg 2 (2026-10-18)

Dragging a team card across the Open/Closed boundary on your own profile
page now flips its `visibility` tier and persists through `updateTeam`,
instead of the drag being confined to its starting section.
`ProfileTeamSection.tsx` no longer owns its own reorder state - a new
`useCrossTierReorder.ts` hook (useGridReorder-adjacent, reuses its pure
`pickSlotIndex`/`moveToIndex`) lives in `ProfileCard.tsx` and coordinates
both sections' ordered-id arrays at once, since a cross-section move has to
remove an id from one array and append it to the other. Crossing sections
appends at the end of the destination (no slot hit-testing against a tier
the dragged card was never snapshotted against) and commits through the
same `onAddTeamToTier`/`onReorderTeams` props the "+ Team" picker and
intra-section reorder already used - no new props needed. The destination
section overrides the rendered card's `visibility` to match its tier
immediately, so detail level (full set vs. sprites-only) flips on drop
rather than waiting on the next profile refetch. New
`useCrossTierReorder.test.ts` covers the hook's pure cross-tier logic
(`pointInRect`/`moveToOtherTier`), same pattern as `useGridReorder.test.ts`.
Manually verified live against the `cbtestimport` test account (not real
data - see `feedback_use_test_account_for_profile_verification` memory,
added after an early verification pass mistakenly dragged real teams on the
`vanny` account before catching the mistake and redoing it correctly). See
commit <hash>.

## [Profile Section Add-Team Picker] — Leg 1 (2026-10-18)

Each Open/Closed teamsheet section (`ProfileTeamSection.tsx`) now gets a
"+ Team" box at the bottom; clicking it opens `AddTeamToProfileDialog.tsx`,
a scrollable picker of local teams not already in that tier (filtered from
`teamsState.teams`, not the synced/lagging `profile.teams` the rest of the
page renders from - same reasoning as `ProfileEditControls.tsx`'s own
visibility dropdowns), each row showing a sprite strip + team name.
Picking one persists through the normal `updateTeam` path. `ProfileCard.tsx`
threads `localTeams`/`onAddTeamToTier` down the same isOwnProfile-only gate
as `onReorderTeams`/`onImportTeam`. A self-contained sprite-strip
computation (not factored into a shared util - a third narrow use, not a
second) rather than reusing `MobileTeamRow.tsx` directly, since that
component's interactive chrome (overflow menu, favorite star, regulation
badge editing, swipe-overlay open) doesn't belong in a picker row. Sized
like `CalcSavedSetsModal.tsx`'s own pick-from-list modal
(`max-w-2xl max-h-[85vh]`) rather than `AddToTeamDialog.tsx`'s compact
`max-w-sm`, after manual verification caught the smaller size both
truncating long team names incorrectly (a stray `shrink-0` cancelling out
`truncate`) and rendering sprites too small - also bumped from `w-6 h-6` to
`w-10 h-10`, matching `VgcPasteCatalogRow.tsx`'s own picker-row sprite
size. Manually verified live.
