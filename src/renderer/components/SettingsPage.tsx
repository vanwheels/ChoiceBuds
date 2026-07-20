/**
 * SettingsPage.tsx - App Preferences
 * Direct-commit preference controls (no draft/save step) - each click
 * persists immediately via useSettings, same pattern as RegulationBadge.
 */

import type { UseSettingsReturn } from '../hooks/useSettings';
import type { UseTeamsReturn } from '../hooks/useTeams';
import type { UseBattlesReturn } from '../hooks/useBattles';
import type { UseUpdateCheckReturn } from '../hooks/useUpdateCheck';
import type { UseDatabaseReturn } from '../hooks/useDatabase';
import type { UseGameDataReturn } from '../hooks/useGameData';
import { ALL_REGULATION_IDS, getRegulationLabel, toRegulationId } from '../utils/pokemonRules';
import { useSync } from '../hooks/useSync';
import { useSeasonDataCheck } from '../hooks/useSeasonDataCheck';
import SyncSection from './SyncSection';
import UpdateCheckSection from './UpdateCheckSection';
import SeasonDataCheckSection from './SeasonDataCheckSection';
import PlayerProfileSection from './PlayerProfileSection';
import GameDataResetSection from './GameDataResetSection';

interface SettingsPageProps {
  settingsState: UseSettingsReturn;
  teamsState: UseTeamsReturn;
  battlesState: UseBattlesReturn;
  updateCheckState: UseUpdateCheckReturn;
  databaseState: UseDatabaseReturn;
  gameDataState: UseGameDataReturn;
}

export default function SettingsPage({ settingsState, teamsState, battlesState, updateCheckState, databaseState, gameDataState }: SettingsPageProps) {
  const { settings, setDefaultRegulation, updateSettings } = settingsState;
  const currentId = toRegulationId(settings.defaultRegulation);
  const syncState = useSync(settingsState, teamsState, battlesState);
  const seasonDataCheckState = useSeasonDataCheck(settings, updateSettings);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-100">Settings</h1>

      <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
        <h2 className="text-sm font-semibold text-gray-200">Default Regulation</h2>
        <p className="mt-1 text-xs text-gray-400">
          Used to pre-select the Format when importing a new team, and the
          Calc tab's starting regulation.
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

      <PlayerProfileSection settingsState={settingsState} />

      <SyncSection syncState={syncState} />

      <SeasonDataCheckSection seasonDataCheckState={seasonDataCheckState} />

      <GameDataResetSection databaseState={databaseState} gameDataState={gameDataState} />

      <UpdateCheckSection updateCheckState={updateCheckState} />
    </div>
  );
}
