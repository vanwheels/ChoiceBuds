/**
 * tourneyEvents.ts - Curated VGC Tournament Schedule
 *
 * Hand-maintained calendar of TPCi's own sanctioned/sponsored VGC (Video
 * Game Championships) circuit events - Regionals, Special Events,
 * Internationals, and the World Championships. No live/structured schedule
 * source exists for this (the official Play! Pokémon Event Locator is a
 * venue locator, not a majors calendar, and fan trackers like pokedata.ovh/
 * dittobase.com are unofficial scrapers with no documented public API) -
 * see docs/investigations/tourney-tab-schedule-source-research.md for the
 * full source evaluation. Same hand-authored, periodically-refreshed
 * pattern as config/championsMoveOverrides.ts, sourced from Serebii's
 * playpokemon pages (external-data-sources.md exception #2 - manual
 * research only, never a live fetch):
 *   https://www.serebii.net/playpokemon/2027.shtml
 *   https://www.serebii.net/playpokemon/2027/vgc.shtml
 * both read 2026-10-17 for the current (Sep 2026-Aug 2027) season.
 *
 * DELIBERATELY EXCLUDED:
 *   - Global Challenge (online) events - Serebii's schedule pages carry no
 *     Global Challenge rows for this season; add them once a source lists
 *     specific dates rather than inferring a recurrence.
 *   - Signup/registration deadlines - neither Serebii page shows these for
 *     any event. The `signupDeadline` field exists for when a source
 *     surfaces one (TPCi's own event-page announcements sometimes state
 *     one closer to the event), not populated for any entry yet.
 *   - TCG-only and Pokémon GO events - this table is VGC only.
 *   - Past events (anything that ended before this file's last refresh
 *     date above) - this is a forward-looking schedule, not a historical
 *     archive.
 *
 * This is a living document, same refresh discipline as seasons.ts: re-check
 * when TPCi announces a new batch of Regionals/Internationals dates or a new
 * season's Worlds date, not on a fixed calendar interval.
 */

export type TourneyEventTier = 'regional' | 'special' | 'international' | 'worlds';

export interface TourneyEvent {
  id: string;
  name: string;
  tier: TourneyEventTier;
  city: string;
  country: string;
  /** ISO 'YYYY-MM-DD', inclusive. */
  startDate: string;
  /** ISO 'YYYY-MM-DD', inclusive. */
  endDate: string;
  /** ISO 'YYYY-MM-DD'. Omitted when not known - see header. */
  signupDeadline?: string;
}

