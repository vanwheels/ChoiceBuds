# Mobile Teams & Box Card View — Scoping Session

Scoped 2026-09-30, raised by Vanny mid-milestone right after [Responsive
Layout Audit: Teams & Box] Leg 1 shipped. That leg fixed overflow/squishing
in the existing desktop-style grid at phone widths; this is a different ask
- the grid/list-of-cards pattern itself isn't the right shape for a phone,
not just cramped. Folded into the current Mobile-Friendliness Pass milestone
per Vanny's call (same subject: the mobile viewing experience for
Teams/Box), as new legs alongside the two Responsive Layout Audit legs
already in `TODO.md`.

## The complaint

Raised live: the page header (title, filters, add-team button) eats 1/4+ of
a phone screen's height before any Pokémon content renders at all. Vanny's
proposed fix: an individual Pokémon card should cleanly fill the screen's
width and height on mobile - "its design almost perfectly emulates a phone
screen to begin with" - and horizontal swipe between a team's mons is a more
natural mobile interaction than vertically scrolling through them.

## Decisions (asked live, 2026-09-30)

**Scope: mobile-only.** Matches the milestone's own framing (phone-sized
touch viewports) - desktop keeps the existing `@container` grid/carousel
from prior legs untouched. Applies below the same `md` (768px) breakpoint
`Sidebar.tsx`'s drawer already uses, so there's one consistent breakpoint
across the whole milestone rather than a second one introduced here.

**Box gets both a swipe deck and a small grid**, not swipe-only. Vanny wants
a compact grid (2-3 columns, ~3 rows visible per screen, sprite + favorite
icon + name only - i.e. `BoxCard.tsx`'s existing collapsed tile, just sized
smaller) as the default Box view, with tapping a tile opening the same
full-screen swipe deck teams use, starting at that entry and paging through
every currently-displayed (search/sort-filtered) build in order. Box has no
per-entry "roster" the way a team does, so the swipe deck's sequence there
is the whole filtered/sorted list, not a sub-grouping.

**Team navigation: list-then-detail, not one continuous scroll.** Teams page
becomes a compact vertical list of team previews (name, format, small sprite
strip - a shrunk version of `TeamCard.tsx`'s existing collapsed header, no
inline Pokémon grid). Tapping a team opens a full-screen overlay: one
`PokemonCard` filling the viewport, horizontal swipe (or paging
controls) through that team's mons, a close affordance back to the list.
Rejected: blending vertical (between teams) and horizontal (within a team)
scroll into one continuous page - confirmed live as the less clear model.

**Mobile top bar layout** (replaces each page's current stacked `<header>`
below `md`; desktop header unchanged):
- Teams: hamburger · "My Teams" · Add Team · Browse Sample Teams · Filter ·
  (search, once Teams gets one - not built yet) · Calc
- Box: hamburger · "Box" · Search · Filter · Calc

Exact icon-vs-label treatment and how "Filter" maps onto each page's
existing filter UI (Teams' format-filter buttons; Box's sort-mode toggle
and/or its `#tag` search) is left to be finalized live during Leg 1's own
implementation, same as how prior legs in this milestone narrowed their
file list mid-build rather than exhaustively speccing it up front.

## Technical note: the top bar isn't page-aware yet

`Sidebar.tsx`'s mobile top bar already has a `mobileTopBarEnd` slot (added
for the Calc launcher relocation, see `COMPLETED.md`), but it's wired once
at the `App.tsx`/`AppWeb.tsx` shell level as a single static node (today:
just the Calc button) - it has no concept of "whichever tab is currently
active wants to render its own buttons here." Getting Teams'/Box's own
action buttons into that shared bar needs a small mechanism for the active
page to register its own content there, e.g. a lightweight context/hook
(`useMobileHeaderActions` or similar) that `TeamsPage`/`BoxPage` call to
publish their buttons, consumed once where `mobileTopBarEnd` is assembled
today. This is an implementation detail for whoever builds Leg 1, not a
design decision - noted here so it doesn't get rediscovered mid-leg.

## Resulting legs

Ordered so the shared full-screen card primitive (the biggest, riskiest
piece) lands before the page that most depends on it:

1. **[Mobile Compact Top Bar: Teams & Box] — Leg 1** - replace each page's
   stacked mobile `<header>` with the hamburger-bar layout above, including
   the page-aware `mobileTopBarEnd` mechanism described above. Self-contained
   - doesn't depend on the card-view work below, could ship independently.
2. **[Full-Screen Swipeable Pokémon Card + Teams List View] — Leg 1** - the
   core new primitive (full-viewport `PokemonCard`, horizontal swipe/paging,
   close affordance), plus reworking Teams' mobile view into the compact
   team-preview list that opens it. The larger of the two remaining legs -
   split further mid-leg if the swipe primitive and the list rework turn out
   not to be one cohesive unit of work.
3. **[Box Mobile: Compact Grid + Swipe Deck] — Leg 1** - Box's small
   sprite/favorite/name grid, plus wiring a tapped tile into the same
   full-screen swipe deck from Leg 2 (paging through the filtered/sorted
   list instead of a team's fixed roster). Depends on Leg 2's primitive
   existing first.

Not addressed by these legs: Box's `#tag` search UI and sort-mode toggle
still need a real "Filter" popover/sheet home on mobile (see the top-bar
note above) - whichever leg builds the top bar decides that mapping, but
redesigning the filter UI itself is out of scope here if it turns out to
need more than fitting it behind a button.
