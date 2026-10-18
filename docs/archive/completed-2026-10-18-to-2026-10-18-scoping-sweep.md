# ChoiceBuds - Completed Work Archive (2026-10-18 to 2026-10-18, Scoping Sweep)

Archived from `COMPLETED.md` at the 2026-10-18 Scoping Sweep milestone
boundary. See `docs/postmortems/scoping-sweep.md` for the retrospective.

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
  "Automated diff-check poll" section. See commit `1326162`.
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
  source: add now or wait?" section. See commit `69144e8`.
- **[Scoping Sweep] — Leg 3** (2026-10-18). Decided not to build a shared
  public team browse/upload database. The real blocker isn't moderation
  model choice so much as what hosting it would require: every Worker
  feature shipped so far is self-hosted per account (each user runs their
  own Cloudflare Worker/KV/R2), and a shared browse/upload surface would be
  this project's first centrally-hosted, publicly-writable service —
  pushing hosting cost and an unbounded moderation obligation (reports/
  takedowns, with no admin tooling or staff) onto the solo maintainer, for a
  hobby-scale project with no demand signal beyond the original idea.
  `/u/<username>` (shipped the same day as the original scoping) already
  covers "share my team publicly" without any of that risk. No code changed
  (scoping-only leg); see
  `docs/investigations/public-team-browse-upload-scope.md`. See commit
  `2045642`.
