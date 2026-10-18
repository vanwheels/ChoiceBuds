/**
 * TourneyEventCard.tsx - Single Tourney Schedule Row
 * Presentational only - TourneyPage.tsx supplies an already-upcoming,
 * already-sorted TourneyEvent.
 */

import type { TourneyEvent } from '../../config/tourneyEvents';
import { getTourneyEventTierTheme } from '../../config/tourneyEventTheme';
import { formatEventDateRange, formatEventDeadline } from '../../utils/tourneyEvents';

interface TourneyEventCardProps {
  event: TourneyEvent;
}

export default function TourneyEventCard({ event }: TourneyEventCardProps) {
  const tierTheme = getTourneyEventTierTheme(event.tier);

  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg bg-zinc-800 border border-zinc-700">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-zinc-100">{event.name}</h3>
        <span
          className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded text-white ${tierTheme.badgeBg}`}
        >
          {tierTheme.label}
        </span>
      </div>
      <div className="text-sm text-zinc-400">
        {event.city}, {event.country}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span className="text-zinc-200">
          {formatEventDateRange(event.startDate, event.endDate)}
        </span>
        {event.signupDeadline && (
          <span className="text-zinc-500">
            Signup deadline: {formatEventDeadline(event.signupDeadline)}
          </span>
        )}
      </div>
    </div>
  );
}
