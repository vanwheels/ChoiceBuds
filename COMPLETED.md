# ChoiceBuds - Completed Work Log

Archive of finished work, split out of `TODO.md` (2026-07-08) to keep the
active task list quick to scan. Newest entries first. Cross-references to
still-open items point to `TODO.md`; references to other entries here stay
local ("see below"/"see above").

Archived at milestone boundaries as of the 2026-09-30 split (Post-Parity
Polish - see `MILESTONES.md`), per CLAUDE.md's archiving rules: a shipped
milestone becomes the real cutoff instead of an arbitrary entry count.
Entries prior to this file's oldest are in:
- [docs/archive/completed-2026-06-17-to-2026-07-09.md](docs/archive/completed-2026-06-17-to-2026-07-09.md)
  (the 50 oldest entries as of the 2026-08-31 split)
- [docs/archive/completed-2026-07-09-to-2026-09-01.md](docs/archive/completed-2026-07-09-to-2026-09-01.md)
  (everything through the Battle Logger Re-eval + Data & Process Cleanup
  milestone, split out at the 2026-09-08 Card UI Polish boundary)
- [docs/archive/completed-2026-09-01-to-2026-09-13.md](docs/archive/completed-2026-09-01-to-2026-09-13.md)
  (Card UI Polish through Regular Calc Popup and everything shipped between
  them, split out at the 2026-09-13 Regular Calc Popup boundary)
- [docs/archive/completed-2026-09-13-to-2026-09-30.md](docs/archive/completed-2026-09-13-to-2026-09-30.md)
  (VGCPastes Real-Set Sourcing through Post-Parity Polish and everything
  shipped between them, split out at the 2026-09-30 Post-Parity Polish
  boundary)
- [docs/archive/completed-2026-09-30-to-2026-10-16.md](docs/archive/completed-2026-09-30-to-2026-10-16.md)
  (Web TeamCard Expand Infinite-Loop Bug through Project Revision v2 and
  everything shipped between them, split out at the 2026-10-16 Project
  Revision v2 boundary)
- [docs/archive/completed-2026-10-16-to-2026-10-16.md](docs/archive/completed-2026-10-16-to-2026-10-16.md)
  (the Prettier Adoption milestone's three legs, split out at the
  2026-10-16 Prettier Adoption boundary)
- [docs/archive/completed-2026-10-16-to-2026-10-16-maintenance-code-health-sweep.md](docs/archive/completed-2026-10-16-to-2026-10-16-maintenance-code-health-sweep.md)
  (the Maintenance & Code Health Sweep milestone's seven legs, split out at
  the 2026-10-16 Maintenance & Code Health Sweep boundary - named with the
  milestone slug since it shares its date range with the Prettier Adoption
  archive above)
- [docs/archive/completed-2026-10-16-to-2026-10-17.md](docs/archive/completed-2026-10-16-to-2026-10-17.md)
  (the TeamCard Bug Fixes & Dev Tooling milestone's four legs, split out at
  the 2026-10-17 TeamCard Bug Fixes & Dev Tooling boundary)
- [docs/archive/completed-2026-10-17-to-2026-10-17.md](docs/archive/completed-2026-10-17-to-2026-10-17.md)
  (the Bug Fix & Small Features Sweep milestone's five legs, split out at
  the 2026-10-17 Bug Fix & Small Features Sweep boundary)
- [docs/archive/completed-2026-10-17-to-2026-10-17-mobile-web-ui-polish.md](docs/archive/completed-2026-10-17-to-2026-10-17-mobile-web-ui-polish.md)
  (the Mobile Web & UI Polish milestone's four legs, split out at the
  2026-10-17 Mobile Web & UI Polish boundary - named with the milestone slug
  since it shares its date range with the Bug Fix & Small Features Sweep
  archive above)
- [docs/archive/completed-2026-10-17-to-2026-10-17-bug-fix-research-sweep.md](docs/archive/completed-2026-10-17-to-2026-10-17-bug-fix-research-sweep.md)
  (the Bug Fix & Research Sweep milestone's three legs, split out at the
  2026-10-17 Bug Fix & Research Sweep boundary - named with the milestone
  slug since it shares its date range with the Mobile Web & UI Polish
  archive above)

**[Tourney Tab: UI] — Leg 3** (2026-10-17)
Added the Tourney tab (`components/tourney/TourneyPage.tsx` +
`TourneyEventCard.tsx`), rendering Leg 2's `config/tourneyEvents.ts`
schedule filtered to upcoming events and sorted soonest-first
(`utils/tourneyEvents.ts::getUpcomingEvents`, unit-tested). Tier badges
(Regional/Special Event/International/Worlds) get their own color table in
`config/tourneyEventTheme.ts`, matching `pokemonTheme.ts`'s
`REGULATION_THEMES` pattern. Date ranges/signup deadlines are formatted via
UTC-anchored parsing (`parseISODate`) to avoid a local-timezone shift
misreading an ISO 'YYYY-MM-DD' calendar day, same treatment
`config/seasons.ts` already gives its own ISO date strings. Wired into both
`App.tsx` and `AppWeb.tsx`'s `ActiveTab`/lazy-tab wiring and
`Sidebar.tsx`'s nav list (new `TourneyIcon`, trophy metaphor). This closes
the Mobile Teams & Tourney Tab milestone's second done-when item alongside
Leg 2, and the milestone itself (both items now shipped - see MILESTONES.md
for closure).

**[Tourney Tab: Event Config] — Leg 2** (2026-10-17)
Added `config/tourneyEvents.ts`, a hand-authored table of TPCi's sanctioned
VGC circuit events (Regionals, Special Events, Internationals, World
Championships) for the current season, sourced from Serebii's
`playpokemon/2027.shtml`/`vgc.shtml` pages
(`external-data-sources.md` exception #2) per
`docs/investigations/tourney-tab-schedule-source-research.md`'s resolution
that no live schedule source exists. No Global Challenge events or signup
deadlines are listed - neither source page shows them; both are called out
as deliberately excluded in the file header, same convention as the curated
effect tables. See commit 6a3369a.

**[Mobile Add Pokémon Entry Point] — Leg 1** (2026-10-17)
Added an extra page past the last card in the mobile Teams swipe deck
whenever roster < 6 (opens `AddPokemonStatTable` and appends a new slot),
and replaced the empty-team bail-out-and-auto-close effect with a dedicated
empty-state screen using the same add affordance. Also fixed a latent
z-index bug (`Modal.tsx` was below the mobile swipe overlays, hiding any
dialog opened from within one, including the pre-existing Roster Swap
picker) uncovered while building this. See commit e35e438.

