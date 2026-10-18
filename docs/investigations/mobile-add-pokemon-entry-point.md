# Mobile: No "Add Pokémon" Entry Point — Root-Cause Trace

Traced 2026-10-17 for Bug Fix & Research Sweep's Mobile Empty-Team Add
Pokémon Bug Leg 1. Reported live: on mobile web, tapping into an empty team
(no Pokémon yet) doesn't let you add one.

## Repro trace

`MobileTeamsList.tsx` opens `MobileTeamSwipeOverlay.tsx` at `initialIndex: 0`
whenever a `MobileTeamRow.tsx` is tapped, regardless of roster size.
`MobileTeamSwipeOverlay.tsx` has:

```
useEffect(() => {
  if (rosterLength === 0) onClose();
}, [rosterLength, onClose]);
...
if (rosterLength === 0) return null;
```

For an empty team this fires on the very first render: the overlay mounts,
immediately renders `null`, and the effect calls `onClose()` in the same
pass. The user sees the overlay open and instantly close, with nothing in
between - no empty state, no "Add Pokémon" affordance.

## It's bigger than the empty-team case

The empty-team bailout is just the most visible symptom. Searching the whole
mobile Teams flow (`MobileTeamRow.tsx`, `MobileTeamSwipeOverlay.tsx`,
`MobilePokemonCard.tsx`, `TeamOverflowMenu.tsx`) turns up no "add a new
Pokémon to this team" affordance at all, for *any* roster size:

- `MobilePokemonCard.tsx`'s own `AddPokemonStatTable` usage
  (`isSwapPickerOpen`/`handleSwapSelect`) only **swaps** the species already
  occupying the current slot - same `swapRoster` picker `PokemonCard.tsx`
  uses for its desktop roster-swap. It never appends a new slot.
- `TeamOverflowMenu.tsx` (Export / Export Image / Export PDF / Delete) has no
  add action either.

Desktop (`TeamCardRosterGrid.tsx`) always renders a dashed "+ Add Pokémon"
tile whenever `team.pokemon.length < 6` - true at 0 as much as at 5 - wired
to `AddPokemonStatTable` via `TeamCard.tsx`'s `handleAddSpecies`/
`handleAddSavedEntry`. Mobile has no equivalent of that tile anywhere,
because the swipe deck is a single-card-at-a-time pager, not a grid - there's
no open slot to render a tile into in the first place.

This matches the original feature's own scoping doc
(`mobile-teams-box-card-view-scope.md`), which designed the swipe deck purely
as a viewer/editor for a team's *existing* mons ("one `PokemonCard` filling
the viewport, horizontal swipe... through that team's mons") - adding a new
Pokémon from mobile was never in scope for that build. This is a scope gap
from the original feature, not a regression.

## Why this leg doesn't fix it in place

Fixing the empty-team bailout alone (e.g. render an empty state with an
"Add Pokémon" button instead of closing) would still leave non-empty mobile
teams with no way to add a 2nd-6th Pokémon. A real fix needs a design
decision on where the entry point lives in a single-card swipe-paging deck
(an extra page past the last one, a persistent header button, or an
empty-state screen specifically for the 0-roster case) before it's buildable
- that's a product call, not a one-line patch. See the follow-up item in
`TODO.md`'s Unscheduled section.
