# Post-mortem: Regular Calc Popup

**Date:** 2026-09-11 to 2026-09-13 (3 days, spanning a mid-milestone pivot).
**Status:** Shipped — but not the milestone that was originally promoted. Full
implementation detail lives in `COMPLETED.md`'s entries for each leg below
(`git log` range `4527da0..246e991`); this doc is the retrospective, not a
restatement.

## What shipped

This milestone has two distinct halves separated by a pivot decision on
2026-09-13. Both belong in this record even though only the second half kept
the milestone's final name.

### Phase 1 — Live Calc Tuning (promoted 2026-09-11, retired 2026-09-13, no `MILESTONES.md` entry of its own)

Continued tuning the "Live Calc" tab (shipped as its own milestone
2026-09-08 — see
[live-calc-stat-inference.md](live-calc-stat-inference.md)) against fresh
feedback, across 5 originally-scoped legs plus several feedback-driven fixes
folded in along the way:

1. **Defender Panel Parity** (`85b1877`/`1aa49c0`) — forme-family toggle,
   base-stat display, and real Def/Sp. Def stage-boost inputs on the
   opponent panel, matching the attacker panel's known-inputs UI.
2. **Observation Move Options: Actual Attacker Moveset** (`bfe70cd`) —
   capped attacker observation moves to the real 4-move set once known,
   instead of the full learned movepool.
3. **Observation Inputs: Crit + Fainted/Survived** (`2781b26`) — added
   outcome/crit fields; a fainted read relaxes to a one-sided lower-bound
   feasibility check instead of the usual two-sided range.
4. **Known-Ability Lock** (`f0ca844`) — hard-locks the defender's ability as
   a known filter instead of scanning the full ability pool per observation.
5. **Result Clarity Pass** (`0eab7a7`) — per-axis section labels, 0/32 tick
   rows, and contradiction messages that name which specific axis has zero
   feasible candidates.
6. **Page Layout & Function Rework** (Legs 1-3, `c948316`/`f98fb4b`/
   `2d910bc`) — the milestone's biggest engine addition: a bidirectional
   inference engine narrowing the opponent's Atk/SpA from "their move → you"
   observations, wired into a mirrored opponent panel/observation list, plus
   range-aware move grids for a page layout matching the plain Calc tab.
7. **Feedback Pass 2** (Legs 1-3, `da652d1`/`5faaae3`/`8f3e5f7`) — reverse-
   observation auto-fill and layout-overflow fixes, an Atk/SpA narrowing bug
   that wrongly rejected explainable observations, and folding the inferred-
   result section into the opponent panel itself.
8. **Player/Opponent Card Redesign** (`dbb0a33`, scoped `56629d5`) — rebuilt
   both panels against Vanny's mockup (unified stat table, Base/Mega toggle
   placement, a real opponent Status field); absorbed Feedback Pass 2's
   former Legs 4 and 6 outright.
9. **Feedback Pass 2, Leg 5** (`315244c`) — fixed Mega ability sourcing
   (Armor Tail/Farigiraf) by rerouting through the app's real PokeAPI
   pipeline instead of `@smogon/calc`'s stale bundled data — the same root
   cause as an earlier Leg 1 fix, recurring in a second spot.
10. **Usage-Data-Backed Inference** (Legs 1-2, `45e9f7c`/`2236098`) — ranked
    and filtered the nature/ability/item candidate lists against Champions
    ranked-ladder usage data.
11. **Drive-by fixes folded in along the way**, each logged in
    `COMPLETED.md` as "folded into Live Calc Tuning": a gender-divergent-
    species species-lookup crash plus item/ability Speed mods being ignored
    (`540d4c2`); a legal-species-list PokeAPI slug mismatch swept across 6
    species, not just the one reported (Mimikyu) (`ee455a0`); the Calc
    Result panel showing raw EV mentions instead of Champions SPs (`6cd416b`).

### Phase 2 — Regular Calc Popup (2026-09-13, the pivot)

After shipping Phase 1's scoped legs, Vanny sat with the result and called
Live Calc a **wrong-tool-for-the-moment problem, not a polish problem** — see
[regular-calc-popup-scope.md](../investigations/regular-calc-popup-scope.md)
for the full reasoning (inference only pays for itself on values still
unknown; usage-ranking already answers "what's most likely" without any
observation math; a faster direct-entry path already existed in the plain
Calc tab). Live Calc was ripped rather than tuned further, and replaced with:

