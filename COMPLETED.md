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

## [Profile Page Sections & Layout] — Leg 3 (2026-10-18)

Previewed teams on a profile page now split into separate "Open
Teamsheets"/"Closed Teamsheets" sections (`ProfileTeamSection.tsx`, each
owning its own drag-reorder scope so a drag never crosses tiers), with a
localStorage-backed grid/list layout choice (`useProfileLayout.ts`, same
pattern as `useSidebarCollapsed.ts`) controlling whether each team's
Pokemon render as poster-style tiles (`ProfilePokemonTile.tsx`) or a denser
list (`ProfilePokemonRow.tsx`) - both mirroring `TeamPosterTile.tsx`'s
team-poster-export layout instead of the old plain text-row dump, per the
visual-style redo flagged live during Teamsheet Open/Closed Visibility
Tiers Leg 3. Two follow-up fixes landed during manual verification: the
per-Pokemon grid was capped at 3 columns inside a narrow fixed-width
column, so a wide window left most of the page empty - switched to a
`@container`-keyed grid (same pattern as `TeamCardRosterGrid.tsx`'s roster
grid) inside a wider section so it actually reaches 6 columns when there's
room, and `gameDataState`/`spriteCacheState` (already mounted app-wide)
were threaded down for real type-colored move chips/item sprites when
viewing a profile from inside the app (`utils/profileGameData.ts`,
cache-only reads - the standalone `/u/<username>` route still has neither,
by design). A third fix, found while verifying this leg: public profile
sprites were being served from a Team Pokemon's stale, never-shiny-aware
stored `spriteUrl` field instead of the live `pokedexNumber`/gender/shiny
the rest of the app actually renders from - `worker/src/spriteUrl.ts`
(hand-duplicated port of the renderer's `getPixelSpriteUrl`, same
reasoning as `safetyFilter.ts`) fixes this for both tiers. Manually
verified live. See commits 634cbfb, c142488, 04f7970.

## [Drag-to-Rearrange Previewed Teams] — Leg 2 (2026-10-18)

The profile page's team preview now has its own drag-to-reorder order,
persisted via a new `Team.profileOrder` field kept deliberately separate
from the private Teams tab's `sortOrder` - reordering one never touches
the other. `useTeams.ts`'s new `setProfileTeamOrder` stamps it only on the
dragged teams; the Worker's new `sortTeamsForProfile`
(`worker/src/publicProfile.ts`) applies it before `GET /profile/:username`
responds, so owner and visitor views agree. `ProfileCard.tsx` reuses the
existing `useGridReorder` 2D hit-test drag (same one Teams/Box already
use), gated behind a new optional `onReorderTeams` prop only wired up on
your own profile. No `TeamsDatabase` schemaVersion bump - `profileOrder` is
a plain additive optional field, same precedent as `sortOrder`/`favorite`
(only `visibility`'s old-shape migration needed a real bump). A follow-up
commit fixed a z-index stacking glitch found during manual verification:
dragging a card past a taller open-tier team (extra competitive-set
content) briefly painted it behind that team instead of on top. Manually
verified live; `/leg-review` passed clean. See commits 74e8d3e, c3ddc7c.

## [Save/Import a Team From a Profile] — Leg 1 (2026-10-18)

Added an "Import to my Teams" action on any open-teamsheet team shown on
someone else's profile (own profile and closed-teamsheet teams excluded).
`ProfileCard.tsx` renders the button; `ProfilePage.tsx` converts the
`PublicTeam`'s Pokemon into `ShowdownPokemon` (new `utils/
profileTeamImport.ts`, unit-tested) and runs them through the normal
`enrichPokemonWithAPI` -> `useTeams().addTeam()` pipeline. Manually
verified live against a real test account (`cbtestimport` - see
`feedback_champions_sp_not_gen9_evs` memory note for a demo-data mistake
caught along the way, unrelated to this leg's own code). See commit
e18f589.
