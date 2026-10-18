# Completed — Bug Fix & Research Sweep (2026-10-17 to 2026-10-17)

Archived out of `COMPLETED.md` at the Bug Fix & Research Sweep milestone
boundary (2026-10-17). See
[docs/postmortems/bug-fix-research-sweep.md](../postmortems/bug-fix-research-sweep.md)
for the retrospective.

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