export const TOURNEY_EVENTS: TourneyEvent[] = [
  {
    id: '2026-baltimore-regional',
    name: 'Baltimore Regional Championships',
    tier: 'regional',
    city: 'Baltimore, MD',
    country: 'United States',
    startDate: '2026-09-18',
    endDate: '2026-09-20',
  },
  {
    id: '2026-frankfurt-regional',
    name: 'Frankfurt Regional Championships',
    tier: 'regional',
    city: 'Frankfurt',
    country: 'Germany',
    startDate: '2026-09-26',
    endDate: '2026-09-27',
  },
  {
    id: '2026-brisbane-regional',
    name: 'Brisbane Regional Championships',
    tier: 'regional',
    city: 'Brisbane',
    country: 'Australia',
    startDate: '2026-09-26',
    endDate: '2026-09-27',
  },
  {
    id: '2026-recife-regional',
    name: 'Recife Regional Championships',
    tier: 'regional',
    city: 'Recife',
    country: 'Brazil',
    startDate: '2026-10-03',
    endDate: '2026-10-04',
  },
  {
    id: '2026-louisville-regional',
    name: 'Louisville Regional Championships',
    tier: 'regional',
    city: 'Louisville, KY',
    country: 'United States',
    startDate: '2026-10-09',
    endDate: '2026-10-11',
  },
  {
    id: '2026-nice-regional',
    name: 'Nice Regional Championships',
    tier: 'regional',
    city: 'Nice',
    country: 'France',
    startDate: '2026-10-17',
    endDate: '2026-10-18',
  },
  {
    id: '2026-puebla-regional',
    name: 'Puebla Regional Championships',
    tier: 'regional',
    city: 'Puebla',
    country: 'Mexico',
    startDate: '2026-10-24',
    endDate: '2026-10-25',
  },
  {
    id: '2026-gdansk-regional',
    name: 'Gdansk Regional Championships',
    tier: 'regional',
    city: 'Gdansk',
    country: 'Poland',
    startDate: '2026-10-31',
    endDate: '2026-11-01',
  },
  {
    id: '2026-buenos-aires-special',
    name: 'Buenos Aires Special Event',
    tier: 'special',
    city: 'Buenos Aires',
    country: 'Argentina',
    startDate: '2026-11-14',
    endDate: '2026-11-15',
  },
  {
    id: '2026-latin-america-international',
    name: 'Latin America International Championships',
    tier: 'international',
    city: 'São Paulo',
    country: 'Brazil',
    startDate: '2026-11-20',
    endDate: '2026-11-22',
  },
  {
    id: '2026-stuttgart-regional',
    name: 'Stuttgart Regional Championships',
    tier: 'regional',
    city: 'Stuttgart',
    country: 'Germany',
    startDate: '2026-11-28',
    endDate: '2026-11-29',
  },
  {
    id: '2026-las-vegas-regional',
    name: 'Las Vegas Regional Championships',
    tier: 'regional',
    city: 'Las Vegas, NV',
    country: 'United States',
    startDate: '2026-12-04',
    endDate: '2026-12-06',
  },
  {
    id: '2027-atlanta-regional',
    name: 'Atlanta Regional Championships',
    tier: 'regional',
    city: 'Atlanta, GA',
    country: 'United States',
    startDate: '2027-01-15',
    endDate: '2027-01-17',
  },
  {
    id: '2027-sydney-regional',
    name: 'Sydney Regional Championships',
    tier: 'regional',
    city: 'Sydney',
    country: 'Australia',
    startDate: '2027-01-16',
    endDate: '2027-01-17',
  },
  {
    id: '2027-merida-regional',
    name: 'Mérida Regional Championships',
    tier: 'regional',
    city: 'Mérida',
    country: 'Mexico',
    startDate: '2027-01-23',
    endDate: '2027-01-24',
  },
  {
    id: '2027-birmingham-regional',
    name: 'Birmingham Regional Championships',
    tier: 'regional',
    city: 'Birmingham',
    country: 'United Kingdom',
    startDate: '2027-01-30',
    endDate: '2027-01-31',
  },
  {
    id: '2027-auckland-special',
    name: 'Auckland Special Event',
    tier: 'special',
    city: 'Auckland',
    country: 'New Zealand',
    startDate: '2027-01-30',
    endDate: '2027-01-31',
  },
  {
    id: '2027-seattle-regional',
    name: 'Seattle Regional Championships',
    tier: 'regional',
    city: 'Seattle, WA',
    country: 'United States',
    startDate: '2027-02-06',
    endDate: '2027-02-07',
  },
  {
    id: '2027-europe-international',
    name: 'Europe International Championships',
    tier: 'international',
    city: 'London',
    country: 'United Kingdom',
    startDate: '2027-02-19',
    endDate: '2027-02-21',
  },
  {
    id: '2027-san-antonio-regional',
    name: 'San Antonio Regional Championships',
    tier: 'regional',
    city: 'San Antonio, TX',
    country: 'United States',
    startDate: '2027-02-27',
    endDate: '2027-02-28',
  },
  {
    id: '2027-santiago-regional',
    name: 'Santiago Regional Championships',
    tier: 'regional',
    city: 'Santiago',
    country: 'Chile',
    startDate: '2027-02-27',
    endDate: '2027-02-28',
  },
  {
    id: '2027-rio-de-janeiro-regional',
    name: 'Rio de Janeiro Regional Championships',
    tier: 'regional',
    city: 'Rio de Janeiro',
    country: 'Brazil',
    startDate: '2027-03-06',
    endDate: '2027-03-07',
  },
  {
    id: '2027-toronto-regional',
    name: 'Toronto Regional Championships',
    tier: 'regional',
    city: 'Toronto',
    country: 'Canada',
    startDate: '2027-04-02',
    endDate: '2027-04-04',
  },
  {
    id: '2027-lisbon-special',
    name: 'Lisbon Special Event',
    tier: 'special',
    city: 'Lisbon',
    country: 'Portugal',
    startDate: '2027-04-10',
    endDate: '2027-04-11',
  },
  {
    id: '2027-monterrey-regional',
    name: 'Monterrey Regional Championships',
    tier: 'regional',
    city: 'Monterrey',
    country: 'Mexico',
    startDate: '2027-04-10',
    endDate: '2027-04-11',
  },
  {
    id: '2027-milwaukee-regional',
    name: 'Milwaukee Regional Championships',
    tier: 'regional',
    city: 'Milwaukee, WI',
    country: 'United States',
    startDate: '2027-04-16',
    endDate: '2027-04-18',
  },
  {
    id: '2027-lima-special',
    name: 'Lima Special Event',
    tier: 'special',
    city: 'Lima',
    country: 'Peru',
    startDate: '2027-04-24',
    endDate: '2027-04-25',
  },
  {
    id: '2027-prague-regional',
    name: 'Prague Regional Championships',
    tier: 'regional',
    city: 'Prague',
    country: 'Czechia',
    startDate: '2027-05-08',
    endDate: '2027-05-09',
  },
  {
    id: '2027-porto-alegre-regional',
    name: 'Porto Alegre Regional Championships',
    tier: 'regional',
    city: 'Porto Alegre',
    country: 'Brazil',
    startDate: '2027-05-08',
    endDate: '2027-05-09',
  },
  {
    id: '2027-utrecht-regional',
    name: 'Utrecht Regional Championships',
    tier: 'regional',
    city: 'Utrecht',
    country: 'Netherlands',
    startDate: '2027-05-22',
    endDate: '2027-05-23',
  },
  {
    id: '2027-san-diego-regional',
    name: 'San Diego Regional Championships',
    tier: 'regional',
    city: 'San Diego, CA',
    country: 'United States',
    startDate: '2027-05-28',
    endDate: '2027-05-30',
  },
  {
    id: '2027-melbourne-regional',
    name: 'Melbourne Regional Championships',
    tier: 'regional',
    city: 'Melbourne',
    country: 'Australia',
    startDate: '2027-05-29',
    endDate: '2027-05-30',
  },
  {
    id: '2027-bologna-special',
    name: 'Bologna Special Event',
    tier: 'special',
    city: 'Bologna',
    country: 'Italy',
    startDate: '2027-06-05',
    endDate: '2027-06-06',
  },
  {
    id: '2027-north-america-international',
    name: 'North America International Championships',
    tier: 'international',
    city: 'New Orleans, LA',
    country: 'United States',
    startDate: '2027-06-18',
    endDate: '2027-06-20',
  },
  {
    id: '2027-world-championships',
    name: 'World Championships',
    tier: 'worlds',
    city: 'Singapore',
    country: 'Singapore',
    startDate: '2027-08-13',
    endDate: '2027-08-15',
  },
];
