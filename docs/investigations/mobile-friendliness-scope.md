# Mobile-Friendliness Pass — Scoping Session

Scoped 2026-09-30, once Full Web Feature Parity shipped and every Sidebar tab
had a real page on web (the gating condition this item was left waiting on -
see `TODO.md`'s Future Milestones entry). Goal: survey how far the current
renderer is from working on a phone-sized touch viewport, and split what's
needed into concrete build legs.

## Survey: how far off is the app today

Grepped the whole live renderer (excluding `_archived/`) for any responsive
breakpoint usage (`sm:`/`md:`/`lg:`/`xl:` Tailwind prefixes) and found almost
none - only `TeamsPage.tsx`/`TeamCard.tsx` (the `@container`-based card grid
from the Team Card Grid Layout Re-check item) and `VgcPasteCatalogRow.tsx`/
`StatisticsPage.tsx` use any breakpoint-scoped classes at all. The rest of the
app - every page, every modal, every card - was built with a single desktop
layout and no viewport-conditional variant. This is a from-scratch pass, not
a tuning pass.

Three distinct problems turned up, not one:

**1. Touch drag-and-drop is completely broken, not just cramped.** Reordering
(team roster, moves, the Calc team tray) is implemented with native HTML5
drag-and-drop - the `draggable` attribute plus `dragstart`/`dragover`/`drop`
events, with a MIME-type payload (`utils/dragTypes.ts`-style). That browser
API never fires on touch at all; touch devices get no drag events whatsoever,
not degraded ones. Confirmed across 6 files: `PokemonCard.tsx` (roster
reorder - see its own inline comment on the click-vs-drag disambiguation
history), `TeamCard.tsx`, `BoxCard.tsx`, `CalcTeamTray.tsx`,
`MoveBubbleGrid.tsx` (move-bubble drag), `EditablePokemonCore.tsx`. This is a
functionality break, not a polish item - it's the highest-severity finding
here.

**2. Hover-dependent content is unreachable on touch.** `Tooltip.tsx` and
`FloatingCardPanel.tsx` (the shared floating-popup primitives - see their own
header comments) are driven entirely by `onMouseEnter`, with the trigger's
`getBoundingClientRect()` captured on hover-enter. There's no tap-to-show
equivalent. Found 3 direct `onMouseEnter` call sites (`MoveBubbleGrid.tsx`,
`AbilityCapsule.tsx`, `ItemSpriteBox.tsx`) plus 4 more files consuming
`Tooltip`/`FloatingCardPanel` (`RealSetsButton.tsx`, `StatsColumn.tsx`,
`EditOverlays.tsx`, `TooltipContent.tsx`). Same severity tier as #1 - on a
touch-only device this content simply never appears, it doesn't just require
an extra tap.

**3. No mobile nav pattern.** `Sidebar.tsx` is a fixed-width rail (208px
expanded / 68px collapsed via the existing collapse toggle, see its own
header comment) with no breakpoint-driven mobile variant. On a phone
viewport, that's a large fixed chunk of very limited horizontal space gone
permanently, with no built-in way to reclaim it.

Confirmed via `package.json`: `framer-motion` (`^13.1.1`) is already a
dependency, used elsewhere in the app for modal/sidebar-width animation
(`config/motion.ts`). Its `Reorder.Group`/`Reorder.Item` primitive handles
touch/pointer drag natively, which matters for #1's decision below - no new
package needed for that path.

**Explicitly out of scope / already tracked elsewhere** (checked during this
survey so this pass doesn't duplicate them):
- General web `<main>` content-area padding gap - a plain desktop-browser
  layout issue (`AppWeb.tsx`'s `<main>` has no padding, unlike `App.tsx`'s),
  unrelated to touch/viewport-size concerns. Stays its own Future Milestones
  entry.
- Team Card Grid Layout Re-check - about small *desktop* window widths (a
  resized Electron window down to ~1040px), not phone-sized touch
  viewports. Separate concern, stays `Blocked` on the MacBook re-verify.

## Decisions (asked live, 2026-09-30)

**Touch drag-and-drop fix: swap to framer-motion's `Reorder` primitive**
(over `dnd-kit` or touch-only fallback controls). No new dependency - reuses
what the app already pulls in for other animation - at the cost of a real
rewrite of drag logic in all 6 affected files, and the drag feel/animation
changing from the current native-DnD implementation (for desktop mouse users
too, since this replaces the mechanism outright rather than branching by
input type).

**Mobile nav: hamburger / slide-out drawer** (over a bottom tab bar or an
auto-collapsed icon rail). Reuses `Sidebar.tsx`'s existing nav-item
list/footer-slot content almost as-is behind a breakpoint-gated
show/hide + overlay, rather than building a new layout pattern. Avoids the
bottom-tab-bar's own problem (7 tabs don't fit one without an overflow
menu) and the collapsed-rail option's remaining issues (still 68px of fixed
width permanently gone, and its icon-only buttons weren't sized as tap
targets).

