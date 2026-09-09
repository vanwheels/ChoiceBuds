# Post-mortem: Live Calc: Damage-Based Stat Inference Tab

**Date:** 2026-09-08 (single-day, 4-leg arc). **Status:** Shipped. Full
implementation detail lives in `COMPLETED.md`'s entries for each leg below
(`git log` range `4bd6dc0..650dab0`) - this doc is the retrospective, not a
restatement.

## What shipped

A new "Live Calc" tab that infers an opponent's likely nature/SP-spread/
ability/item from what percentage of damage your own moves land on it,
built in 4 legs:

1. **Scoping** (`4bd6dc0`) - resolved unknowns-to-solve-for, search-space
   tractability, observation shape, and a heuristic-not-brute-force v1
   method with the user before any code, in
   [docs/investigations/live-calc-stat-inference-scope.md](../investigations/live-calc-stat-inference-scope.md).
2. **Engine** (Leg 1, `efc23cd`) - pure, React-free `utils/liveCalcEngine.ts`:
   per-variable heuristic narrowing over `@smogon/calc`'s real damage math,
   HP SPs held at a documented midpoint default, Doubles' spread-move
   reduction switched off per-observation via `targetsHit`.
3. **Tab Shell** (Leg 2, `8e68481`) - `useLiveCalc` hook plus the attacker/
   defender/observation-list UI, wired end-to-end into a raw plumbing
   preview.
4. **Results Display** (Leg 3, `d4a60a6`) - `LiveCalcResultPanel`/
   `LiveCalcCandidateGroup` replacing the raw preview with SP range bars and
   per-axis candidate-narrowed fraction bars.
5. **Verification Pass** (Leg 4, this doc) - live `run-desktop` pass
   confirming Legs 1-3 actually behave sensibly wired together, not just in
   the pure-engine unit tests.

No product bug turned up in the verification pass - the feature works as
designed.

## What went well

- **Scoping before code stuck.** The scope doc's resolved-vs-assumption
  split (Doubles-only, no crit/multi-hit, HP/defense-stat coupling as an
  accepted v1 approximation) meant Leg 1 had real design decisions already
  made instead of discovering them mid-implementation.
- **Structural, not hardcoded, engine tests.** `liveCalcEngine.test.ts`
  asserts properties (bounds only ever shrink/hold, category separation,
  graceful degradation) rather than exact SP numbers, so it won't go
  brittle the next time `@smogon/calc`'s bundled data updates.
- **The verification leg found real false leads before they became wasted
  implementation time.** Two dead-end theories (a broken species picker; a
  Reg M-C legality regression) both got debugged to a real root cause
  (documented in `COMPLETED.md`'s Leg 4 entry) rather than either being
  papered over or turning into an unnecessary "fix."

## What didn't go well / friction points

- **Live-UI verification needs a fully-known attacker, and the app doesn't
  hand you one.** `CalcPokemonPanel`'s species-select auto-fills a real
  Champions ranked-ladder set (item/ability/nature/SPs) the moment you pick
  a species from its dropdown - by design, and correct for normal use, but
  it means a verifier can't guess a "plausible-sounding" damage% for a
  manual observation without first computing what that specific auto-filled
  set can actually do. The first live pass burned a full round-trip
  learning this the hard way (every guessed observation looked like a
  contradiction) before switching to a throwaway `@smogon/calc` script to
  compute real feasible ranges ahead of time.
- **`run-desktop`'s synthetic-event shortcut cost a debugging round-trip.**
  Setting an `<input>`'s value via the native setter + a dispatched `input`
  event (documented in the skill's own gotchas as a working pattern) reads
  fine for a plain controlled input, but for `CalcAutocomplete`'s dropdown
  it looked broken until real `page.keyboard.type()` replaced it - not
  because the technique was wrong in general, but because the flakiness
  only showed up as a *reproducible-looking* zero-result dropdown, which is
  hard to distinguish from a genuine empty options list without a second,
  independently-verified species (Pikachu) to establish that the mechanism
  itself was fine.
- **A regulation-legality red herring took a side-by-side Reg M-B check to
  rule out.** Ferrothorn/Landorus-Therian returning zero species-search
  results looked exactly like fallout from the same-day, separately-tracked
  Reg M-C hand-curation work (`TODO.md`'s blocked "Regulation M-C Prep - Leg
  2") - it wasn't; Pokémon Champions' species list is a positive allowlist
  that just hasn't added either mon yet, confirmed by the same empty result
  under Reg M-B too.

## Scope creep observed

None - each leg stayed inside what the scope doc and `TODO.md` entry
described. The verification leg surfaced two debugging detours (above) but
neither expanded the leg's actual deliverable; no code changed in Leg 4.

## What changes for the next milestone

- When live-verifying any Calc-tab-adjacent feature, budget one throwaway
  `@smogon/calc` script up front to compute real feasible damage ranges for
  whatever attacker/defender pairing gets used, rather than guessing
  round-number values against a set that hasn't been inspected yet.
- For `run-desktop` scripts driving `CalcAutocomplete` (or anything else
  gating a dropdown on typed input), default to `type` + `wait text=...`
  over the native-setter/dispatch shortcut - it costs nothing extra here and
  removes a whole class of "is this actually empty, or did my synthetic
  event just not land" ambiguity.
- Keep a real, allowlisted second species (a "known-good" control) on hand
  when a live species-picker check looks unexpectedly empty, so a
  regulation-data regression and a legitimate "not in this game yet" both
  get told apart quickly instead of assumed.
