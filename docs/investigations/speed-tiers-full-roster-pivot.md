# Speed Tiers Full-Regulation Roster Pivot

Follow-up notes from Vanny 2026-09-09, after the Team Preview Strip (Leg 5)
shipped. Two complaints, one root cause:

1. The icon-grid rework (Leg 4, see [speed-tiers-layout-rework.md](speed-tiers-layout-rework.md))
   was supposed to fix the "vertical mess" but visually hadn't - this is the
   second time it's been raised.
2. The threat set shouldn't be just team-anchored threats (Team Gap
   Analysis's `computeUsageThreats`) - it should be every Pokemon legal in
   the regulation. A toggle to narrow to the top 60/120 by ladder usage is
   fine, but defaulting to a filtered view is wrong: a specific team member
   often needs to answer a specific matchup's speed, not the team's overall
   weaknesses, so hiding "lesser" threats by default hides real, useful
   information behind a theoretical-relevance filter.

## Root cause of the "vertical mess" (diagnosed, not just asserted)

`speedTierList.ts::buildSpeedTierEntries` gives each usage threat its own
handful of ranked-spread rows (per `ChampionsUsageEntry.statSpreads` above
the usage-% floor) plus 3 fixed min/neutral/max bound rows -
`speedTiers.ts::computeThreatSpeedProfile`. Both are genuinely
species-specific numbers (a spread is one real, ranked EV/nature choice; a
bound is that species' own base Speed run through a fixed SP/nature
formula), so with only ~10-20 team-anchored threats in play, almost every
row lands on its own distinct Speed value - `groupSpeedTiers` produces
mostly singleton groups. The icon-grid rework (Leg 4) was a real
improvement to how one group renders, but it couldn't fix a data shape that
rarely produces a group with more than one entry to begin with. That's
`SpeedTierList.tsx`'s header dimming bound rows was already correct, the
underlying merge just didn't generate enough real ties for the grid layout
to matter.

vgcmulticalc's own speed tier list ties heavily because it's a small,
fixed set of reference tiers (e.g. 0/31/hindering, 252/31/neutral, 252/31/
positive) applied to every Pokemon's *base* Speed - many real species share
a base Speed value, so those bounds genuinely cluster. Pivoting to "every
regulation-legal species" (this doc) recreates that same clustering as a
side effect of the data model, not a separate CSS fix - most of a full
roster's entries are bound-only (no usage data), and species sharing a base
Speed stat land on identical bound values.

## Resolution

- **Data source**: every species in the selected team's own regulation
  (`useSpeciesRoster`'s full national-dex roster, filtered by
  `validateSpeciesLegality(name, toRegulationId(selectedTeam.format))` -
  same mechanism `useInitialSync`/`SpeciesPickerCard` already use), not
  `usageThreats.ts::computeUsageThreats`. Team Gap Analysis's typing-based
  threat filtering is dropped from this view entirely, not just
  de-prioritized - see TODO.md for the deferred "threats only" toggle.
- **Usage data's new role**: purely a ranking/filter, not the defining data
  source. A species with a `ChampionsUsageEntry` still gets its ranked
  spread rows (unchanged, still gated by `SPREAD_USAGE_CUTOFF_PERCENT`) and
  its `columnPosition` feeds an optional page-level "All / Top 60 / Top 120"
  toggle (default **All**). A species with no usage data at all only
  appears under "All" (nothing to rank it by under the other two).
- **Ability for usage-less species**: `computeThreatSpeedProfile` no longer
  requires a full `ChampionsUsageEntry` (see its new `ThreatSpeedInput` -
  `species`/`ability`/`usage: ChampionsUsageEntry | null`). A species with
  usage data still uses its real top-ranked ability
  (`usage.abilities[0].name`); one without falls back to its own default
  ability from the roster cache (`PokeAPICacheEntry.abilities[0]`, converted
  through `toReadableName` since that field is a lowercase PokeAPI slug, not
  a display name). This is an implementation default, not a design call -
  the first PokeAPI-listed ability isn't necessarily the "correct" one for a
  multi-ability species, but there's no ranked signal to prefer one over
  another absent real usage data.

## Not addressed here

- Performance of rendering a full regulation roster (several hundred
  species × up to ~4 rows each) wasn't load-tested - flagged as a watch
  item, not gated on. Revisit (virtualization, or a lazier per-scope
  render) only if it's actually slow live.
- The deferred "threats only" toggle (Team Gap Analysis-style typing filter,
  as an option alongside All/Top 60/Top 120) - explicitly a later,
  unscoped addition per Vanny's own note.

## Prior art

- [speed-calc-scope.md](speed-calc-scope.md) - the milestone's original
  scoping pass. Its "team-anchored threat list ... not a vgcmulticalc
  reskin" differentiation call is the decision this pivot reverses for the
  default view; usage data staying Champions-native (not a Showdown-ladder
  reskin) is unaffected.
- [speed-tiers-layout-rework.md](speed-tiers-layout-rework.md) - the icon
  grid render this pivot's data-model change now actually produces ties for.
