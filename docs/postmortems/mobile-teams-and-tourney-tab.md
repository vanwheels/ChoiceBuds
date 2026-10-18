# Post-mortem: Mobile Teams & Tourney Tab

**Date:** 2026-10-17 (single-day, 3-leg milestone). **Status:** Shipped.
Full implementation detail lives in `COMPLETED.md`'s entries for each leg
below (`git log` range `3e24cef..33acb59`) - this doc is the retrospective,
not a restatement.

## What shipped

Two independent done-when items, three legs:

1. **Mobile Add Pokémon Entry Point — Leg 1** (`e35e438`) - an extra page
   past the last card in the mobile Teams swipe deck whenever roster < 6,
   plus a dedicated empty-state screen replacing the old bail-out-and-
   auto-close effect. Also fixed a latent `Modal.tsx` z-index bug (below the
   mobile swipe overlays) uncovered while building this.
2. **Tourney Tab: Event Config — Leg 2** (`6a3369a`) - `config/
   tourneyEvents.ts`, a hand-authored table of TPCi's sanctioned VGC circuit
   events for the current season, sourced from Serebii per the schedule-
   source research already resolved in the prior Bug Fix & Research Sweep
   milestone.
3. **Tourney Tab: UI — Leg 3** (`4c8c986`) - the Tourney tab itself
   (`TourneyPage.tsx` + `TourneyEventCard.tsx`), filtering Leg 2's config to
   upcoming events sorted soonest-first, with its own tier-badge color table
   and UTC-anchored date parsing.

## What went well

- **The schedule-source question was already resolved before this milestone
  started.** Leg 2 built directly on `docs/investigations/
  tourney-tab-schedule-source-research.md` (from the prior Bug Fix &
  Research Sweep milestone) instead of re-litigating "is there a live API"
  mid-leg - a clean example of splitting scoping/research from building
  across a milestone boundary, not just within one.
- **Leg 2 → Leg 3 reused established patterns directly**: tier-badge colors
  followed `pokemonTheme.ts`'s `REGULATION_THEMES` shape, and UTC-anchored
  date parsing followed `config/seasons.ts`'s existing treatment for ISO
  date strings - no new pattern invented where a precedent already existed.
- **The Leg 1 z-index bug was fixed in the same leg it was found in**,
  rather than deferred to a separate TODO item, since it was a direct
  blocker for the feature being built (Roster Swap's picker needed to open
  correctly from within the new mobile overlay).
- **All three legs landed as small, single-purpose commits** (`e35e438`,
  `6a3369a`, `4c8c986`) with no scope expansion mid-leg - diffs stayed
  scoped to exactly what each leg's TODO body described.

## What didn't go well / friction points

None worth flagging. All three legs closed clean on the first pass: no
same-day follow-up leg was needed (unlike Team Management QoL's Quick
Copy/Paste Leg 1→Leg 2 gap), and the full suite (817 tests, lint,
type-check) passes with zero changes needed at close time.

## Scope creep observed

None. Leg 2 explicitly excluded Global Challenge events and signup
deadlines (neither source page lists them) and documented that in the
config file's header rather than quietly expanding scope to fill the gap.

## What changes for the next milestone

Nothing new to promote into a rule - this milestone's one reusable lesson
(resolve schedule/data-source questions as a dedicated research leg before
the UI leg that depends on them) is already captured by the existing
split-scoping-from-building convention and needs no new rule text.
