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
import AppStatusSection from './AppStatusSection';

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
      <h1 className="text-xl font-bold text-zinc-100">Settings</h1>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Default Regulation</h2>
        <p className="mt-1 text-xs text-zinc-400">
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
                  ? 'bg-accent-gold text-zinc-900'
                  : 'text-zinc-300 bg-zinc-900 hover:bg-zinc-800'
              }`}
            >
              {getRegulationLabel(id)}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-zinc-700 bg-zinc-800 p-4">
        <h2 className="text-sm font-semibold text-zinc-200">Animated Sprites</h2>
        <p className="mt-1 text-xs text-zinc-400">
          Swaps each team card's main sprite for Showdown's animated GIF
          version. Only affects the Teams page's Pokémon cards - every other
          sprite in the app stays static.
        </p>
        <label className="mt-3 flex items-center gap-2 text-xs text-zinc-300 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={settings.showAnimatedSprites}
            onChange={e => updateSettings({ showAnimatedSprites: e.target.checked })}
            className="cursor-pointer accent-accent-gold"
          />
          Show Animated Sprites
        </label>
      </div>

      <PlayerProfileSection settingsState={settingsState} />

      <SyncSection syncState={syncState} />

      <SeasonDataCheckSection seasonDataCheckState={seasonDataCheckState} />

      <GameDataResetSection databaseState={databaseState} gameDataState={gameDataState} />

      <UpdateCheckSection updateCheckState={updateCheckState} />

      <AppStatusSection databaseState={databaseState} teamsState={teamsState} />
    </div>
  );
}
