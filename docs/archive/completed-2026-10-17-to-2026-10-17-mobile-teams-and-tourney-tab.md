# ChoiceBuds - Completed Work Archive (2026-10-17 to 2026-10-17, Mobile Teams & Tourney Tab)

Archived from `COMPLETED.md` at the 2026-10-17 Mobile Teams & Tourney Tab
milestone boundary. Newest entries first.

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
for closure). See commit 4c8c986.

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
