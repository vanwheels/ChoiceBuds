# Post-mortem: Maintenance & Bug Fix Sweep

**Date:** 2026-09-16 (single day). **Status:** Shipped. Boundary: `git log`
range `0a10ba0..8e53847` — starts at the milestone's own opening commit,
right after VGCPastes Real-Set Sourcing shipped, ends at the Dev Console
GPU Overlay Error Noise closeout commit. Full implementation detail for
every item below lives in its own `COMPLETED.md` entry — this doc is the
retrospective, not a restatement.

## What shipped

The milestone bundled three previously-Unscheduled items plus a
same-day-reported Real Sets bug:

1. **Real Sets: Mega Evolution Species Matching Bug (1 leg).** Fixed the
   surfaced bug (`RealSetsButton.tsx` passing an already-Mega-stripped
   species into the lookup) plus a second, deeper instance live testing
   caught before the fix landed: `extractRealSetsForSpecies()` re-parses
   each sampled paste through the same parser that strips Mega suffixes, so
   even the corrected caller still returned zero bundles. Also fixed
   `CalcPokemonPanel.tsx`'s Mega toggle not re-triggering the lookup at
   all. See commit `e51eef6` and
   [docs/investigations/mega-real-sets-matching-bug.md](../investigations/mega-real-sets-matching-bug.md).
2. **Team Gap Analysis: Usage Cutoff Tuning (1 leg).** A decision, not a
   diff. The item's premise was stale — `useUsageSync` has bulk-populated
   real ladder-usage ranks for every legal-roster species since 2026-09-01,
   it just hadn't been checked against. Pulled the live
   `game-data-cache.json`: 253 legal species ranked 2-261 with no
   unresolved fallbacks, ranks 2-60 nearly gapless, so there's no natural
   cliff at 50 to retune around given the API only exposes ordinal rank.
   Kept `USAGE_THREAT_RANK_CUTOFF = 50` as-is; recorded the finding in
   `utils/usageThreats.ts`'s doc comment instead of leaving it flagged
   unmeasured.
3. **Dev Console GPU Overlay Error Noise (1 leg).** Cosmetic-only:
   `npm run dev` printed a `GetGpuDriverOverlayInfo` Chromium error on every
   launch, not a functional issue. Added
   `app.commandLine.appendSwitch('disable-direct-composition')` before the
   existing `disableHardwareAcceleration()` call to skip the failing
   DirectComposition video-overlay probe. Live-verified by restarting
   `npm run dev` — error gone. See commit `0112f6d`.

**Not closed with the rest:** the milestone's 4th pulled-in item, Reg M-C
Z-A-Exclusive Movepool Audit, is still `Blocked` on PokeAPI backfilling
Champions-tagged move data — re-checked live the same day (still 0
Champions-tagged moves on the indicator species), no change, so it stays in
`TODO.md`'s `Blocked` tier rather than closing with this milestone.

## What went well

- **All three closeable items were small, independently verifiable units**
  — a scoped bug fix, a data-backed decision with no code change, and a
  cosmetic dev-only fix — each shipped and closed the same day without
  spilling into follow-on legs.
- **The Mega Evolution bug fix caught a second, deeper bug via live
  testing** before declaring the first fix done, rather than shipping the
  caller-side fix alone and finding out later that `extractRealSetsForSpecies()`
  still silently returned nothing.
- **The GPU overlay fix was verified live rather than assumed safe**, per
  the item's own note that it touches GPU flags on a line already sensitive
  to this exact driver's quirks — the user restarted their running dev
  session and confirmed the error was gone before this closed.

## What didn't go well / friction points

- **The milestone's "current" section went empty before the milestone
  itself was confirmed closeable**, because the 4th item (Reg M-C Movepool
  Audit) was blocked rather than shippable — a blocked item pulled into a
  milestone doesn't get a natural closing moment the way a shippable leg
  does, so the milestone sat with an empty `Current Milestone:` section
  until Vanny explicitly said to close it rather than that being obvious
  from TODO.md's state alone.

## Scope creep observed

- None — each of the three closed items stayed within its own single-leg
  scope; no adjacent work was pulled in mid-pass.

## What changes for the next milestone

- When a milestone bundles a `Blocked` item alongside shippable ones,
  decide up front whether the milestone ships once the shippable items are
  done (leaving the blocked one to live independently in `Blocked`) or
  waits on the blocked item too — this milestone resolved it ad hoc
  (shipped without Reg M-C) rather than deciding at scoping time.
- `UI Shift Assessment Sweep — Post Card UI Polish` is the only item left
  in `Unscheduled` and has been sitting there since 2026-09-08 — worth
  deciding whether it's the next milestone to scope or should keep waiting.
