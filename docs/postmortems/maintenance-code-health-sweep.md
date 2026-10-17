# Post Mortem: Maintenance & Code Health Sweep

**Shipped:** 2026-10-16 (single-day milestone, 3 done-when criteria across 6
legs).

## What shipped

1. **Delete Dead useActiveEditor Hook — Leg 1** (`dcc0f7e`) — removed
   `useActiveEditor.ts`, its test file, and the dead `editorState` prop
   threaded through `App.tsx`/`AppWeb.tsx` into `TeamsPage` (never consumed
   there since Always-On Editing replaced that flow). Confirmed via grep
   that no references remained before deleting.
2. **Audit Sibling Hooks for useTeams' Lost-Update Race — Leg 1** (`7dee38d`)
   — audited `useSavedPokemon.ts`, `useBattles.ts`, `useSettings.ts`, and
   `useDatabase.ts` against `useTeams.ts`'s pre-fix race pattern (closure
   over state at render time, no serialization between concurrent
   mutations). Found the race in the first three; `useDatabase.ts` already
   immune via an earlier, unrelated functional-`setState` fix. Findings
   recorded in `docs/investigations/sibling-hooks-lost-update-audit.md`.
3. **Audit Sibling Hooks — Leg 2** (`ad58c47`, `e2faada`) — applied
   `useTeams.ts`'s ref+queue fix to the three affected hooks, then added a
   concurrent-write regression test to each (modeled on
   `useTeams.test.ts`'s) after `/leg-review` flagged the first pass as
   missing proof the fix itself worked, plus a stale comment in
   `usePokedexNumberSelfHeal.ts` still describing `useSavedPokemon.ts` as
   unserialized.
4. **File Cap Splits: TeamCard.tsx — Leg 1** (`7b1352e`) — 761 lines into a
   398-line orchestrator plus `TeamCardHeader.tsx`, `TeamCardRosterGrid.tsx`,
   `TeamCardOverlays.tsx`.
5. **File Cap Splits: BoxPage.tsx — Leg 1** (`e70baea`) — 583 lines into a
   483-line orchestrator plus `BoxPageToolbar.tsx`, `BoxPageGrid.tsx`,
   `BoxPageOverlays.tsx`.
6. **File Cap Splits: useSync.test.ts — Leg 1** (`7d913d1`) — 514 lines into
   three suite files plus a shared non-test fixture helper
   (`useSyncTestHelpers.ts`), all 22 original cases preserved 1:1.
7. **File Cap Splits: CalcPokemonPanel.tsx — Leg 1** (`c4b037c`) — 511 lines
   into a 497-line orchestrator plus `CalcPokemonPanelFields.tsx`.

All four splits landed with zero behavior change; all four were manually
live-verified. Full suite at close: `build`/`lint`/`test` pass, 783 tests
across 75 files.

## What went well

- `/leg-review` on the sibling-hooks work earned its keep exactly as
  intended — it caught a real gap (a fix with no regression test proving
  it) that a same-context pass would likely have missed, since the context
  that wrote the fix was primed to believe it worked.
- Manual live verification of each split wasn't a formality — TeamCard's
  pass surfaced three real, pre-existing bugs (not caused by the split) and
  CalcPokemonPanel's pass caught a stale Vite optimize-dep cache masking
  the new module until a clean dev-server restart. Both were caught instead
  of waved through.
- Bugs found during verification that weren't in scope were logged as their
  own TODO.md items with repro context instead of being fixed inline or
  dropped — kept each leg's diff matched to what it claimed to do.
- All four splits used the same header/content/overlays shape, so the
  second through fourth needed no new design discussion.

## What didn't / friction points

- The `useSync.test.ts` split's COMPLETED.md entry was left with a literal
  `<hash>` placeholder (the template text from the global commit-message
  convention) instead of the real commit (`7d913d1`) — caught only at this
  close-out, not when the leg closed. The other multi-commit legs
  (sibling-hooks audit, regression tests) each got their own
  "record commit hash" follow-up commit; this leg didn't.
- Two commits unrelated to any of this milestone's three "Done when"
  criteria landed inside its commit range: `b01327a`/`46513fe` (Electron
  zoom-persistence fix + Mobile Web preview script) and `2fb5a6a` (docs for
  that same work). They're correctly tracked as their own separate
  Unscheduled TODO item, not claimed as part of this milestone, but the
  interleaving made the commit range for this post mortem noisier to read
  than a clean milestone boundary should be.

## Scope creep observed

None against the milestone's own three "Done when" criteria — all three
were hit one-to-one by the legs above, no extra criteria were added
mid-flight. The zoom-fix work noted above ran concurrently but was kept out
of this milestone's scope rather than folded in.

## What changes for the next milestone

- When a leg's COMPLETED.md entry is written before the commit lands (or
  before a hash is known), either hold the entry open until the real hash
  is in hand or add the same "record commit hash" follow-up commit the
  other legs used here — don't leave the literal `<hash>` template text
  in a closed entry.
- Nothing else rose to the level of a rule change this time; the sibling-
  hooks race pattern itself (ref+queue fix for hooks that close over state
  at render time without serializing concurrent writers) is already
  documented in `docs/investigations/sibling-hooks-lost-update-audit.md`
  and doesn't need restating as a rule since it's a one-time audit, not a
  recurring workflow habit.
