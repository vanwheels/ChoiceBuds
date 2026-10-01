/**
 * AppStatusSection.tsx - Account Status Summary
 * The old sidebar's debug-y "Cache Status / Teams Loaded / Ver X" footer,
 * relocated here wholesale by the sidebar/menuing rework (design-approved
 * 2026-08-29, see TODO.md) - the new sidebar is pure navigation, this is
 * where that status info lives now. Same card pattern as the other
 * SettingsPage.tsx sections (UpdateCheckSection.tsx etc). Heading renamed
 * to "Account Status" and laid out as a single compact inline row (rather
 * than three stacked rows) 2026-09-30, since this is Settings' last section
 * and the floating Calc launcher button can sit over it (see TODO.md).
 */

import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { UseTeamsReturn } from '../hooks/useTeams';
import { CURRENT_APP_VERSION } from '../utils/appVersion';

interface AppStatusSectionProps {
  databaseState: UseDatabaseReturn;
  teamsState: UseTeamsReturn;
}

export default function AppStatusSection({ databaseState, teamsState }: AppStatusSectionProps) {
  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
      <h2 className="text-sm font-semibold text-zinc-200">Account Status</h2>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        <span className="text-zinc-400">
          Cache:{' '}
          <span className={databaseState.isInitialized ? 'text-green-400' : 'text-yellow-400'}>
            {databaseState.isInitialized ? 'Ready' : 'Loading...'}
          </span>
        </span>
        <span className="text-zinc-400">
          Teams: <span className="text-accent-gold">{teamsState.teams.length}</span>
        </span>
        <span className="text-zinc-400">
          Version: <span className="text-zinc-300">{CURRENT_APP_VERSION}</span>
        </span>
      </div>
    </div>
  );
}
