# Ability-Affects-Move Indicator Scoping — Post Mortem

Milestone: 2026-10-23 to 2026-10-23 (single leg, scoping-only, no code).

## What shipped

A scope doc (`docs/investigations/ability-affects-move-indicator.md`)
covering two related gaps surfaced 2026-10-22/23:

- **Ability-affects-move indicator**: data shape (a new
  `Record<string, AbilityMoveBoostRule>` table alongside the existing
  curated ability-effect tables), which UI surfaces show it
  (`MoveBubbleGrid.tsx` badge + `TooltipContent.tsx` text, both fed once
  from `EditOverlays.tsx`), and what's explicitly out of scope (Calc tab,
  static/export displays).
- **Type Matchup mega toggle**: found the read-wiring already shipped in
  Type Matchup Rework Leg 3 — the real gap is narrower than originally
  framed (no toggle *control* on the page, not missing resolution logic).

All open questions were resolved with Vanny the same day: Sheer Force
hand-curated from Serebii filtered to the Champions movepool, the 5
type-changing abilities' retype power boost folded into the same new
table, the badge is a per-move corner dot (not an ability-level checkbox),
and the Type Matchup toggle needs genuinely independent per-table state
(not a second read of the shared `usePokemonFormToggle` store).

## What went well

Re-reading the actual Type Matchup code during scoping (rather than taking
the TODO item's framing at face value) found the coverage tables already
resolve active Mega forms correctly via Type Matchup Rework Leg 3's
wiring — this avoided sizing a build leg around re-deriving logic that
already exists, narrowing the real remaining work to a UI-affordance
addition.

## What didn't / friction points

- The Type Matchup toggle's "independent per-table state" requirement only
  surfaced during the Q&A pass, not in the doc's first draft, which had
  assumed reusing the shared store. It's flagged explicitly in the doc as
  a scope increase, but it's worth noting the first-pass framing
  under-scoped it.
- This milestone's single leg was marked done directly in `TODO.md`'s own
  bullets (with resolution notes inline) but never got a `COMPLETED.md`
  entry with a commit hash, unlike the Scoping Sweep milestone's precedent
  (`docs/archive/completed-2026-10-18-to-2026-10-18-scoping-sweep.md`),
  where every scoping-only leg still got a one-line `COMPLETED.md` entry
  citing a commit. `/close-milestone` had to reconstruct that entry
  retroactively from `TODO.md` and `git log` instead of reading it
  straight from `COMPLETED.md`.

## Scope creep observed

None beyond the Type Matchup toggle's per-table state requirement, which
is scope *discovered through scoping itself* (the thing this milestone
existed to do), not creep introduced mid-leg.

## What changes for the next milestone

A scoping-only leg still needs its own `COMPLETED.md` entry (with commit
hash) the same day it's marked done, not just inline resolution notes in
`TODO.md` — `TODO.md`'s own done-when bullets are not a substitute for the
archival record, and the gap only surfaces at close-milestone time when
there's nothing to grep. Converted into a rule below.