No separate decision needed for #2 (hover-dependent content) - a tap-to-show
equivalent is the only sensible fix for content that's otherwise
unreachable, not a design choice between alternatives.

## Resulting legs

Ordered by severity first (the two functionality-breaking touch issues before
any layout work), then by what's foundational (reclaiming nav width before
auditing page layouts that assume it), then remaining layout audits in
traffic-priority order:

1. **[Touch Drag-and-Drop: Framer Motion Reorder] — Leg 1** - replace native
   HTML5 `draggable`/`dragstart`/`dragover` reordering with framer-motion's
   `Reorder.Group`/`Reorder.Item` across `PokemonCard.tsx`, `TeamCard.tsx`,
   `BoxCard.tsx`, `CalcTeamTray.tsx`, `MoveBubbleGrid.tsx`,
   `EditablePokemonCore.tsx`. Restores basic reorder functionality on touch;
   also changes desktop's drag mechanism/feel since this is a full swap, not
   a touch-only branch.
2. **[Touch-Accessible Hover Content] — Leg 1** - add a tap-to-toggle
   equivalent to `Tooltip.tsx`/`FloatingCardPanel.tsx` so touch users can
   reach the content currently gated behind `onMouseEnter`, across the 7
   files identified in the survey above. Self-contained, no dependency on
   the other legs.
3. **[Mobile Nav Shell: Drawer] — Leg 1** - rework `Sidebar.tsx` to collapse
   into an off-canvas drawer below a chosen breakpoint, opened by a
   hamburger trigger, reusing its existing nav-item list and `renderFooter`
   slot. Foundational for the layout-audit legs below - they're auditing
   against a nav shell that's about to reclaim most of its fixed width on
   small viewports.
4. **[Responsive Layout Audit: Teams & Box] — Leg 1** - the two
   highest-traffic surfaces: `TeamsPage`/`TeamCard`/`PokemonCard`'s card
   grid and edit overlays, and `BoxPage`/`BoxCard`. Depends on Leg 3 for a
   real nav width to design against.
5. **[Responsive Layout Audit: Calc & Modals] — Leg 1** - `CalcPopup` and
   the shared `Modal.tsx`-based modals (Import/Export/PDF/Image, the
   item/move/ability/nature pickers). `Modal.tsx`'s overlay shell already
   shrinks to viewport width via its `w-full` panel, so the real risk here
   is internal fixed-width content (stat tables, picker grids) forcing
   horizontal scroll at phone widths, not the modal shell itself.
6. **[Responsive Layout Audit: Remaining Pages] — Leg 1** - Battle Log,
   Statistics, Settings, Type Matchup, Speed Tiers. Lower traffic and less
   data-dense than Teams/Box/Calc, grouped into one leg rather than five
   separate ones on that basis - split further mid-leg if any one of them
   turns out to need disproportionate work.

Touch-target sizing (buttons/icons sized for mouse precision rather than a
~44px tap target) isn't its own leg - it's a cross-cutting concern folded
into whichever leg touches a given surface (Leg 3 for the nav's own icon
buttons, Legs 4-6 for each page's controls) rather than a separate pass.
