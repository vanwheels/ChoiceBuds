# Post-mortem: Card UI Polish

**Date:** 2026-09-05 to 2026-09-08. **Status:** Shipped. Boundary: starts
right after the File Size Cap Cleanup post-mortem/archive setup (`git log`
range `1ac6de8..d1250a3`), ends at Pokémon Card Drag Without Handle, the
last leg formally scoped under the "Card UI Polish" name. Full
implementation detail for every item below lives in its own `COMPLETED.md`
entry — this doc is the retrospective, not a restatement.

## What shipped

The formally-named "Card UI Polish" milestone (scoped 2026-09-08, 5 items)
was the tail end of a longer wave of card-focused UI work that started
right after the previous milestone shipped. That earlier wave never got its
own "Current Milestone" header — TODO.md carried it under a generic "In
progress / up next" section for three days before the 5 remaining items got
formally named and scoped — but it's the same thread and belongs in the
same retrospective.

1. **Card popup consistency (3 legs).** `Tooltip.tsx` locked its width to
   the hovered card's own edges instead of centering a fixed box on the
   cursor; item/ability/move pickers moved off their "fills the slot in
   place" pattern onto a new shared `FloatingCardPanel.tsx`; the nature
   field's native `<select>` — the one popup with zero positioning control,
   and the confirmed worst offender — was replaced with a
   `NaturePickerPanel.tsx` on the same primitive.
2. **Always-on editing (2 legs) + supporting UI moves.** Removed the
   `isEditingTeam`/`isEditing` toggle for field-level edits (name, notes,
   nickname, item, ability, moves, nature, EVs — all already committed on
   blur/click with no separate save step), then gave the structural actions
   that toggle used to gate (drag-reorder, delete-slot, swap picker,
   add-Pokémon) their own always-visible triggers. Landed alongside two
   smaller visual moves in the same vein: the team header's coverflow strip
   reverted to a flat, sized-up sprite row, and gender/shiny indicators
   moved off the card footer onto the sprite itself as corner badges.
   Move-slot drag-to-reorder was re-enabled as its own follow-on once a
   dedicated design (not the grip-handle pattern) was worked out for it.
3. **The formally-scoped Card UI Polish batch (5 legs, 2026-09-08).** Delete
   moved to the card's top-right corner (negative offset, outside the
   rounded border); Export moved out of the card entirely into a new
   right-click `ContextMenu.tsx`; `min-w-0` added up the type-badge/SP-row
   ancestor chain to stop overflow at mid container widths; whole-card
   native drag (with an exclusion list for inputs/buttons/tagged elements)
   replaced the grip-handle as the team-slot drag source; a stale
   `Reg M-A/B/C ` name prefix now strips on load instead of only in the old
   read-only header view; and `damageCalcEngine.ts` — pulled out of
   `useDamageCalc.ts` in the previous milestone specifically for testability
   but left untested — finally got its test file.
4. **Everything else landed in the same window:** Regulation M-C Prep Leg 1
   (hand-curated roster/Mega-Stone/regulation-selector support ahead of the
   regulation's actual release), a fix for the item picker silently
   dropping sprite-less items, a fix restoring Baxcalibur's signature move
   (Glaive Rush) after a global movepool-strip rule over-applied to it, Calc
   Auto Ability-Effect Application Leg 3 (Champions ability damage-math
   corrections applied to the calc engine itself, not just its display
   text), and the Release Notes Popup's build leg (a startup "What's New"
   popup plus full history in Settings, sourced from GitHub Release bodies).

## What went well

- **The popup-consistency work built a shared primitive instead of patching
  three symptoms separately.** `FloatingCardPanel.tsx` (and the width-lock
  fix it grew from) fixed the tooltip, item/ability/move pickers, and the
  nature select with one mechanism instead of three one-off positioning
  fixes — the kind of reuse this project's style rules ask for.
- **Always-on editing was legged deliberately** rather than shipped as one
  large toggle-removal: Leg 1 covered field-level edits only, and
  structural actions were explicitly left without a trigger rather than
  forced into a shape that didn't fit yet, with the real design worked out
  in Leg 2.
