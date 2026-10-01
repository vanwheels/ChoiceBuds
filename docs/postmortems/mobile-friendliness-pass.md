# Post-mortem: Mobile-Friendliness Pass

**Date:** 2026-09-30 (one day, nine legs). **Status:** Shipped. Not a clean
`git log` range like some prior milestones - this day also carried unrelated
work (the sync Worker's KV→R2 migration, a sync-debounce fix, and the
v0.9.0 release cut), interleaved commit-by-commit with this milestone's own.
Full implementation detail for every item below lives in its own
`COMPLETED.md` entry; this doc is the retrospective, not a restatement.

## What shipped

Two scoping passes (the original 6-leg survey, plus a mid-milestone addition
Vanny raised live), nine build legs total:

1. **Scoping.** Grepped the whole renderer for responsive breakpoint usage
   and found almost none - a from-scratch pass, not a tuning one. Found
   three distinct problems, not one: native HTML5 drag-and-drop never fires
   on touch at all (6 files), `Tooltip`/`FloatingCardPanel`'s hover-only
   content is unreachable without a mouse (7 files), and `Sidebar.tsx` had
   no mobile nav pattern at all. Full reasoning in
   [docs/investigations/mobile-friendliness-scope.md](../investigations/mobile-friendliness-scope.md).
   See commit `9763c10`.
2. **Touch Drag-and-Drop: Framer Motion Reorder.** Replaced native HTML5
   `draggable`/`dragstart`/`dragover` reordering with framer-motion's
   `Reorder.Group`/`Reorder.Item` (already a dependency, no new package)
   across `PokemonCard.tsx`, `TeamCard.tsx`, `BoxCard.tsx`,
   `CalcTeamTray.tsx`, `MoveBubbleGrid.tsx`, `EditablePokemonCore.tsx` - a
   full swap, not a touch-only branch, so desktop's drag feel changed too.
   See commit `4f17467`.
3. **Touch-Accessible Hover Content.** Added tap-to-toggle (long-press, per
   Vanny's live call) as hover's analog for `Tooltip`/`FloatingCardPanel`
   consumers. Narrowed from the scoped 7 files to 4 real changes once 3
   turned out to already be tap-friendly or not own any hover wiring. See
   commit `96f9797`.
4. **Mobile Nav Shell: Drawer.** `Sidebar.tsx` now hides the rail entirely
   below `md` (768px) and replaces it with a hamburger trigger + off-canvas
   drawer, self-contained in that one component. Needed three live-verified
   follow-up fixes the same day (fixed-vs-in-flow positioning, hamburger/
   brand placement, a duplicate brand render) before it was actually right.
   See commits `a8256d9`, `56680da`, `c1584df`, `0d306a5`.
5. **Responsive Layout Audit: Teams & Box.** `TeamCard`'s header now stacks
   vertically below `md`; its expanded roster grid gained two new
   container-query tiers. Live mobile testing on Vanny's iPhone 16 the same
   day turned up three more real bugs, all fixed immediately rather than
   queued: `TeamOverflowMenu`'s dropdown had no viewport clamp (unreachable
   overflow content), the floating Calc launcher covered page content at the
   bottom of a phone viewport, and a single empty team/short Box left zero
   scroll overflow (iOS Safari gets stuck on that). See commits `b0c6581`,
   `782ed74`, `85a3195`, `0d26c44`.
6. **Mobile Teams & Box Card View (scoping + 3 legs).** Raised live by
   Vanny right after Leg 5 shipped - a different ask than that leg's
   overflow fixes: the grid/list-of-cards pattern itself isn't right for a
   phone. Scoped into: a page-aware mobile top-bar mechanism
   (`useMobileHeaderActions`), a full-screen swipeable `PokemonCard` +
   compact Teams list, and a Box-flavored compact grid + swipe deck sibling.
   Each of the latter two caught and fixed a real bug live via run-desktop
   (an infinite-render-loop, a render-time clamp bug) before shipping. See
   commits `91d3401` (scoping), `438a871`, `150be1c`, `004b389`.
7. **Responsive Layout Audit: Calc & Modals.** Survey found `Modal.tsx` and
   most of its modals already fluid; the two real culprits were
   `CalcMoveGrid.tsx`'s non-wrapping move rows and
   `TeamExportImageModal.tsx`'s fixed 6-column poster grid. See commit
   `eace312`.
