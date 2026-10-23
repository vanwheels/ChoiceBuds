# Team Editor & Box Fixes — Post-Mortem

2026-10-23. Five legs, all shipped the same day.

## What shipped

- **Roster Swap's sprite-box picker missing Box Pokémon** (Leg 1): the
  swap-via-sprite-box picker called `AddPokemonStatTable` without the
  `savedPokemon`/`onSelectSaved` pair the "+ Add Pokémon" picker already
  passed, so its "From Box" section silently never rendered. Mirrored the
  existing picker instead of rebuilding it.
- **Box expand-in-place replaced with a modal** (Leg 2): the grid no
  longer reflows on expand. A single shared `BoxEntryModal.tsx` instance
  swaps its `entry` prop for prev/next cycling (avoiding the flicker a
  per-card modal instance would cause), with Escape/click-outside close
  and arrow-key/button navigation added mid-leg from live feedback.
- **Aegislash/Maushold form-picker noise in the battle logger** (Leg 3):
  the opponent roster picker surfaced both forms of each as independently
  selectable rows, useful in the team builder but just noise for logging
  what an opponent brought. Filtered to one canonical entry each, scoped
  to that one picker only.
- **Mega sprite not gated with the rest of the Mega toggle** (Leg 4): the
  sprite swapped to the Mega form as soon as a Mega Stone was held,
  ahead of the `activeMegaSlug` toggle, while stats/types/ability
  correctly waited for it. Live-verified against Golisopod (previously
  broken) and Aegislash (control case).
- **`useSavedPokemon` sync-merge migration-parity gap** (Leg 5):
  `reconcileSyncedSavedPokemon` never ran incoming sync records through
  the gender-split-species normalization `reconcileSyncedTeams` already
  applied, per `.claude/rules/sync-merge-migration-parity.md`. Fixed with
  a mirrored `normalizeIncomingSyncSavedPokemonEntry`. Passed
  `/leg-review` clean.

All three originally-scoped items (Legs 1-3) plus two bugs bundled in from
the 2026-10-22 feedback pass (Legs 4-5) are done; see COMPLETED.md.

## What went well

- The existing `sync-merge-migration-parity.md` rule (written after the
  `Team.visibility` incident) did its job: Leg 5 was found and fixed
  *before* it caused a real sync-loss report, by deliberately checking
  `useSavedPokemon.ts` against the rule rather than waiting for a bug.
  This is the active-check mechanism working as designed, not a reactive
  catch.
- Leg 2's prev/next navigation and Escape/click-outside close weren't in
  the original scope but were added cleanly mid-leg off live feedback,
  without destabilizing the rest of the modal work — the single-instance
  `entry`-prop-swap design happened to make that addition cheap rather
  than requiring rework.
- All five legs shipped same-day with no reverts or redone work visible
  in the commit history — each was a tightly-scoped, independently
  verifiable fix.

## What didn't go well / friction points

- Leg 2 grew past its original "modal instead of expand-in-place" framing
  (prev/next cycling, keyboard nav, click-outside) within the same leg
  rather than being split out, because the need only became clear once
  the modal existed to react to. Not a problem here since it stayed
  small and shipped same-day, but worth naming as the kind of mid-leg
  growth that should get a deliberate "split this out or keep going?"
  check if it starts compounding rather than staying a one-time addition.
- The Mega sprite gating bug (Leg 4) and the sync-parity gap (Leg 5) were
  both latent defects in features shipped by earlier milestones (Mega &
  Alt-Form Representation; the original sync reconciliation work) that
  only surfaced because this milestone bundled in a deliberate audit
  pass rather than waiting for a live report.

## Scope creep observed

- None beyond what TODO.md already flagged going in — Legs 4-5 were
  explicitly bundled into this milestone's scope before work started, not
  absorbed mid-stream.

## What changes for the next milestone

- When a shared-rule check (like `sync-merge-migration-parity.md`) exists
  and names specific files/hooks it applies to, treat an audit pass over
  those files as a standing candidate to bundle into any milestone that
  touches sync code, the same way Leg 5 got bundled in here — don't wait
  for the third live incident to go looking.
- `useBattles.ts` still keeps its sync reconciliation inline and hasn't
  had a load-path migration yet, so it hasn't been checked against
  `sync-merge-migration-parity.md` the way `useTeams.ts`/
  `useSavedPokemon.ts` now have. Check it the first time a migration is
  added there, not after.
