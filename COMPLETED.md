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

- **Pokepaste Format Research — Leg 1** (2026-10-17). Rumor confirmed true
  (corrected same day after an initial pass wrongly closed it as false by
  only checking Showdown's current-default client - see
  `docs/investigations/pokepaste-format-research.md`'s git history for that
  version). Showdown's new client
  (`pokemon-showdown-client` issue #2715 "New client", in public
  beta/transition, not yet default) replaced Pokepaste with its own
  first-party team database (`teams.pokemonshowdown.com`, `psim.us/t/<id>`
  links), confirmed by source diff and by a live Smogon thread where
  Showdown admin Hecate is actively iterating on the replacement flow. No
  code changed (research-only leg) - current-default client and
  `services/pokepaste.ts` still work unaffected today, but a follow-up
  scoping item (support importing the new team-link format) was added to
  `TODO.md`'s Unscheduled section.

- **Competitive Events: Tourney Tab Research — Leg 1** (2026-10-17). No
  live/structured schedule source exists for TPCi's own sanctioned/
  sponsored VGC events (GC, Regionals, Internationals, Worlds) - the
  official Play! Pokémon Event Locator is a store/venue proximity search,
  not a majors-calendar feed, and the only calendar-shaped data comes from
  unofficial fan trackers (`pokedata.ovh`, `dittobase.com`) with no
  documented public API. Falls back to a hand-maintained config file (same
  pattern as `config/championsMoveOverrides.ts`), hand-authored from
  Serebii's `playpokemon` pages under the existing exception #2
  manual-research allowance - no new `external-data-sources.md` exception
  needed. No code changed (research-only leg); see
  `docs/investigations/tourney-tab-schedule-source-research.md` and the
  updated Competitive Events: Tourney Tab UI entry in `TODO.md`'s Future
  Milestones section.

No other entries yet since the last milestone boundary.