12. **Live Calc Retirement** (`cc55a5d`) — removed the tab,
    `liveCalcEngine.ts`/`liveCalcSpeedEngine.ts`, `useLiveCalc.ts`,
    `components/livecalc/*`, and the Speed Tiers pin tie-in that depended on
    it. Kept `liveCalcUsageWeighting.ts` standalone, since a concrete reuse
    (the popup's usage auto-populate) was already identified.
13. **Popup Launcher** (`84f148f`) — the plain Calc tab relocated into a
    floating, persistent overlay reachable from any tab; sidebar's Calc entry
    removed entirely. Solved the "must persist across close/reopen without
    eager-loading `@smogon/calc`" conflict by reusing `App.tsx`'s existing
    `visitedTabs` lazy-mount-once pattern instead of hoisting state — see the
    scoping doc's "Popup Launcher" section for the full architecture
    reasoning.
14. **Usage-Data Auto-Populate** (Legs 1-2, `4bdb771`/`940dbf7`) —
    nature/ability/item/move pickers on both panels now show every
    Champions-ranked alternative (not just the #1 auto-fill pick); Stat
    Points got a dedicated ranked-spread chip row since its 6-value-combo
    shape didn't fit the "annotate the existing dropdown" pattern the other
    4 axes used.
15. **Battle Log Integration** (Legs 1-4, `cfde0c2`/`27aa268`/`bdc153c`/
    `f9a427e`) — species prefill from an opponent tile, then moves/ability/
    item write-back into that same roster entry, then replaced the per-tile
    trigger with a global "Load from Opponent" tray driven by the floating
    launcher, then fixed Pokemon 1/2 to always map to player/opponent so a
    session's slots stay predictable.

## What went well

- **The pivot was named and documented, not absorbed quietly.** Vanny
  stopped mid-tuning to call the whole approach wrong rather than shipping
  another round of polish on a tool nobody was happy with, and the reasoning
  behind that call got written into its own scoping doc instead of
  disappearing into the next commit. That documentation is what makes this
  post-mortem possible to write accurately.
- **Live Calc Retirement was a clean removal, not a half-measure.** It
  traced down the one real dependent (the Speed Tiers pin tie-in) instead of
  leaving it dangling, and deliberately kept the one module
  (`liveCalcUsageWeighting.ts`) that already had a concrete next use —
  neither dead code left behind nor a premature deletion of something still
  needed.
- **Each of Phase 2's same-day scoping-then-building cycles caught a real
  wrong assumption before code.** Popup Launcher's scoping surfaced an
  architecture conflict (persistence vs. the lazy-load boundary) and
  resolved it by reusing an existing pattern rather than inventing one;
  Usage-Data Auto-Populate and Battle Log Integration each opened by
  correcting a framing baked into the pivot's own high-level description
  (see below) before any implementation started.
- **Splitting into smaller legs paid off again.** Usage-Data Auto-Populate
  and Battle Log Integration were each explicitly split into
  independently-useful pieces (ranking vs. SP chips; prefill vs. write-back
  vs. tray vs. slot-pinning) rather than one large leg apiece, matching the
  project's smaller-slice preference.

## What didn't go well / friction points

- **A full milestone's worth of tuning got retired instead of shipped.**
  Phase 1 was 11 legs/fixes across 2 days (2026-09-11 to 2026-09-12) building
  out Live Calc's bidirectional inference, result clarity, and usage
  weighting — all of it removed less than 24 hours after the last leg
  landed. None of it was low-quality (every leg did what it set out to do;
  no bugs turned up reviewing it after the fact), but the underlying premise
  — that observation-based inference was the right interaction model for
  live play — never got tested against real use until Vanny actually sat
  with the finished result. That's a full milestone's calendar time spent on
  a direction it took living with the shipped feature to rule out.
- **The pivot's own milestone description didn't match the current
  architecture, twice.** Both the Usage-Data Auto-Populate and Battle Log
  Integration scoping passes opened by naming and correcting a wrong
  assumption baked into the pivot plan itself: "default the popup's
  **opponent side**" assumed a player/opponent distinction `CalcPage` has
  never had (its two panels are fully symmetric); "opening the popup from an
  **active Battle Log session**" assumed the old turn-by-turn logging flow
  still existed, when it had already been retired to
  `RecordMatchForm`-based post-match entry back on 2026-08-31. Both were
  written against Live-Calc-era mental models instead of a code check at
  pivot time.
- **The pivot doc's "no new schema needed" claim was only half right.** It
  held for moves/ability/item (Battle Log Integration's actual scope) but
  not for nature/SPs/Tera, which Calc tracks but `OpponentPokemonEntry`
  doesn't. Caught during that leg's own scoping session, not the original
  pivot conversation, and resolved by explicitly descoping those fields
  rather than a surprise mid-implementation.

## Scope creep observed

- Phase 1 absorbed several feedback-driven fixes outside its original
  5-leg scope (gender-divergent species + item Speed mods, the 6-species
  legal-list sweep, the SP/EV display bug). Each was small, self-contained,
  and individually logged in `COMPLETED.md` as "folded into Live Calc
  Tuning" rather than silently expanding the milestone's stated scope —
  worth naming here since it's part of why the "5-leg" milestone description
  undercounts what actually shipped before the pivot.
- No scope creep observed in Phase 2 — each of the 4 sub-efforts
  (Retirement, Popup Launcher, Usage-Data Auto-Populate, Battle Log
  Integration) shipped exactly what its own scoping pass described.

## What changes for the next milestone

- When scoping a pivot's replacement plan, re-verify its framing against the
  actual current code before writing the milestone description down — both
  wrong-assumption corrections this milestone hit (Calc's symmetric panels,
  the already-retired turn-by-turn logging flow) were things a code check
  would have caught before the description was written, not just before
  implementation started.
- Treat "has anyone actually used this yet" as a real checkpoint before
  calling a tuning-heavy feature done, not just "does it pass its own
  verification pass." Phase 1's legs all worked as designed; the
  wrong-tool call only surfaced once Vanny used the finished result in
  practice, and no amount of additional in-scope polish would have
  surfaced it sooner, since the premise itself — not a bug — was what
  turned out to be wrong.
- Retiring a feature is not a lesser outcome than shipping one. Live Calc
  Retirement's clean-removal discipline (tracing the one real dependent,
  keeping the one genuinely-reusable module) is worth treating as the
  template for the next time a direction gets reversed mid-milestone.
