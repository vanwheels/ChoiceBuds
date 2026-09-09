# Post-mortem: Maintenance & Investigation Sweep

**Date:** 2026-09-08 (single day). **Status:** Shipped. Boundary: `git log`
range `6109611..8709dc7` — starts at the milestone's own scoping commit,
right after Card UI Polish shipped, ends at the commit hash record for Speed
Annotation Leg 1, the last leg formally scoped under this name. Full
implementation detail for every item below lives in its own `COMPLETED.md`
entry — this doc is the retrospective, not a restatement.

## What shipped

The milestone bundled leftover items from the post-Card-UI-Polish scoping
pass that didn't resolve outright during scoping itself, plus a
same-day-reported Windows auto-update bug and a full re-evaluation of Team
Gap Analysis's scope.

1. **Windows auto-update race condition (3 legs).** Leg 1 was pure live
   investigation of a user report ("View Release" sent someone to the
   browser instead of the working in-app installer) — root-caused to a UI
   race between the GitHub-API fallback check and the native `autoUpdater`
   IPC status, not a broken updater. Leg 2 was a design-only pass (confirmed
   with Vanny via `AskUserQuestion`, signal-based gating over a guessed
   timeout) before any code changed. Leg 3 implemented that design and, via
   its own live-verification step, caught a second real bug the design
   didn't anticipate: `sendStatus({ state: 'checking-native' })` fired
   before the renderer had subscribed, so the signal was silently dropped —
   fixed with a pull-then-subscribe pattern instead of a timing heuristic.
2. **Team Gap Analysis re-evaluation and follow-through (7 legs).** A
   scoping-only re-evaluation triaged 5 candidate improvements: 2 closed
   outright as infeasible/premature (regulation-scoped usage data doesn't
   exist yet; usage-cutoff tuning needs real ladder-volume data that isn't
   visible live yet — the latter stayed open as its own Unscheduled item).
   The other 3 became concrete legs: Defensive Ability-Awareness (type
   immunity abilities now factor into gap analysis, spinning off a
   same-day refactor consolidating `moveBlockingAbilities.ts`'s type rules
   against the new shared table), Partial/Scored Gaps (a new "Partially
   Covered" section for threats resisted by exactly one team slot), and a
   re-confirm of the typing-only scope boundary (verdict: no, expand it —
   superseded by a proper redesign rather than reopened as-is). That
   redesign (another scoping-only leg) resolved three open design questions
   and split into two further legs: Moveset+Threat-Ability-Aware Coverage
   (a new "Likely Coverage Gaps" section using each threat's top-ranked
   moves and its own likely ability) and Speed Annotation (a raw base-Speed
   comparison, informational only, added to every threat row).
3. **Two items resolved during scoping itself, no code change.** EV
   Grid/Move Bubble Overflow at extreme narrow widths — the danger zone
   flagged as a risk turned out unreachable at the app's enforced
   `minWidth: 1280` floor, closed as a confirmed non-issue. Automate
   "Mark as Checked" for Champions balance/season data — auditing the two
   relevant hooks showed the automation already exists.

Landed in the same window but out of this milestone's scope: Regulation M-C
Prep's piecemeal dump-3 transcription (a `Blocked` item, tracked
separately — see `TODO.md`).

## What went well

- **Two items closed with zero code during scoping itself** (EV Grid
  Overflow, Mark-as-Checked automation) instead of becoming legs that would
  have implemented fixes for problems that, on inspection, didn't exist —
  the scoping-first discipline paid for itself directly here.
- **The Windows auto-update work split investigation, design, and
  implementation into three separate legs**, each with its own live
  verification rather than a guess-and-ship fix. Leg 3's forced-delay test
  build caught a second bug (the IPC subscribe-ordering drop) that neither
  the design nor the unit tests anticipated — a bug the same shape as the
  one being fixed, one layer lower.
