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

## Move Profile Editing Onto the Profile Page — Leg 4 (2026-10-18)

Moved team/teamsheet-tier visibility toggles and the favorite-Pokémon
picker from Settings' `PublicProfileSection` into a new
`ProfileEditControls`, rendered by `ProfilePage` only when the viewed
username matches the signed-in account (case-insensitive). Settings now
just links to the profile page instead of duplicating the controls. Closes
out the Profile System Revamp: Foundation milestone's last done-when
criterion. See commit aaabec9.

## Teamsheet Open/Closed Visibility Tiers — Leg 3 (2026-10-18)

Replaced the binary `Team.isPublic` with a 3-state `Team.visibility`
(`'private'`/`'closed'`/`'open'`) — `closed` keeps the original
species+sprite-only exposure, `open` additionally exposes the full
competitive set (item/ability/moves/EVs/nature; no IVs field exists to
expose - this app deliberately doesn't model IVs at all, see
`services/parser.ts`'s header). `TeamsDatabase.schemaVersion` bumped to 2;
an existing `isPublic: true` team migrates to `closed`, never `open`
(widening exposure needs an explicit choice), persisted for real through
`updateTeam` - same pattern `useTeams.ts`'s gender-split-species fix
already used. `worker/src/publicProfile.ts`'s `extractPublicTeam`/
`extractPublicPokemon` expose the full set only for `open` teams.
`PublicProfileSection.tsx` swapped its per-team checkbox for a
Private/Closed/Open select; `ProfileCard.tsx` (shared by the in-app
profile page and the standalone `/u/<username>` web route) renders the
full set per Pokémon for an `open` team. Live-verified on desktop + web
after a manual `wrangler deploy` (Worker changes don't ship with the
regular web push).

`/leg-review` on the shipped commit found that `applySyncedState` never
ran incoming sync records through the same migration the load path used,
so a legacy-shaped record pulled from a not-yet-updated device could win
the merge and read back as `visibility: undefined` until this device's
next reload - fixed same-day by routing every sync-merge-sourced team
through `normalizeTeam` too (`normalizeIncomingSyncTeam`), bumping
`updatedAt` only when normalization changed something sync-relevant so
the fix can out-rank the still-stale sender on the next push. The
review's other two findings: a Worker-deploy-ordering caveat (already
covered by the project's own "Worker changes need their own manual
deploy" rule, no code to fix) and `useTeams.ts` now being further over
the 500-line hard cap, split out as its own leg (see TODO.md). See
commits faeba49, b98a4cc, e9e8a96.

## Sidebar Footer Profile Entry — Leg 2 (2026-10-18)

Pinned a profile icon+username entry above the Settings entry in both the
desktop rail and mobile drawer (`Sidebar.tsx`), opening Leg 1's in-app
`ProfilePage` for the signed-in account via `useProfileNav`. `renderNavItem`
was generalized to take an explicit `isActive`/key pair instead of deriving
it from `ActiveTab`, so this entry can reuse the same row styling/active-
highlight/collapsed-tooltip the tab items already have. Hidden entirely
when signed out (`syncUsername` is null) - on web that leaves the sidebar's
existing `renderFooter` sign-in prompt as the only footer content, same as
before this leg. See commit 258dcf0.

## In-App Profile Page & Navigation Shell — Leg 1 (2026-10-18)

Added an in-app profile page reachable from any tab in both `App.tsx` and
`AppWeb.tsx`, via a `useProfileNav` back-stack layered on top of
`ActiveTab` rather than a router rewrite - opening a profile never changes
`activeTab`, so "Back" just pops the stack and the underlying tab
reappears untouched. The fetch/render logic (`usePublicProfile`/
`ProfileCard`) is shared with the standalone `/u/<username>` route, which
stays as-is for signed-out visitors. Settings' existing `/u/<username>`
link now opens the profile in-app instead of a new tab; its own username
lookup box (on the profile page itself) opens any other account's profile
the same way, pushing a second stack entry. See commit 80ded0e.
