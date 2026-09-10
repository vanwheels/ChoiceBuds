# Post-mortem: Speed Calc-like Feature

**Date:** 2026-09-09 to 2026-09-10 (18 legs across 2 days). **Status:**
Shipped. Full implementation detail lives in `COMPLETED.md`'s entries for
each leg below - this doc is the retrospective, not a restatement.

## What shipped

A new top-level "Speed Tiers" tab: a selected team's real, field-modified
Speed plotted against every species legal in that team's regulation,
differentiated from vgcmulticalc's own Speed Calc by being team-anchored
and Champions-usage-native rather than a free-text search box over generic
Showdown ladder data.

1. **Scoping** (Leg 1, `3eb040e`'s predecessor) - resolved the
   differentiation call (team-anchored + Champions-native usage + a Live
   Calc tie-in) before any code, in
   [docs/investigations/speed-calc-scope.md](../investigations/speed-calc-scope.md).
2. **Data layer** (Leg 2, `3eb040e`) - `utils/speedTiers.ts`, reusing
   `@smogon/calc`'s own internal `getFinalSpeed()` for weather/Tailwind/
   Choice Scarf/paralysis rather than hand-rolling a second chain.
3. **View shell** (Leg 3, `f733635`) - the tab itself, nav placement
   resolved live (own top-level tab, not nested).
4. **Layout rework** (Leg 4, `0857937`) - row-list → icon grid grouped by
   speed value; nature became 3 fixed bounds per threat instead of a
   modifier note; added the Choice Scarf/Iron Ball threat-item toggle.
5. **Team Preview Strip** (Leg 5, `5b038aa`) - session-only Speed-SP/
   nature/form override editor per team member, merged in at read time.
6. **Live Calc tie-in** (Leg 6, `951937c`, built on Leg 15's engine) -
   explicit "Pin to Speed Tiers" action carrying a turn-order-narrowed
   Speed SP range/nature candidates onto the matching threat row.
7. **Verification pass** (Leg 7) - surfaced the duplicate-Mega-candidate
   bug that turned out to be the shared root cause of two other reported
   bugs (see below).
8. **Full-regulation roster rework** (Leg 8, `59d61b9` + same-day
   follow-up `ea92727`) - reversed Leg 3/4's team-anchored-threats-only
   data source for the full legal roster; also fixed a pre-existing
   `useInitialSync` data-integrity bug this rework's own investigation
   surfaced.
9. **Threats Only toggle** (Leg 9, `72782ce`).
10. **Per-spread value placement re-check** (Leg 10) - confirmed not a bug;
    a real tie, not bundling.
11. **Usage threshold control** (Leg 11, `60ef386`).
12. **Bounds Only toggle** (Leg 12, `1e765e0`).
13. **Mega sprite fallback fix** (Leg 13, `9ef4c17`/`78acf45`/`bc572f2`).
14. **Trick Room sort-order re-check** (Leg 14) - confirmed fixed by Leg
    17's duplicate-Mega fix, not a separate bug.
15. **Live Calc Speed inference engine** (Leg 15, `5998916`) - the
    turn-order-observation engine Leg 6's pin action needed.
16. **Live Calc turn-order Speed stage boosts** (Leg 16, `c441d54`).
17. **Duplicate Mega roster candidates fix** (Leg 17 - note the leg number
    collision with the save-override leg below; see `COMPLETED.md`, commit
    `19b4fca`).
18. **Preview Strip save override to team** (Leg 17, `453fa2e`) - a
    per-card/page-level Save action writing the strip's Speed-SP/nature
    override back to the real team.
19. **Over-cap SP warning** (Leg 18, `65a7858`) - a non-blocking `⚠`
    surfaced on `TeamCard`/`PokemonCard` when a save from #18 pushes a
    team member's real SP total past 66.

## What went well

- **Scoping before code stuck, twice.** Leg 1's differentiation call and
  Leg 5/17's save-override scoping both resolved real design questions via
  `AskUserQuestion` before implementation started, so later legs had
  actual decisions to build against instead of discovering them mid-leg.
- **A dedicated verification leg (7) earned its keep.** It surfaced one
  concrete bug (duplicate Mega roster candidates) that turned out to be
  the shared root cause behind two *other* independently-reported bugs
  (Leg 10's "bundling," Leg 14's Trick Room sort order) - both later
  re-confirmed fixed by the same one fix rather than needing separate
  investigation.
- **Willingness to reverse an early decision when live data disagreed.**
  Leg 8 fully reversed Leg 1's own "team-anchored threat list" framing
  after live-testing showed the team-anchored version was visually sparse
  and undersold the feature - documented explicitly rather than papered
  over, in [docs/investigations/speed-tiers-full-roster-pivot.md](../investigations/speed-tiers-full-roster-pivot.md).

## What didn't go well / friction points

- **Leg numbering collided once.** Two different legs both ended up
  labeled "Leg 17" (Duplicate Mega Roster Candidates, and Preview Strip
  Save Override to Team) - harmless in practice since `COMPLETED.md`
  disambiguates by title + commit, but a reminder to double-check the next
  free leg number against `COMPLETED.md` too, not just `TODO.md`'s current
  section, when legs get inserted out of numeric order (as this milestone
  did more than once).
- **A milestone's own scoping doc can go stale without anyone re-checking
  it.** This postmortem exists partly because the "Open follow-ups" list
  written during Leg 1's scoping pass (nav placement, field-effect
  toggles, the Live Calc wiring mechanism, the Team Gap Analysis Speed
  Annotation relationship) was carried forward verbatim into `TODO.md`
  after Leg 18 as still-unresolved, when in fact Legs 2-8 had already
  resolved every one of them along the way. Nobody had gone back to
  cross-check the original follow-ups list against what later legs
  actually built until asked directly - worth treating a milestone's own
  early scoping doc as something to re-verify against `COMPLETED.md`
  before declaring the milestone shipped, not just trust as still current.
- **Two "bug reports" during this milestone were false leads that cost a
  verification leg each** (Leg 10's per-spread placement, Leg 14's Trick
  Room sort order) - both turned out to be the same underlying Leg 17
  duplicate-Mega bug, not independent issues. Neither was wasted work
  exactly (both got a real, documented root cause), but a single
  "duplicate roster candidates" theory checked first against both reports
  might have resolved them together sooner.

## Scope creep observed

None escalated silently - Leg 8's full-regulation-roster reversal was the
one big scope change, and it was written up as an explicit, named
reversal (not absorbed quietly), matching the project's scope-creep
flagging preference.

## What changes for the next milestone

- When a milestone's scoping doc lists "open follow-ups" for later legs to
  settle, re-check that list against `COMPLETED.md` before using it to
  decide whether the milestone is done - don't assume it's still accurate
  just because no leg explicitly closed each line item by name.
- When inserting legs out of numeric order (already an established
  pattern in this project), grep `COMPLETED.md` for the target leg number
  first, not just the current `TODO.md` section, to avoid a repeat of the
  Leg 17 collision.
- When two independently-reported bugs share a component (here: Mega-form
  roster candidates), check whether one root cause could explain both
  before opening two separate investigation threads.