- **Team Gap Analysis Re-evaluation triaged 5 candidates methodically**
  rather than picking the interesting-looking one: two were closed outright
  with a concrete technical reason (no per-regulation usage data source; no
  live usage-volume to tune against yet) instead of being carried forward
  as vague maybes, and the rest were split into legs sized to what each
  actually needed (a design-only leg before either coverage-gap
  implementation leg started).
- **The Ability/Moveset/Speed-Aware Redesign scoping leg resolved all three
  of its open design questions before any implementation leg started**,
  including explicitly deciding speed stays informational-only rather than
  gating verdicts — avoiding an implementation leg that would have had to
  guess at unresolved product questions mid-build.

## What didn't go well / friction points

- **The milestone flagged itself as "possibly done" twice and grew past it
  both times.** After Partial/Scored Gaps shipped, TODO.md explicitly
  flagged the milestone for Vanny to confirm closure — instead, Moveset+
  Threat-Ability-Aware Coverage and Speed Annotation were pulled in from
  Unscheduled once the redesign scoping made them concrete, and the same
  "flagged for confirmation" note reappeared at the end. Not wrong — the
  redesign leg's own findings genuinely produced new, in-scope work — but
  worth naming as a pattern: a milestone can look closed from its "no
  scheduled legs left" state while a sibling scoping leg is still actively
  generating more of them.
- **A same-day COMPLETED.md entry carries a future date.** The Windows Not
  Triggering Leg 1 entry is dated 2026-09-09; its commit (`b50db46`) is
  timestamped 2026-09-08 like everything else in this milestone — a
  transcription slip, corrected as part of this closeout rather than left
  for a future re-check to trip over.
- **Both real bugs this milestone found (the GitHub-API/native update race,
  and the IPC subscribe-ordering drop within its own fix) surfaced only
  through live verification, not the unit test suite** — worth naming since
  it's a second data point (after Card UI Polish's Drag Without Handle) that
  this codebase's race-condition-shaped bugs aren't reliably caught by
  Vitest alone.

## Scope creep observed

- **Move-Blocking Abilities: Consolidate Type-Immunity List wasn't part of
  the milestone's original scoping pass** — it emerged from Defensive
  Ability-Awareness's own new `typeImmunityAbilities.ts` table revealing a
  second hand-typed copy in `moveBlockingAbilities.ts`, and was split into
  its own leg rather than folded into Defensive Ability-Awareness — correct
  per this project's scope discipline, but the second instance this
  half-year of a leg's own new shared table surfacing a sibling duplicate
  worth naming as a recurring shape.
- **The milestone's total leg count roughly doubled mid-way** (Team Gap
  Analysis Re-evaluation alone produced 2 closures + 3 legs, one of which
  then produced 2 more) — all individually justified and correctly tracked
  in TODO.md at each step, not silent scope absorption, but a useful data
  point for sizing future "leftover items" milestones: a re-evaluation leg
  can outgrow the bundle it started in.

## What changes for the next milestone

- When a milestone's TODO.md section reaches "no scheduled legs, flagged
  for confirmation" a second time in the same milestone, that's a signal
  the milestone's actual boundary was a re-evaluation/redesign thread, not
  a fixed bundle — consider naming re-evaluation-driven work its own
  milestone up front next time, rather than bundling it into a leftover-
  items sweep that then has to keep re-flagging itself closed.
- Live Calc: Damage-Based Stat Inference Tab is next in the Future
  Milestones queue and explicitly needs its own dedicated design-questions
  pass before it turns into legs — start that pass as its own session
  rather than folding it into whatever "current" work is happening at the
  time, per Vanny's existing note on that item.
- The Speed Calc-like Feature concept (also deferred, needs its own
  differentiation-focused design pass before scoping) and the two
  Unscheduled items that stayed unscheduled this milestone (Usage Cutoff
  Tuning, UI Shift Assessment Sweep) are all still sitting without a
  concrete next step — worth revisiting which of them, if any, should be
  the next formally-named milestone versus staying backlog.
