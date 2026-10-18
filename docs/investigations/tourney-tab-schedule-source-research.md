# Tourney Tab: Schedule Source Research

Research pass for Competitive Events: Tourney Tab Research — Leg 1 (Bug Fix
& Research Sweep milestone). Question: is there a live/structured schedule
source for TPCi's own sanctioned/sponsored VGC events (Global Challenge
online events, Regionals, Internationals, Worlds — not freeform
user-created events), or does the Tourney Tab need a hand-maintained config
instead?

## What exists

- **Official Play! Pokémon Event Locator** (`play.pokemon.com`, also a
  dedicated "Play! Pokémon Access" mobile app). This is a store/venue
  *locator* — search by postal code + radius, filterable by game (VGC/TCG/
  GO/UNITE) — built to help players find a nearby League/Cup/Regional, not
  a calendar feed of the majors circuit. No documented public API; an
  OutSystems case study on TPCi's build of a related "event locator" only
  confirms it's powered by an internal "event API," with no mention of
  external/public access. Not useful even if it did expose an API: it's
  shaped for "events near me," not "list all Regionals/Internationals/
  Worlds this season."
- **Fan-run trackers**: `pokedata.ovh` (scrapes the official locator every
  30 min; offers tables/map/Discord notifications, no documented public
  JSON endpoint) and `dittobase.com` (browsable season archive back to
  2016, explicitly "an independent platform," no documented public API
  either). Both are unofficial, undocumented, third-party scrapers with no
  stated reliability/longevity guarantees — not something to build a live
  runtime dependency on.
- **Serebii's `playpokemon/<year>.shtml` / `<year>/vgc.shtml` pages** —
  already an approved manual-research source under
  `external-data-sources.md` exception #2. These are well-structured,
  actively maintained per-season pages (event name, city, country, dates)
  that read cleanly for hand-authoring a config, same shape as the
  Champions balance-override files already sourced from Serebii.

## Decision

No live/structured schedule source exists — the only "official" tool is a
store locator, not a majors-calendar feed, and the only structured
calendar-shaped data comes from unofficial fan trackers with no documented
API and no reliability guarantee. **Fall back to a hand-maintained config
file**, same pattern as `config/championsMoveOverrides.ts`: a static
TypeScript table (event name, tier, city/country, dates, signup-deadline
where known) hand-authored and periodically refreshed from Serebii's
`playpokemon` pages (exception #2 — manual research only, never a live
fetch) and cross-checked against `play.pokemon.com`'s own season
announcements when available.

No new numbered exception is needed in `external-data-sources.md` — this
reuses exception #2's existing manual-research allowance rather than adding
a new runtime fetch. Building the actual config file and Tourney Tab UI is
scoped separately as **Competitive Events: Tourney Tab UI** (Future
Milestones, unscheduled) — this leg only resolves the source question.

## Refresh cadence

Not a live feed, so it goes stale. Treat it like the Champions
balance-override files: a living document, re-checked each time a new
season's dates are announced (TPCi typically announces a season's Regionals/
Internationals schedule in batches, with Worlds dates fixed well in
advance) rather than on any fixed calendar interval.