8. **Responsive Layout Audit: Remaining Pages.** Settings and Speed Tiers
   were already fluid. Real fixes: `PastBattlesList`'s grid used a fixed
   `minmax(420px, 1fr)` wider than any phone viewport; several
   `flex-1 truncate` name spans across Statistics/Type Matchup were missing
   `min-w-0`, and two of those rows needed their other fixed-width elements
   narrowed/replaced once `min-w-0` exposed how little room they actually
   left. See commit `ada485c`.

Every page in the app is now at least minimally usable at phone width, and
the two functionality-breaking touch gaps (drag-and-drop, hover content) are
fully fixed rather than just made less cramped.

## What went well

- **Doing the two functionality-breaking touch gaps first, before any
  layout work**, meant the rest of the milestone was pure polish - nothing
  found later turned out to be a second hidden "doesn't work at all on
  touch" issue.
- **Live mobile testing surfaced real bugs the static-code survey couldn't
  have caught** (the overflow-menu clamp, the Calc launcher placement, the
  iOS Safari stuck-scroll case, two separate render-loop/render-time-clamp
  bugs) - each was fixed immediately rather than filed and deferred, keeping
  the milestone's own legs from reopening later.
- **The `min-w-0` pattern recurred across three separate legs** (Teams &
  Box, Mobile Teams & Box Card View, Remaining Pages) once the first
  instance was found - a flex item's default `auto` min-width silently
  blocking `truncate` turned out to be the single most common root cause in
  this entire milestone, more than any one component's own design.
- **Narrowing survey scope live, repeatedly** (Hover Content's 7→4 files,
  Calc & Modals' "it's just two culprits, not the modal shells"), kept each
  leg smaller than its own scoping doc predicted, rather than padding out
  changes to match the original estimate.

## What didn't go well / friction points

- **Mobile Nav Shell: Drawer needed three follow-up fixes on the same day**
  before it actually worked right (positioning, trigger/brand placement, a
  duplicate render) - the first implementation wasn't live-verified closely
  enough before being called done. Later legs in this milestone did verify
  more thoroughly via `run-desktop` before shipping, which is likely why
  they needed fewer same-day follow-ups.
- **A scope addition arrived mid-milestone** (Mobile Teams & Box Card View) -
  handled cleanly by folding it into the same milestone rather than starting
  a second one, but it meant the milestone's actual leg count (9) ended up
  50% larger than the original scoping doc's 6, which is worth remembering
  next time a milestone's scope is estimated from a single survey pass.
- **This day's commits are not a clean range** - unrelated work (sync Worker
  R2 migration, a sync-debounce fix, the v0.9.0 release cut) landed
  interleaved with this milestone's own commits, which made reconstructing
  "what belongs to this milestone" after the fact require walking individual
  commit messages rather than a single `git diff` boundary.

## Scope creep observed

- The three live-fixed bugs in Leg 5 (`TeamOverflowMenu` clamp, Calc
  launcher placement, iOS Safari stuck-scroll) and the two render bugs
  caught in the Mobile Teams & Box Card View legs were not scope creep in
  the harmful sense - each was a real, user-blocking bug surfaced by this
  milestone's own live testing, fixed in the same session it was found
  rather than left to accumulate. Consistent with this project's standing
  practice of fixing a live-discovered blocking bug immediately rather than
  always deferring to a new TODO item.

## What changes for the next milestone

- **Discovered-but-deferred work from this milestone, left for the next
  scoping pass to pick up (or not):** `TODO.md`'s Unscheduled section still
  carries the Web TeamCard Expand Infinite-Loop Bug (a 4+-Pokémon,
  narrower-than-768px React render loop, found live during Leg 5 but not
  yet root-caused) and the open-ended UI Shift Assessment Sweep.
- **Verify new mobile layout work live before calling a leg done**, not
  just via DOM-geometry checks - Mobile Nav Shell: Drawer's three same-day
  follow-ups suggest the earlier legs in a milestone are more likely to need
  a second pass than later ones, once live-verification habits catch up.
- **When a milestone's survey is a single point-in-time pass, expect the
  user to add scope live once they see the first few legs ship** - this
  happened twice in one day here (Vanny raising Mobile Teams & Box Card View
  right after seeing Teams & Box's layout audit). Budget for it rather than
  treating the original scoping doc's leg count as final.
