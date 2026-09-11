# Post-mortem: Team Management QoL

**Date:** 2026-09-10 (single-day, 3-item arc). **Status:** Shipped. Full
implementation detail lives in `COMPLETED.md`'s entries for each item below
(`git log` range `c09b6cb..0228220`) - this doc is the retrospective, not a
restatement.

## What shipped

Three independent quality-of-life items, scoped together in one pass right
after Statistics Improvements shipped:

1. **Favorite Teams** (`111bf56`) - a persisted `favorite` flag on `Team`,
   sorting favorited teams to the top of the Teams page.
2. **Quick Copy/Paste Pokémon & Teams via Right-Click**, two legs:
   - Leg 1 (`28ea9ab`) - right-click copy/paste on team and Pokémon cards,
     using an internal-JSON clipboard format for a lossless round-trip.
   - Leg 2 (`7935ee5`) - extended paste to empty space on the Teams page and
     a team card's roster grid (not just onto an existing card), and fixed
     a pasted team keeping the source's exact name/`favorite` flag.
3. **Saved Builds Database for Team-Building**, two legs:
   - Leg 1 (`b58c9f1`) - Roster Swap's species picker offers a saved-build
     choice when the picked species has 1+ saved sets.
   - Leg 2 (`0228220`) - `ImportTeamModal.tsx` offers the same choice per
     parsed Pokémon instance during a fresh team import, via a new review
     step.

## What went well

- **Splitting scoping from building held for all three items.** Each item's
  design pass finished as its own session before any implementation
  started (see the `docs: scope ...` commits ahead of each `feat:` commit),
  matching the user's standing preference - no item quietly grew scope
  mid-build.
- **Leg 2 of Saved Builds reused Leg 1's precedent directly** (full-replace
  semantics via `cloneSavedPokemon`, now shared in `utils/clonePokemon.ts`)
  rather than inventing a new merge rule for the import-flow case, keeping
  the two entry points behaviorally consistent.

## What didn't go well / friction points

- **Quick Copy/Paste needed a same-day Leg 2** because Leg 1 shipped with a
  narrower paste target (only an existing card) than what the direct user
  report actually wanted (anywhere in a team's empty space). A quick check
  of "where would a user actually try to paste" during Leg 1's scoping
  might have caught the gap before shipping.

## Scope creep observed

None accepted mid-leg. Saved Builds Leg 2 flagged one open design question
in its own TODO entry (a picked saved build's nickname/shiny/level fully
overriding the pasted instance's own, rather than a per-field merge) but
went with the existing Leg 1 precedent instead of expanding scope to invent
a merge rule.

## What changes for the next milestone

- For a right-click/context-menu feature specifically, scope the *targets*
  (which elements/empty-space regions are valid drop/paste zones) as
  explicitly as the action itself - Quick Copy/Paste's Leg 1→Leg 2 gap was
  exactly this kind of miss, not a logic bug.
