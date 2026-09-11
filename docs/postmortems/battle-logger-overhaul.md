# Post-mortem: Battle Logger Overhaul

**Date:** 2026-09-10 (single-day, 4-leg arc). **Status:** Shipped. Full
implementation detail lives in `COMPLETED.md`'s entries for each leg below
(`git log` range `2c62371..6dc00bf`) - this doc is the retrospective, not a
restatement.

## What shipped

Four Battle Logger fixes/features, picked up opportunistically rather than
pre-planned as a milestone:

1. **Battle Logger: Maushold Missing From Opponent Selection** (`ca7eeac`) -
   `utils/pokemonRules.ts`'s legality list only had the bare `maushold` slug,
   but PokeAPI models it as `maushold-family-of-four`/`-three` varieties
   only, so `validateSpeciesLegality` rejected both real roster entries and
   filtered Maushold out of the opponent picker entirely.
2. **Battle Logger: Edit Saved Battle** (`8d7707a`) - `RecordMatchForm` now
   doubles as the edit form for an already-saved battle via a new
   `editingBattle` prop and Edit button on `PastBattlesList`, saving through
   `updateBattle` instead of `addBattle`. Team/date/set are locked in edit
   mode since `Battle.playerRoster` is a point-in-time snapshot, not a live
   reference.
3. **Battle Logger: Selection UI Improvements** (`2b97738`, `0d9a3d1`) -
   added `Battle.opponentBroughtIds` and a shared `BroughtToggleTile`
   component so both player and opponent brought-4 pickers read as a group
   at a glance. Live-checking the change surfaced a real, unrelated data
   corruption bug: `playerRoster` was re-derived impurely every render via
   `snapshotRoster(team)` (minting fresh UUIDs each call), so no tile ever
   actually matched its own just-clicked id and `broughtIds` never lit up
   visually. Confirmed against the user's real `battles.json`: all 8
   pre-fix battles had 0/4 `broughtIds` matching their own persisted
   `playerRoster` - backed up and manually cleared to `[]` on the user's
   machine (a data fix, not a code change) rather than left silently wrong.
4. **Battle Logger: Duplicate Pokémon Selectable** (`b55fbf4`) - the
   opponent "+ Add Pokemon" picker had no dedupe against `opponentRoster`,
   allowing the same species to be added twice and both marked brought -
   double-counting one Pokemon in a slot no legal (Species Clause) team
   could actually field. Fixed by filtering the picker's roster down to
   species not already present.

## What went well

- **Live-checking a UI fix caught a real data-corruption bug that a purely
  visual read would have missed.** Leg 3's checkmark not appearing looked
  like a styling issue at first; tracing it to unmemoized `crypto.randomUUID()`
  regeneration on every render surfaced that 100% of existing battle records
  had a broken brought-4 link - a much bigger problem than the UI polish
  task it started as.
- **The corrupted data was handled honestly instead of papered over.** No
  id-based recovery was possible (the user no longer remembers the real
  selections), so the fix backed up the file and zeroed the field to
  correctly show 0/4 brought rather than leaving a misleading stale 4/4.
- **Two adjacent-but-out-of-scope gaps got filed instead of scope-creeped
  in.** Leg 4's fix stayed scoped to the opponent picker only; the parallel
  gap in the player's own team-building add-Pokémon flow (`TeamCard.tsx`
  has no Species Clause dedupe either) was filed as its own TODO item
  instead of being folded into this pass.

## What didn't go well / friction points

- **The milestone wasn't planned as a milestone.** All four legs were
  reactive bug-fix/feature-request picks rather than a scoped set decided
  up front - it only became "Battle Logger Overhaul" retroactively when
  closing out. Not a problem in itself here (each leg was small and
  bounded), but worth naming since it's a different shape than the
  investigation-driven or spec-driven milestones before it.
- **The brought-4 corruption (Leg 3) was a pre-existing bug that had been
  silently wrong since the feature shipped**, not something this milestone
  introduced - it was only caught because this milestone happened to touch
  the same code path for an unrelated UI change.

## Scope creep observed

None accepted. Leg 3 surfaced real scope-creep temptation (fix the
corrupted data files, add a data-integrity check elsewhere?) but stayed
bounded to backing up and zeroing the affected field plus the actual root
cause fix.

## What changes for the next milestone

- When a component derives state via a function with a side effect (fresh
  UUID generation, `Date.now()`, etc.) directly in the render body rather
  than in a memo/effect, treat it as a bug smell worth a quick check even
  when it's not the thing being changed - this is the second unmemoized-
  derivation bug found in recent milestones (see also UI Polish &
  Performance's positioning-anchored-to-wrong-node pattern).
- Corrupted persisted user data found mid-fix should keep following this
  milestone's pattern: back up the file, apply the minimal honest
  correction (zero/null the field, don't guess), and say so plainly in
  `COMPLETED.md` rather than silently patching data alongside the code fix.
