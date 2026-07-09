/**
 * SettingsPage.tsx - App Preferences
 * Direct-commit preference controls (no draft/save step) - each click
 * persists immediately via useSettings, same pattern as RegulationBadge.
 */

import type { UseSettingsReturn } from '../hooks/useSettings';
import type { UseTeamsReturn } from '../hooks/useTeams';
import type { UseBattlesReturn } from '../hooks/useBattles';
import { ALL_REGULATION_IDS, getRegulationLabel, toRegulationId } from '../utils/pokemonRules';
import { useSync } from '../hooks/useSync';
import SyncSection from './SyncSection';

interface SettingsPageProps {
  settingsState: UseSettingsReturn;
  teamsState: UseTeamsReturn;
  battlesState: UseBattlesReturn;
}

export default function SettingsPage({ settingsState, teamsState, battlesState }: SettingsPageProps) {
  const { settings, setDefaultRegulation } = settingsState;
  const currentId = toRegulationId(settings.defaultRegulation);
  const syncState = useSync(settingsState, teamsState, battlesState);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-100">Settings</h1>

      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h2 className="text-sm font-semibold text-gray-200">Default Regulation</h2>
        <p className="mt-1 text-xs text-gray-400">
          Used to pre-select the Format when importing a new team.
        </p>
        <div className="mt-3 flex gap-2">
          {ALL_REGULATION_IDS.map(id => (
            <button
              key={id}
              onClick={() => setDefaultRegulation(getRegulationLabel(id) as 'Reg M-A' | 'Reg M-B')}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors cursor-pointer ${
                id === currentId
                  ? 'bg-blue-600 text-white'
                  : 'text-zinc-300 bg-gray-900 hover:bg-zinc-800'
              }`}
            >
              {getRegulationLabel(id)}
            </button>
          ))}
        </div>
      </div>

      <SyncSection syncState={syncState} />
    </div>
  );
}
