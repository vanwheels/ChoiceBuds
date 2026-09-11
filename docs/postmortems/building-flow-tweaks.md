# Post-mortem: Building Flow Tweaks

**Date:** 2026-09-11. **Status:** Shipped. Full implementation detail lives
in `COMPLETED.md`'s entries for each leg (`git log` range
`92adc3e..8f0bb5d`) - this doc is the retrospective, not a restatement.

## What shipped

A short, fast-moving milestone (~1 hour of commits) picking up small
Team/Box-building-flow items straight off the back of Saved Builds Box, plus
a 3-leg feature (Mega form rows) scoped mid-milestone:

1. **Box Tab: Favoriting** (`92adc3e`) - gold-star favoriting for Box
   entries, mirroring `Team.favorite`.
2. **TeamCard Add-Pokémon: No Species-Clause Dedupe** (`47b709e`) - blocked
   adding a species already on the team from either Add-Pokémon path.
3. **Add Pokémon: Sortable Base-Stat Table, Leg 1** (`8885115`, same-day fix
   `e9ac3b6`) - new sortable stat table replacing `SpeciesPickerCard` in
   `TeamCard.tsx`'s Add Pokémon flow.
4. **Add Pokémon Table: Mega Form Rows, Leg 1** (`27c0f53`) - scoping pass.
5. **Add Pokémon: Sortable Base-Stat Table, Leg 2** (`b90945b`) - wired the
   same table into `BoxPage.tsx`'s "+ New Build" flow.
6. **Add Pokémon Table: Mega Form Rows, Leg 2** (`af72939`) - core Mega rows.
7. **Add Pokémon Table: Type/Ability Columns** (`a64cc77`) - Types/Abilities
   columns added to the new stat table.
8. **Team Card Padding at Certain Window Sizes** (`d9fdc4d`) - retuned a
   stale 2-column grid breakpoint.
9. **Add Pokémon Table: Mega Form Rows, Leg 3** (`8f0bb5d`) - `#mega` tag
   with own-data type/ability matching, closing that item.

## What went well

- **Reuse held across three separate legs.** Favoriting mirrored
  `Team.favorite`'s existing data/sort/UI pattern directly; the TeamCard
  dedupe fix reused the same filtering shape as an earlier Battle Logger
  fix; Mega Form Rows Leg 1's scoping pass found `@smogon/calc`'s already-
  bundled dex covered every Mega form's stats/types, overturning the item's
  own "blocked on PokeAPI" note instead of hand-typing new data.
- **Scoping-then-building held for both multi-leg items.** Both Sortable
  Base-Stat Table and Mega Form Rows got a scoping-only leg (or an
  `AskUserQuestion` resolution, for Mega Form Rows) before implementation
  started, consistent with the split-scoping-from-building preference.

## What didn't go well / friction points

- **The `#tag` chain regression recurred immediately.** Saved Builds Box's
  very last leg (Box Tab Search, `74a5e3e`, 12:44) explicitly ported
  `SpeciesPickerCard.tsx`'s `#tag` type/move/ability chain "verbatim" into a
  new surface specifically to avoid dropping it. ~30 minutes later, Sortable
  Base-Stat Table Leg 1 (`8885115`, 13:13) replaced `SpeciesPickerCard` in a
  different Add-Pokémon surface and dropped that same chain, caught live by
  the user testing `#fire #drought #tailwind` and fixed same-day
  (`e9ac3b6`, 13:17). Two consecutive component-replacement legs, in two
  consecutive milestones, missed the same existing feature before a same-day
  fix caught it.
- **Team Card Padding was itself a regression from an earlier milestone's
  leg** (Team Header Sprite Strip widening the header without its
  2-column breakpoint being re-tuned) - not caught until a user report this
  milestone, and not something this milestone's own work touched directly.

## Scope creep observed

None within this milestone's own items - Mega Form Rows grew from a single
candidate into 3 legs during its own scoping pass (per its Leg 1 entry), but
that was the scoping pass doing its job, not creep discovered after a leg
was already called done.

## What changes for the next milestone

- **When replacing a component that has a `#tag` search chain, check for
  that chain explicitly before calling the leg done** - it's now been
  dropped and same-day-fixed at least twice (Sortable Base-Stat Table here;
  see this milestone's friction section). A one-line checklist item
  ("does the component being replaced have `#tag` search? if so, port it")
  would have caught this on the first pass instead of needing a live-testing
  catch.
- **This milestone ran without an upfront name/scope** - "Building Flow
  Tweaks" was flagged as a placeholder in `TODO.md` at promotion time and
  never renamed. Not a real problem here since the milestone was short and
  the items were already individually scoped, but worth naming milestones
  with actual intent up front when there's time to, rather than defaulting
  to a placeholder.
