/**
 * TourneyPage.tsx - Tourney Tab
 * Tourney Tab: UI Leg 3 (see TODO.md) - renders config/tourneyEvents.ts's
 * hand-curated schedule (Leg 2), filtered/sorted by utils/tourneyEvents.ts's
 * getUpcomingEvents. No hooks/persisted state of its own - the schedule is
 * static config, same read-only shape as config/seasons.ts.
 */

import { useMemo } from 'react';
import { TOURNEY_EVENTS } from '../../config/tourneyEvents';
import { getUpcomingEvents } from '../../utils/tourneyEvents';
import TourneyEventCard from './TourneyEventCard';

export default function TourneyPage() {
  const upcomingEvents = useMemo(() => getUpcomingEvents(TOURNEY_EVENTS), []);

  return (
    <div className="flex flex-col gap-4 px-4 md:px-0">
      <h1 className="text-xl font-bold text-zinc-100">Tourney</h1>

      {upcomingEvents.length === 0 ? (
        <p className="text-sm text-zinc-400">No upcoming events on the schedule.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {upcomingEvents.map((event) => (
            <TourneyEventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
