# Tourney tab

Deep-dive split out of `ARCHITECTURE.md`; the summary there links here.

- `src/renderer/config/tourneyEvents.ts` — a hand-authored, config-only table
  of TPCi's sanctioned VGC circuit events (Regionals, Special Events,
  Internationals, Worlds) for the current season, same pattern as the
  Champions balance-override files: sourced from Serebii's `playpokemon`
  pages per `external-data-sources.md` exception #2 (manual research only,
  no live fetch — no official structured schedule API exists, see
  `docs/investigations/tourney-tab-schedule-source-research.md`), and
  refreshed by hand as TPCi announces new season dates rather than on a
  fixed interval. No Global Challenge events or signup deadlines are
  listed — deliberately excluded (not shown on either source page), per the
  file's own header.
- `src/renderer/utils/tourneyEvents.ts::getUpcomingEvents` — pure filter/sort
  over the config, keeping only events that haven't ended yet and ordering
  soonest-first. `components/tourney/TourneyPage.tsx` renders the result via
  `TourneyEventCard.tsx`; tier badge colors live in their own
  `config/tourneyEventTheme.ts` table, mirroring `pokemonTheme.ts`'s
  `REGULATION_THEMES`. Dates parse through `parseISODate` (UTC-anchored) to
  avoid a local-timezone shift misreading an ISO `YYYY-MM-DD` calendar day —
  same treatment `config/seasons.ts` gives its own ISO date strings.
