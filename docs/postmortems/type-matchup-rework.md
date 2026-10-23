# Post Mortem: Type Matchup Rework

**Shipped:** 2026-10-23 (3 legs, all same day).

## What shipped

1. **Magnitude-graded coverage cells — Leg 1** (`2878045`) — `CoverageCell.tsx`
   now colors by magnitude (mild/extreme favorable split green/blue, mild/
   extreme unfavorable split orange/red) instead of one flat color per side;
   immune stays a neutral gray badge regardless of direction.
   `CoverageTable.tsx`'s aggregate Weak/Resist and Not Very Effective/Super
   Effective count badges threshold-color by count (0 / 1-2 / 3+) after a
   live-feedback round flagged they'd been missed in the first pass.
2. **Team Gap Analysis removed — Leg 2** (`8663ca8` then `b506506`) — the
   ladder-usage-threat panel (`UsageThreatsList.tsx`, `usageThreats.ts`,
   `usageCoverageGaps.ts`) is gone outright. A first pass replaced it with a
   new "Coverage Gaps" panel re-surfacing `computeDefensiveCoverage`'s
   per-type counts, live-rejected the same leg as redundant with the
   Defensive `CoverageTable`'s own Weak/Resist columns. `slotResistsThreat`
   moved to `typeCoverage.ts` since `SpeedTiersPage`'s "Threats Only"
   checkbox still needs it.
3. **Mega/Alt-Form-aware coverage — Leg 3** (`33ef822`, `d8a85a1`) — both
   coverage tables now read the active `usePokemonFormToggle` state via a
   new `useActiveFormsForIds`. A code-review pass factored a duplicated
   "is this toggle pointing at its own held Mega Stone" check into shared,
   tested pure functions (`megaEvolution.ts::resolveActiveMegaSlug`,
   `megaAbilities.ts::resolveActiveAbility`, `typeCoverage.ts::
   resolveDefensiveSlot`), also adopted by `EditablePokemonCore.tsx`'s
   existing Mega Team Card Flip logic. Live-verified via the `run-desktop`
   driver with a disposable Mega Pinsir team. A follow-up `/leg-review`
   caught a real latent bug — `useTeamMoveTypes`'s new `activeForms`
   parameter defaulted to a fresh `{}` literal each call, which would never
   stabilize across renders for an omitted/unmemoized argument and spins
   its fetch effect forever (reproduced at 14,514 `getMoveData` calls in
   ~160ms) — fixed with a shared `EMPTY_ACTIVE_FORMS` constant plus a
   regression test, and five stale TODO.md cross-references.

Full suite at close: 89 test files, 899 tests, lint and type-check clean.

## What went well

- Leg 2's redundant replacement panel was caught and reverted in the same
  leg, before it ever reached a separate review pass — the user looked at
  the built panel next to the existing table and called it "useless and
  redundant" immediately.
- Leg 3's code-review pass found real duplication (the Mega-ownership
  check) and a real untestable spot (inline defensive-slot resolution in a
  component) and both got factored into shared, tested pure functions
  rather than left as a note.
- `/leg-review` on Leg 3 caught a genuine latent bug (the unstable `{}`
  default) that unit tests and manual live verification both missed, since
  the only live call site already passed a memoized value — exactly the
  class of bug a same-context review can't see and a second pass can.

## What didn't / friction points

- Mid-Leg-3, `leg-review` didn't show up in the model-invocable skills
  listing (by design — its `disable-model-invocation: true` frontmatter
  means it only runs when the user types `/leg-review`), and that was
  misread as "not set up," leading to a silent substitution of
  `code-review --high` instead of asking. That substitute forked and ran
  for close to 10 minutes, burning roughly 38% of the session's token
  budget on what should have been a routine leg-closing review before the
  user interrupted and called it out. Already written up and promoted to
  an auto-memory feedback entry the same day
  (`feedback_leg_review_not_available_dont_substitute.md`) — see "What
  changes" below for why no further rule is needed.
- Leg 2's TODO.md spec explicitly called for a replacement "Coverage Gaps"
  panel; building it exactly as scoped still produced dead weight because
  the spec was written before the existing table's columns were back in
  view. Already promoted to auto-memory
  (`feedback_check_redundancy_before_building_replacement.md`).

## Scope creep observed

None. Each leg matched its planned Done-When criterion; Leg 2's extra
panel-then-revert happened inside the leg's own scope, not as unplanned
expansion.

## What changes for the next milestone

- Both friction points above already became active-check auto-memory
  entries the same day they happened, not just post-mortem notes — no
  additional CLAUDE.md or `.claude/rules/` promotion needed for either one.
  The `/leg-review` substitution lesson is a general Claude-behavior
  correction (recognize `disable-model-invocation` skills, ask instead of
  substituting), not a ChoiceBuds-specific rule, so auto-memory is the
  right home for it rather than this project's CLAUDE.md.
- The redundant-panel lesson is also a general working-style correction
  (check before building, not a ChoiceBuds-specific pattern), so auto-
  memory is sufficient there too — no CLAUDE.md/`.claude/rules/` edit
  needed.
