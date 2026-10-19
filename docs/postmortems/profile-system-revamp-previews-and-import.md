# Post Mortem: Profile System Revamp: Previews & Import

**Shipped:** 2026-10-18 (single-day milestone, 5 legs across 3 done-when
criteria plus a same-day UI consistency pass).

## What shipped

1. **Save/Import a Team From a Profile — Leg 1** (`e18f589`) — added an
   "Import to my Teams" action on any open-teamsheet team shown on someone
   else's profile (own profile and closed-teamsheet teams excluded).
   `ProfilePage.tsx` converts the `PublicTeam`'s Pokemon into
   `ShowdownPokemon` (new `utils/profileTeamImport.ts`, unit-tested) and
   runs them through the normal `enrichPokemonWithAPI` -> `useTeams().
   addTeam()` pipeline. This closed the milestone's first done-when
   criterion. Manually verified live against a real test account
   (`cbtestimport`).
2. **Drag-to-Rearrange Previewed Teams — Leg 2** (`74e8d3e`, `c3ddc7c`) —
   gave the profile page's team preview its own drag-to-reorder order via a
   new `Team.profileOrder` field, kept deliberately separate from the
   private Teams tab's `sortOrder`. `useTeams.ts`'s new
   `setProfileTeamOrder` stamps it only on the dragged teams; the Worker's
   new `sortTeamsForProfile` applies it before `GET /profile/:username`
   responds, so owner and visitor views agree. A follow-up commit fixed a
   z-index stacking glitch (a dragged card briefly painting behind a taller
   open-tier sibling) found during manual verification. `/leg-review`
   passed clean.
3. **Profile Page Sections & Layout — Leg 3** (`634cbfb`, `c142488`,
   `04f7970`) — split previewed teams into separate "Open Teamsheets"/
   "Closed Teamsheets" sections, each owning its own drag-reorder scope so
   a drag never crosses tiers, plus a localStorage-backed grid/list layout
   choice. This closed the milestone's second done-when criterion. Two
   follow-up fixes landed during manual verification: the per-Pokemon grid
   was capped at 3 columns in a narrow fixed-width column (switched to a
   `@container`-keyed grid that reaches 6 columns with room), and public
   profile sprites were resolving from a Team Pokemon's stale, never-
   shiny-aware stored `spriteUrl` field instead of the live `pokedexNumber`/
   gender/shiny the rest of the app renders from.
4. **Regulation Filter on Profile Page — Leg 4** (`af764a6`) — added a
   pill-row regulation filter to `ProfileCard.tsx`, narrowing both
   teamsheet sections down to one regulation at a time, shared by the
   in-app profile page and the standalone `/u/<username>` route. This
   closed the milestone's third and final done-when criterion. First pass
   gated the pill row on 2+ regulations being present; switched to always
   rendering every option once flagged live, matching `TeamsPage.tsx`'s
   own Format Filter Buttons convention exactly.
5. **Profile Previews UI Consistency Pass — Leg 5** (`a81c40a`) — brought
   Legs 1-4's one-off styling in line with established patterns elsewhere
   in the app (drag handle sizing/color, regulation badge padding, filter
   pill heights, per-type glow rings on Pokemon tiles). Four further asks
   that came up during manual review (an Edit-mode toggle, a "+ Team" add
   picker, drag-and-drop between Open/Closed tiers, a Teams-page
   visibility indicator) were split out to `TODO.md`'s Unscheduled section
   rather than folded in, since they're new interaction models, not a
   consistency fix.

Full suite at close: lint/type-check/test all pass — 86 renderer test files
(866 tests).

## What went well

- All three done-when criteria mapped to exactly one leg each (Leg 1, Legs
  2-3, Leg 4), with the sequencing (import -> reorder -> sectioning ->
  filtering) letting each leg build on the previous one's output with no
  rework — same pattern the Foundation milestone's post mortem noted
  worked well.
- Styling/consistency issues found during manual verification across Legs
  2-4 were fixed inline when small (z-index stacking, grid column count,
  stale sprite data) but correctly batched into a dedicated Leg 5 instead
  of being patched one-off per leg, once the pattern of "this doesn't quite
  match the rest of the app" kept recurring.
- New asks that surfaced during Leg 5's manual review (Edit-mode toggle,
  add-team picker, cross-tier drag-and-drop, Teams-page indicator) were
  split to Unscheduled rather than scope-creeping the consistency pass,
  since they're new interaction models rather than visual fixes.

## What didn't / friction points

- The stale-sprite bug found in Leg 3 was a Team Pokemon's stored
  `spriteUrl` field (captured once at import time, never shiny-aware)
  being read directly on the public-profile path instead of recomputed
  live from `pokedexNumber`/species/gender/shiny, the way every real
  on-screen card in the renderer already does. It's a different mechanism
  from the sync-merge migration gap
  (`docs/investigations/teamcard-notes-sync-race.md`) and `useSettings.ts`'s
  shallow-backfill bug, but the same underlying shape: a new read path
  over existing persisted data trusted a stored field instead of checking
  whether it was a live source-of-truth field or a stale snapshot.
- `useTeams.ts` picked up another field (`profileOrder`) and a new mutator
  (`setProfileTeamOrder`) this milestone, continuing its growth past
  CLAUDE.md's 500-line hard cap (already flagged as an Unscheduled item
  out of the Foundation milestone). No leg here budgeted a split either,
  so the file kept growing through a second consecutive milestone.

## Scope creep observed

None against the milestone's three done-when criteria. Leg 5's four
UI-review asks (Edit-mode toggle, add-team picker, cross-tier drag-and-
drop, Teams-page visibility indicator) were correctly split to Unscheduled
rather than absorbed into this milestone.

## What changes for the next milestone

- When a new read path (a public API endpoint, a new display surface) is
  added over existing persisted data, check whether the field it reads is
  a stored/cached snapshot rather than a canonical source field before
  trusting it — new rule proposed below.
- `useTeams.ts` has now grown across two consecutive milestones without a
  split leg being scheduled. Treat it as a standing low priority item to
  actually schedule, not just note, the next time a milestone's scope
  allows room for a maintenance leg.