- **A prior revert's root cause got diagnosed before retrying it.** Drag
  Without Handle's scoping pass traced *why* the earlier whole-card-drag
  attempt (`cb0cc98`) had been ambiguous — not HTML5 drag-vs-click
  disambiguation itself, which already worked cleanly for move-bubble
  drag, but a missing exclusion list for descendant inputs/images — instead
  of re-trying the same shape and hoping it would work this time.
- **A backlog item spun off by the previous milestone's post-mortem got
  closed in this one.** `damageCalcEngine.ts`'s missing test coverage was
  flagged as unresolved follow-through in the last post-mortem's "what
  changes for the next milestone" section and shipped here.

## What didn't go well / friction points

- **Three days of real card-UI work happened with no named "Current
  Milestone" header in TODO.md.** CLAUDE.md's own Task Tracking rules say
  there's no gap where TODO.md has zero current-milestone section once work
  is underway — but between the previous milestone shipping (2026-09-01)
  and this one being formally scoped (2026-09-08 11:55), the section was
  just "In progress / up next" with no name. The work got tracked either
  way (each item still had its own TODO.md entry and re-check counter), so
  nothing was lost, but the milestone boundary had to be reconstructed after
  the fact from git log rather than being visible in the file the whole
  time.
- **A global movepool-strip rule silently ate a signature move.** The
  Baxcalibur/Glaive Rush bug (`565451a`) was a real live-data regression:
  `GLOBALLY_REMOVED_MOVES`'s Showdown-sourced "Past" flag was applied
  uniformly even though the file's own header already documented that the
  flag means "not TM/Tutor-teachable," not "absent from the game." The
  distinction was already written down; the rule just didn't honor it for a
  new species until the bug surfaced live.
- **The context menu and floating-panel primitives were each built from
  scratch mid-milestone** because nothing like them existed yet
  (`ContextMenu.tsx` for Card Action Button Placement,
  `FloatingCardPanel.tsx` for Card Popup Consistency) — not a problem in
  itself, but two new shared UI primitives landing in the same short window
  is worth naming as a pattern: card-level interactions keep needing
  infrastructure the codebase didn't have yet, not just one-off styling.

## Scope creep observed

- **Card Content Overflow's fix surfaced a sibling bug it deliberately
  didn't fix.** The `min-w-0` chain fix for the type-badge/SP-row overflow
  found the same root gotcha in `StatsColumn.tsx`'s EV stat grid and
  `EditOverlays.tsx`'s move-bubble grid at narrower widths, but left it
  filed as a separate, not-yet-scoped TODO.md item instead of expanding the
  leg to cover it — the right call per this project's per-leg scope
  discipline, but worth naming since it's the second time in two milestones
  a card-layout fix has found more of the same bug than it fixed.
- **Always-on editing's structural-trigger design (Leg 2) wasn't part of
  Leg 1's original ask** — Leg 1 shipped field-level edits and explicitly
  deferred the structural-action triggers rather than forcing them into the
  same pass, which is the scope-discipline this project asks for working as
  intended, not creep — noted here only because it's an instance of the
  same "leg N's findings become leg N+1" shape as the overflow item above.

## What changes for the next milestone

- When TODO.md's "current milestone" section goes unnamed for more than a
  session or two even though real legged work is landing, name it early
  rather than only at the point of formally scoping the last few items —
  the boundary is easier to track live than to reconstruct from git log
  after the fact.
- The EV Grid/Move Bubble Overflow item (the sibling bug this milestone's
  Card Content Overflow fix surfaced) is sitting in Unscheduled — worth
  scoping early in the next milestone rather than letting it age, since it's
  the same fix shape already proven out here.
- Keep the "diagnose why the prior attempt failed before retrying it"
  discipline Drag Without Handle used — it's what kept this milestone's
  retry from repeating Always-On Editing Leg 1's exact ambiguity.
