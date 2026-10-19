# Post Mortem: Profile Editing & Visibility Controls

**Shipped:** 2026-10-18 to 2026-10-19 (5 legs, the last split into two
mid-stream redesigns off live feedback).

## What shipped

1. **Profile Section Add-Team Picker — Leg 1** (`a447fcd`) — added a
   "+ Team" box to each Open/Closed teamsheet section; picking a team from
   `AddTeamToProfileDialog.tsx` sets its `visibility` to that tier via the
   normal `updateTeam` path. Sized up from the first pass's compact modal
   after manual verification caught truncated team names and undersized
   sprites.
2. **Profile Section Drag-and-Drop Between Open/Closed — Leg 2** (`27c7ec5`,
   `29f9289`) — a new `useCrossTierReorder.ts` hook (reusing
   `useGridReorder`'s pure slot math) lets a drag cross the Open/Closed
   boundary, committing the visibility write before persisting the dropped
   order so a failed write never leaves a team stamped with a `profileOrder`
   for a tier its visibility never joined. `/leg-review`'d clean.
3. **Teams Page Profile-Visibility Indicator — Leg 3** (`fc56340`) — a new
   `TeamVisibilityBadge.tsx` (mirroring `RegulationBadge.tsx`'s shape) on
   `TeamCardHeader.tsx` shows and controls a team's profile-visibility tier
   from the Teams tab itself, always rendered (including Private) so
   visibility is visible at a glance.
4. **Profile Edit Mode: Inline Favorite Pokemon Editing — Leg 4** (`bf5e69f`)
   — gated the profile page's editing controls (visibility dropdowns +
   favorite-Pokemon search) behind an explicit "Edit" toggle, moved
   favorite-Pokemon editing onto its own sprite, and deleted the redundant
   per-team visibility dropdown list outright (Legs 1-3 already covered it).
5. **Profile Section Remove-Team Control — Leg 5** (`c1bafe2`..`c82dab9`) —
   added a per-team "×" to take a team back out of its section. Redesigned
   twice mid-leg off live feedback: first dropped Leg 4's Edit toggle
   entirely (`83960d6`) once it was clear gating editing behind an extra
   click put the page out of step with the rest of the app's always-on-
   editing convention (e.g. `PokemonCard.tsx`'s own permanent "×") — editing
   is now gated only by `isOwnProfile`, and the favorite-Pokemon editor moved
   from an inline search box into a `Modal.tsx` popup opened by clicking the
   sprite. That surfaced two further bugs: the popup's search-results
   dropdown was absolutely-positioned and got silently clipped by `Modal.tsx`'s
   `overflow-hidden` panel (fixed by making it render in-flow), and
   `ProfileCard.tsx`'s section resync was keyed off a team list that included
   client-synthesized "+ Team" stand-ins, so any first-time add reset back to
   the stale fetch and resurrected teams removed earlier in the same session
   (fixed by keying the resync off the real fetched teams only). Also folded
   in the former Leg 6 ("Profile Add-Team Picker: Live Section Refresh"): a
   new `utils/publicTeamSynthesis.ts::synthesizePublicTeam` builds a
   client-side stand-in for a team with no real `PublicTeam` yet, so "+ Team"
   shows its pick immediately instead of needing a reload.

Full suite at close: 88 test files, 875 tests, lint and type-check clean.

## What went well

- Legs 1-3 each shipped the exact surface scoped at milestone planning
  (picker, cross-tier drag, Teams-tab badge), all converging on the same
  `updateTeam(team.id, { visibility })` call — no rework needed when a
  later leg reused an earlier one's mutation path.
- Leg 2's cross-tier write correctly sequences the visibility write before
  the order write, so a failed visibility update can't leave orphaned
  `profileOrder` state — caught in design, not after a live bug.
- The Leg 5 redesign was driven by your own live feedback against a real
  convention already in the app (`PokemonCard.tsx`'s permanent "×"), not a
  guess — and it was caught and reversed inside the same leg rather than
  shipping and needing a follow-up milestone.
- Leg 6 ("Profile Add-Team Picker: Live Section Refresh") was folded into
  Leg 5 rather than kept as a separate leg once it became clear both were
  touching the same resync logic — avoided doing the same `ProfileCard.tsx`
  surgery twice.

## What didn't / friction points

- Leg 4 built a full Edit-mode toggle (new state in `ProfilePage.tsx`,
  conditional rendering throughout `ProfileCard.tsx`) that Leg 5 then
  deleted outright one leg later. The convention it violated
  (always-on editing, no mode toggle) was already visible elsewhere in the
  codebase (`PokemonCard.tsx`) before Leg 4 was scoped — the milestone's own
  written "Done when" criteria called for the toggle, so this wasn't an
  implementation miss, but the design pivot cost a full built-and-shipped
  leg's worth of code.
- Leg 5 shipped two bugs from its own redesign in the same pass (the
  `Modal.tsx` overflow-clipping, and the overlay-synthesis resurrection bug)
  rather than catching them before the first live-verification pass — both
  were root-caused and fixed the same session, but both were direct
  consequences of the same redesign, not independent issues.
- `useTeams.ts` continues to grow — now 634 lines, up from 588 before this
  milestone, further past CLAUDE.md's 500-line hard cap. Flagged again (now
  a third consecutive milestone) without a split leg being scheduled; moved
  to `TODO.md`'s Unscheduled section as its own scoping item this time
  instead of just a post-mortem note.

## Scope creep observed

- Leg 5 absorbed the originally-separate Leg 6 ("Profile Add-Team Picker:
  Live Section Refresh") — reasonable, since both touched the same
  `ProfileCard.tsx` resync logic, but it means the milestone's actual leg
  count (5, after the fold-in) doesn't match its planned count (4) or its
  mid-milestone peak (6, before the fold-in).
- The milestone's written "Done when" criterion #2 ("editing controls
  hidden by default behind an explicit Edit toggle") was reversed by Leg 5
  rather than met. This was a deliberate, live-feedback-driven design
  decision, not scope creep in the traditional sense, but it's a concrete
  instance of a written acceptance criterion going stale mid-milestone —
  see the rule proposed below.

## What changes for the next milestone

- Before scoping a leg that adds a new UI gating mechanism (an Edit mode,
  a modal, a toggle), check whether the app already has an established
  convention for that interaction elsewhere, the same way `PokemonCard.tsx`'s
  permanent "×" already answered the always-on-vs-toggled-editing question
  before Leg 4 was ever scoped. Would have avoided building and then
  deleting the Edit toggle one leg later.
- `Modal.tsx`'s `overflow-hidden` panel silently clips any
  absolutely-positioned child (e.g. a search-results dropdown) — now a
  known pitfall; any future modal content with its own floating/dropdown
  element needs to render in-flow or `Modal.tsx` needs a documented escape
  hatch.
- When a UI list resyncs its local order state off a fetched list, resync
  only off genuinely-fetched records — never a list that's been merged with
  client-synthesized placeholders — or a placeholder's appearance/
  disappearance can trigger a reset back to stale server state and silently
  undo a same-session edit. This is a fresh instance of the project's
  existing "snapshot vs. live state" bug class (see
  `docs/postmortems/profile-system-revamp-previews-and-import.md` for the
  stored-`spriteUrl` version), just on a sync-state axis instead of a
  per-field one.
