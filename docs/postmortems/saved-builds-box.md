# Post-mortem: Saved Builds Box

**Date:** 2026-09-10 to 2026-09-11. **Status:** Shipped. Full implementation
detail lives in `COMPLETED.md`'s entries for each leg (`git log` range
`7120edd^..74a5e3e`) - this doc is the retrospective, not a restatement.

## What shipped

Eight legs giving the saved-build library (Saved Builds Database for
Team-Building - see prior milestone) a discoverable home outside the Calc
page, plus real two-way movement between it and Teams:

1. **Leg 1** (`7120edd`) - new Box sidebar tab, `BoxCard.tsx` collapsed/
   expanded browsing.
2. **Leg 2** (`e3de643`) - "+ New Build" creation flow.
3. **Leg 3** (`07ea74e`) - rename/duplicate/delete via right-click context
   menu, closing the entry-management gap Leg 1 found but didn't fix.
4. **Leg 4** (`10c1a41`, `f6b4b83`) - "Add to Team…" from Box, then a
   same-day follow-up covering the reverse direction (a "From Box" section
   in `SpeciesPickerCard.tsx`'s own "+ Add Pokémon" search).
5. **Leg 5** (`d22da94`) - right-click "Paste Pokémon"/"Paste Showdown Text"
   at the grid level.
6. **Leg 6** (`f4d8d29`) - "Copy Pokémon"/"Export" added to the context menu.
7. **Leg 7** (`2ea5446`) - Alphabetical/Custom sort-mode toggle with
   drag-to-reorder.
8. **Leg 8** (`74a5e3e`) - text search, full `#tag`-chain support ported
   from `SpeciesPickerCard.tsx`.

## What went well

- **Splitting scoping from building held for the legs that needed it.**
  Leg 7 (reorder) and Leg 8 (search) both got their own scoping-only pass
  before any implementation started, matching the user's standing
  preference - the search leg in particular landed exactly as scoped, with
  no mid-build surprises.
- **Reuse over reinvention, twice.** Leg 4's team-side clone reused
  `cloneSavedPokemon` (already shared via `utils/clonePokemon.ts`), and
  Leg 8's search ported `SpeciesPickerCard.tsx`'s `#tag` chain verbatim
  rather than writing a second implementation of the same behavior.

## What didn't go well / friction points

- **The original 3-leg scope undercounted the real ask.** A second
  direct-feedback pass on 2026-09-10 - after Legs 1-3 were already
  underway/shipped - added Legs 4-8 (move-to-team, duplicate, reorder,
  search) because the first scoping pass treated "browse and edit" as the
  whole problem when "Box is a dead end relative to Teams" was the actual
  complaint. Flagged as a meaningful size increase when it happened, but
  it still meant re-scoping mid-milestone instead of catching the full
  shape upfront.
- **Leg 4 needed a same-day follow-up** for the same reason Quick
  Copy/Paste did in the prior milestone: the first pass covered
  Box → Team but not Team → Box, and a direct feedback comment caught the
  gap before the leg was called done.

## Scope creep observed

One want (favoriting) surfaced during Leg 7's scoping pass but wasn't part
of the original ask. Correctly split into its own Unscheduled TODO item
(`Box Tab: Favoriting`) rather than folded into Leg 7's build - it has its
own data field, its own toggle UI, and its own sort behavior, so it didn't
belong riding along inside another leg's scope.

## What changes for the next milestone

- When a feature request names a *relationship* between two existing
  surfaces ("Box relative to Teams"), scope both directions of that
  relationship explicitly up front rather than shipping one direction and
  waiting for feedback to surface the other - this is the second milestone
  in a row (after Team Management QoL's Quick Copy/Paste) where a
  same-day Leg N→Leg N+1 gap was exactly this kind of miss.
