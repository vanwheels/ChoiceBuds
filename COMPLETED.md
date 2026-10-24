# ChoiceBuds - Completed Work Log

Archive of finished work, split out of `TODO.md` (2026-07-08) to keep the
active task list quick to scan. Newest entries first. Cross-references to
still-open items point to `TODO.md`; references to other entries here stay
local ("see below"/"see above").

- **[Missing Move/Ability Description Audit] — Leg 2** (2026-10-24)
  Enumerated every move/ability across the full Reg M-C (most inclusive)
  Champions-legal species pool via live PokeAPI data — 266 species slugs
  (1 redundant duplicate skipped), yielding 614 unique moves and 201 unique
  abilities actually offered in the app's picker panels — and checked each
  against `pokeapiService.ts`'s `extractEffectDescription` fallback
  condition. Found 52 moves currently fall back to "No description
  available" (Upper Hand and Temper Flare both confirmed among them, per
  the item's spec) and 0 abilities do, after excluding 15 moves/2 abilities
  already fixed via existing `championsMoveOverrides.ts`/
  `championsAbilityOverrides.ts` description overrides. Full list and
  methodology in
  `docs/investigations/missing-move-ability-descriptions.md`; a related
  Tera Blast movepool-correctness gap found along the way was split out as
  its own Unscheduled TODO.md item rather than folded into this leg. See
  commit <<PENDING>>.

- **[Selection Dropdown Description Truncation] — Leg 1** (2026-10-24)
  Removed the `truncate` className on the description `div` in
  `MovePickerPanel.tsx`, `AbilityPickerPanel.tsx`, and `ItemPickerPanel.tsx`
  so descriptions wrap in full instead of clipping to one line. Live-verified
  in the running app: a long move/ability/item description now wraps fully
  in all three picker dropdowns. See commit 0711d9094709e63533089c3b7338404f2bc3140e.

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
- [docs/archive/completed-2026-10-18-to-2026-10-19.md](docs/archive/completed-2026-10-18-to-2026-10-19.md)
  (the Profile Editing & Visibility Controls milestone's five legs, split
  out at the 2026-10-19 Profile Editing & Visibility Controls boundary)
- [docs/archive/completed-2026-10-19-to-2026-10-19.md](docs/archive/completed-2026-10-19-to-2026-10-19.md)
  (the Profile Social Scoping & Maintenance milestone's four legs, split
  out at the 2026-10-19 Profile Social Scoping & Maintenance boundary)
- [docs/archive/completed-2026-10-19-to-2026-10-19-maintenance-sweep.md](docs/archive/completed-2026-10-19-to-2026-10-19-maintenance-sweep.md)
  (the Maintenance Sweep: useSavedPokemon Split & Housekeeping milestone's
  three legs, split out at the 2026-10-19 Maintenance Sweep boundary -
  named with the milestone slug since it shares its date range with the
  Profile Social Scoping & Maintenance archive above)
- [docs/archive/completed-2026-10-22-to-2026-10-22.md](docs/archive/completed-2026-10-22-to-2026-10-22.md)
  (the Mega & Alt-Form Representation milestone's four legs, split out at
  the 2026-10-22 Mega & Alt-Form Representation boundary)
- [docs/archive/completed-2026-10-23-to-2026-10-23.md](docs/archive/completed-2026-10-23-to-2026-10-23.md)
  (the Type Matchup Rework milestone's three legs, split out at the
  2026-10-23 Type Matchup Rework boundary)
- [docs/archive/completed-2026-10-23-to-2026-10-23-team-editor-and-box-fixes.md](docs/archive/completed-2026-10-23-to-2026-10-23-team-editor-and-box-fixes.md)
  (the Team Editor & Box Fixes milestone's five legs, split out at the
  2026-10-23 Team Editor & Box Fixes boundary - named with the milestone
  slug since it shares its date range with the Type Matchup Rework archive
  above)
- [docs/archive/completed-2026-10-23-to-2026-10-23-ability-affects-move-indicator-scoping.md](docs/archive/completed-2026-10-23-to-2026-10-23-ability-affects-move-indicator-scoping.md)
  (the Ability-Affects-Move Indicator Scoping milestone's one leg, split out
  at the 2026-10-23 Ability-Affects-Move Indicator Scoping boundary - named
  with the milestone slug since it shares its date range with the Type
  Matchup Rework and Team Editor & Box Fixes archives above)
- [docs/archive/completed-2026-10-23-to-2026-10-23-ability-affects-move-indicator-and-type-matchup-mega-toggle.md](docs/archive/completed-2026-10-23-to-2026-10-23-ability-affects-move-indicator-and-type-matchup-mega-toggle.md)
  (the Ability-Affects-Move Indicator & Type Matchup Mega Toggle milestone's
  three legs, split out at the 2026-10-23 Ability-Affects-Move Indicator &
  Type Matchup Mega Toggle boundary - named with the milestone slug since it
  shares its date range with the Ability-Affects-Move Indicator Scoping, Type
  Matchup Rework, and Team Editor & Box Fixes archives above)
- [docs/archive/completed-2026-10-23-to-2026-10-24-search-and-filter-tag-chip-redesign.md](docs/archive/completed-2026-10-23-to-2026-10-24-search-and-filter-tag-chip-redesign.md)
  (the Search & Filter: Tag-Chip Redesign milestone's five legs, split out
  at the 2026-10-24 Search & Filter: Tag-Chip Redesign boundary)
- [docs/archive/completed-2026-10-24-to-2026-10-24-display-bug-fix-sweep.md](docs/archive/completed-2026-10-24-to-2026-10-24-display-bug-fix-sweep.md)
  (the Display Bug Fix Sweep milestone's two legs, split out at the
  2026-10-24 Display Bug Fix Sweep boundary)
