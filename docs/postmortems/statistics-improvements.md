# Post-mortem: Statistics Improvements

**Date:** 2026-09-10 (single-day, 4-leg arc). **Status:** Shipped. Full
implementation detail lives in `COMPLETED.md`'s entries for each leg below
(`git log` range `9ff455c..f5f32a5`) - this doc is the retrospective, not a
restatement.

## What shipped

Four Statistics-page changes, picked up opportunistically right after
Battle Logger Overhaul shipped, rather than pre-planned as a milestone:

1. **Selected Battle Pokémon Not Tracked** (`9ff455c`) - new per-team
   `getTeamRosterUsage`/`TeamRosterUsagePanel.tsx`, showing which of a
   team's own roster Pokémon actually get chosen vs. sit unused - a gap the
   existing global `getMostUsedPokemon`/`PokemonUsagePanel` couldn't answer
   since it wasn't scoped to one team.
2. **Remove "By Opponent" Section** (`ebe8213`) - removed the win/loss-by-
   named-opponent breakdown outright (no longer wanted), kept distinct from
   `OpponentFacedPanel` (most-faced opponent *Pokémon*), which stays.
3. **Win-Loss Column on Most-Faced Pokémon** (`4c6d195`) - added a wins/
   losses tally to `getMostFacedOpponents` (completed battles only, kept
   separate from the existing all-battle times-faced count), displayed as a
   W-L record in `OpponentFacedPanel`.
4. **Team Roster Usage Denominator Ignores Roster Changes** (`bd41f6b`) - a
   same-day bugfix to Leg 1's new `getTeamRosterUsage`: it was dividing
   every species' `broughtCount` by the team-wide `totalTeamBattles`
   instead of how many battles that species was actually on the roster
   for, so a removed species' displayed rate kept drifting downward as the
   team kept playing without it. Fixed with a per-species `battleCount`
   denominator.

## What went well

- **The new roster-usage panel's own denominator bug was caught same-day,**
  most likely via the user actually looking at the panel Leg 1 had just
  shipped - the kind of quick dogfooding loop that keeps a stat feature
  from sitting wrong for a full milestone before anyone notices.
- **The "By Opponent" removal stayed a clean subtraction.** No attempt to
  salvage or repurpose the removed breakdown's code into something else -
  it was no longer wanted, so it came out, distinct from the adjacent
  `OpponentFacedPanel` that was explicitly kept.

## What didn't go well / friction points

- **Leg 1 shipped with a real correctness bug in its core metric** (a
  per-team usage *rate*, the one number the whole panel exists to show)
  that needed a same-day follow-up fix. A quick gut-check against a team
  with a recently-removed roster member - the exact scenario the bug
  distorts - would likely have caught it before shipping the first commit.

## Scope creep observed

None accepted. Each leg stayed to its own single, narrow change (one new
panel, one section removal, one added column, one denominator fix).

## What changes for the next milestone

- For a new usage-rate/percentage metric specifically, sanity-check it
  against a case where the underlying population changes over time (a
  removed roster member, a mid-series swap) before shipping - this is the
  second milestone in a row (see Battle Logger Overhaul's unmemoized-
  derivation note) where a live-use check surfaced the real bug that a
  glance at the code wouldn't have.
