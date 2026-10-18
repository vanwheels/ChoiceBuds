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
- [docs/archive/completed-2026-10-17-to-2026-10-17-mobile-teams-and-tourney-tab.md](docs/archive/completed-2026-10-17-to-2026-10-17-mobile-teams-and-tourney-tab.md)
  (the Mobile Teams & Tourney Tab milestone's three legs, split out at the
  2026-10-17 Mobile Teams & Tourney Tab boundary - named with the milestone
  slug since it shares its date range with the Bug Fix & Research Sweep
  archive above)
- [docs/archive/completed-2026-10-17-to-2026-10-17-public-profiles-and-team-sharing.md](docs/archive/completed-2026-10-17-to-2026-10-17-public-profiles-and-team-sharing.md)
  (the Public Profiles & Team Sharing milestone's four legs, split out at
  the 2026-10-17 Public Profiles & Team Sharing boundary - named with the
  milestone slug since it shares its date range with the Mobile Teams &
  Tourney Tab archive above)

## Scoping Sweep

- **[Scoping Sweep] — Leg 1** (2026-10-18). Decided against building an
  automated periodic Serebii diff-check poll for Tourney Tab: Schedule
  Change Detection — stays fully manual. Two reasons: TPCi's irregular
  announcement cadence means even a fixed interval would still lag real
  changes (this past week added 2 unannounced Regionals mid-season), and a
  poll would need a scraping exception `external-data-sources.md`'s
  exception #2 deliberately withholds (manual research only, never a live/
  automated scrape against Serebii's unstable HTML). No code changed
  (scoping-only leg); see
  `docs/investigations/tourney-tab-schedule-source-research.md`'s new
  "Automated diff-check poll" section. See commit `<pending>`.
- **[Scoping Sweep] — Leg 2** (2026-10-18). Decided to wait on adding
  `teams.pokemonshowdown.com/api`'s `getteam` endpoint as a second
  Pokepaste-Import source for the new Showdown client's team-share links.
  Live-verified the endpoint is real and needs no account/auth for reads
  (resolving the autoconfirmed-account worry from the original scoping),
  but its payload is Showdown's packed team format, not export text —
  `services/parser.ts` doesn't understand that shape, so this needs a
  net-new unpacker, not a quick parallel fetch like `services/pokepaste.ts`.
  Demand is also unconfirmed: the new client is still opt-in beta, not
  default. No code changed (scoping-only leg); see
  `docs/investigations/pokepaste-format-research.md`'s "Second import
  source: add now or wait?" section. See commit `<pending>`.
