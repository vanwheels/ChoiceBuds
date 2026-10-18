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

## Bug Fix & Research Sweep

- **Mobile Empty-Team Add Pokémon Bug — Leg 1** (2026-10-17). Reproduced:
  `MobileTeamSwipeOverlay.tsx` bails out and auto-closes the instant a
  tapped team's roster is empty, instead of showing anything. Root cause
  traced further than the empty-team case alone - mobile's whole swipe-card
  flow has no "add a new Pokémon" affordance at all, only species-swap for
  an existing slot - a scope gap from the original
  Full-Screen Swipeable Pokémon Card feature, not a regression. No code
  changed (research/root-cause leg); see
  `docs/investigations/mobile-add-pokemon-entry-point.md` and the new
  Mobile Teams: Add Pokémon Entry Point follow-up item in `TODO.md`'s
  Unscheduled section. See commit `1300426`.

- **Pokepaste Format Research — Leg 1** (2026-10-17). Rumor closed as
  false: Showdown's own client repo has an actively-maintained "Pokepaste
  Button" (VGC OTS natures fix, `pokemon-showdown-client` PR #2741, merged
  2026-10-02 - two weeks before this check), and no deprecation discussion
  turned up in Smogon forums or either `pokemon-showdown`/
  `pokemon-showdown-client` repo. No code changed (research-only leg); see
  `docs/investigations/pokepaste-format-research.md` for the full citation
  trail. `services/pokepaste.ts` and the `external-data-sources.md`
  exceptions covering it stay as-is.

No other entries yet since the last milestone boundary.

