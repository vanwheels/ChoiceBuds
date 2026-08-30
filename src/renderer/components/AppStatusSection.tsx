/**
 * AppStatusSection.tsx - App Status Summary
 * The old sidebar's debug-y "Cache Status / Teams Loaded / Ver X" footer,
 * relocated here wholesale by the sidebar/menuing rework (design-approved
 * 2026-08-29, see TODO.md) - the new sidebar is pure navigation, this is
 * where that status info lives now. Same card pattern as the other
 * SettingsPage.tsx sections (UpdateCheckSection.tsx etc).
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
      <h2 className="text-sm font-semibold text-zinc-200">App Status</h2>

      <div className="mt-3 space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Cache Status</span>
          <span className={databaseState.isInitialized ? 'text-green-400' : 'text-yellow-400'}>
            {databaseState.isInitialized ? 'Ready' : 'Loading...'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Teams Loaded</span>
          <span className="text-accent-gold">{teamsState.teams.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">Version</span>
          <span className="text-zinc-300">{CURRENT_APP_VERSION}</span>
        </div>
      </div>
    </div>
  );
}
