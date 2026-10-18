# Post-mortem: Bug Fix & Research Sweep

**Date:** 2026-10-17 (single day). **Status:** Shipped. Boundary: `git log`
range `39e3c8f..ab91edd` — starts at the milestone's own scoping commit,
right after Mobile Web & UI Polish shipped, ends at the Tourney Tab
schedule-source research leg, the last leg scoped under this name. Full
implementation detail for every item below lives in its own `COMPLETED.md`
entry — this doc is the retrospective, not a restatement.

## What shipped

Three research/root-cause-only legs, no application code changed:

1. **Mobile Empty-Team Add Pokémon Bug — Leg 1.** Reproduced
   `MobileTeamSwipeOverlay.tsx` auto-closing on an empty roster instead of
   showing anything, then traced the root cause past the empty-team symptom
   to a missing capability: mobile's swipe-card flow has no "add a new
   Pokémon" affordance at all, only species-swap for an existing slot — a
   scope gap from the original Full-Screen Swipeable Pokémon Card feature,
   not a regression. See `docs/investigations/mobile-add-pokemon-entry-point.md`
   and the new Mobile Teams: Add Pokémon Entry Point item in `TODO.md`'s
   Unscheduled section.
2. **Pokepaste Format Research — Leg 1.** Confirmed the format-deprecation
   rumor true: Showdown's new client (public beta/transition, not yet
   default) replaces Pokepaste with its own first-party team database
   (`teams.pokemonshowdown.com`, `psim.us/t/<id>` links). The first pass at
   this closed the rumor as **false** by checking only the current-default
   client; a same-day second look caught the beta client's actual behavior
   and corrected the record. See
   `docs/investigations/pokepaste-format-research.md` and the new Pokepaste
   Import: New Showdown Client Team Links item in `TODO.md`'s Unscheduled
   section.
3. **Competitive Events: Tourney Tab Research — Leg 1.** Confirmed no live/
   structured schedule source exists for TPCi's own sanctioned events (the
   official Event Locator is a store-proximity search, not a majors
   calendar; the only calendar-shaped data is unofficial fan trackers with
   no public API). Falls back to a hand-maintained config, same pattern as
   `config/championsMoveOverrides.ts`, under the existing manual-research
   exception — no new `external-data-sources.md` entry needed. See
   `docs/investigations/tourney-tab-schedule-source-research.md` and the
   updated Competitive Events: Tourney Tab UI entry in `TODO.md`'s Future
   Milestones section.

## What went well

- **All three legs stayed research/root-cause-only and ended in a concrete
  written follow-up** (a scoped `TODO.md` item or an updated Future
  Milestones entry) rather than drifting into a speculative fix or feature
  build on an unscoped problem. The mobile bug in particular could easily
  have turned into a quick patch for the empty-team case alone; tracing it
  to the actual missing capability first avoided shipping a narrow fix for
  what's really a design gap.
- **The Tourney Tab research reached a clean negative result** (no live
  source exists) and immediately decided the fallback (hand-maintained
  config) instead of leaving the question open pending a source that was
  never going to appear.

## What didn't go well / friction points

- **The Pokepaste research closed the rumor as false on the first pass,
  then had to self-correct the same day.** The mistake: checking only
  Showdown's current-default client's behavior, which is unaffected, and
  treating that as the whole answer — missing that the rumor was actually
  about the new client already in public beta. A "is X still true/
  supported" question about an external tool needs checking against any
  in-transition/beta state of that tool, not just its current default,
  especially when the rumor itself names a specific version or client.
- **A commit hash reference in `COMPLETED.md` was wrong and needed a
  same-day follow-up fix** (`7bf801c`) — a small bookkeeping slip, not a
  research error, but worth noting since it needed its own commit to
  correct.

## Scope creep observed

None. All three legs stayed within their original research/root-cause
framing; none expanded into implementation, and no adjacent work was pulled
in mid-leg.

## What changes for the next milestone

- **Research methodology:** when confirming or closing a rumor about an
  external tool/service's behavior or format, explicitly check any beta/
  in-transition version of that tool before concluding the stable/default
  behavior is the whole picture — the Pokepaste mistake came from stopping
  at the default client's behavior. Proposed as a new bullet under
  `.claude/rules/external-data-sources.md`'s existing "Research
  methodology" section, since that section already governs how this
  project verifies external facts before hand-authoring config from them.

## Sibling check

No shared bug class applies here — this milestone was docs-only (no sync,
storage-adapter, parsing, or updater code touched), so there's nothing to
flag for GW2-Squaded.
