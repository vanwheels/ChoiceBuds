/**
 * App.tsx - Primary Application Shell
 * Fixed navigation sidebar on left, primary content viewport on right
 * Provides core data contexts via custom hooks down the component tree
 */

import { lazy, Suspense, useState } from 'react';
import { useTeams } from './hooks/useTeams';
import { useDatabase } from './hooks/useDatabase';
import { useActiveEditor } from './hooks/useActiveEditor';
import { useGameData } from './hooks/useGameData';
import { useSpeciesRoster } from './hooks/useSpeciesRoster';
import { useSpriteCache } from './hooks/useSpriteCache';
import { useInitialSync } from './hooks/useInitialSync';
import { useBattles } from './hooks/useBattles';
import { useSettings } from './hooks/useSettings';
import TeamsPage from './components/TeamsPage';
import LoadingScreen from './components/LoadingScreen';

// Lazy-loaded so each tab's code is only fetched/parsed once a user actually
// opens it, not on every app startup - CalcPage in particular pulls in
// @smogon/calc, the app's heaviest dependency.
const CalcPage = lazy(() => import('./components/calc/CalcPage'));
const BattleLogPage = lazy(() => import('./components/battlelog/BattleLogPage'));
const StatisticsPage = lazy(() => import('./components/statistics/StatisticsPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));

type ActiveTab = 'teams' | 'calc' | 'battles' | 'statistics' | 'settings';

/**
 * Main application shell component
 * Manages global state and layout structure
 *
 * useTeams/useGameData/useSpeciesRoster/useSpriteCache are each instantiated
 * exactly once here and threaded down as props through TeamsPage -> TeamCard
 * -> PokemonCard. Components further down must never call these hooks
 * themselves - a second instance would hold its own disconnected copy of
 * team/cache state, so writes made through it would silently not appear in
 * what's on screen.
 *
 * useInitialSync gates the whole app behind a LoadingScreen until the
 * one-time bulk first-launch sync (sprites + move/ability/learnset data for
 * the full legal dex) completes - see useInitialSync.ts.
 */
export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('teams');
  const teamsState = useTeams();
  const databaseState = useDatabase();
  const editorState = useActiveEditor();
  const gameDataState = useGameData();
  const speciesRosterState = useSpeciesRoster();
  const spriteCacheState = useSpriteCache();
  const battlesState = useBattles();
  const settingsState = useSettings();
  const { isDone: isInitialSyncDone, progress: initialSyncProgress } = useInitialSync(gameDataState, speciesRosterState, spriteCacheState);

  if (!isInitialSyncDone) {
    return <LoadingScreen progress={initialSyncProgress} />;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Fixed Navigation Sidebar - Left Side */}
      <aside className="w-32 bg-gray-800 border-r border-gray-700 flex flex-col" style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingTop: '1rem', paddingBottom: '1rem' }}>
        {/* App Header */}
        <div className="pb-4 border-b border-gray-700">
          <h1 className="text-base font-bold text-blue-400 leading-tight">ChoiceBuds</h1>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 flex flex-col pt-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveTab('teams')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'teams' ? 'bg-blue-600 hover:bg-blue-700' : 'text-gray-400 hover:bg-gray-700'
                }`}
              >
                Teams
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('calc')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'calc' ? 'bg-blue-600 hover:bg-blue-700' : 'text-gray-400 hover:bg-gray-700'
                }`}
              >
                Calc
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('battles')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'battles' ? 'bg-blue-600 hover:bg-blue-700' : 'text-gray-400 hover:bg-gray-700'
                }`}
              >
                Battle Log
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab('statistics')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'statistics' ? 'bg-blue-600 hover:bg-blue-700' : 'text-gray-400 hover:bg-gray-700'
                }`}
              >
                Statistics
              </button>
            </li>
          </ul>

          <ul className="mt-auto pt-2">
            <li>
              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  activeTab === 'settings' ? 'bg-blue-600 hover:bg-blue-700' : 'text-gray-400 hover:bg-gray-700'
                }`}
              >
                Settings
              </button>
            </li>
          </ul>
        </nav>

        {/* Status Footer */}
        <div className="pt-4 border-t border-gray-700 text-xs text-gray-500">
          <div className="flex items-center justify-between">
            <span>Cache Status:</span>
            <span className={databaseState.isInitialized ? 'text-green-400' : 'text-yellow-400'}>
              {databaseState.isInitialized ? 'Ready' : 'Loading...'}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span>Teams Loaded:</span>
            <span className="text-blue-400">{teamsState.teams.length}</span>
          </div>
        </div>
      </aside>

      {/* Primary Content Viewport - Right Side */}
      <main className="flex-1 overflow-y-auto" style={{ paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '1.5rem', paddingBottom: '1.5rem' }}>
        {activeTab === 'teams' ? (
          <TeamsPage
            teamsState={teamsState}
            databaseState={databaseState}
            editorState={editorState}
            gameDataState={gameDataState}
            speciesRosterState={speciesRosterState}
            spriteCacheState={spriteCacheState}
            settingsState={settingsState}
          />
        ) : activeTab === 'calc' ? (
          <Suspense fallback={<div className="text-gray-400 text-sm">Loading calculator...</div>}>
            <CalcPage gameDataState={gameDataState} teamsState={teamsState} spriteCacheState={spriteCacheState} />
          </Suspense>
        ) : activeTab === 'battles' ? (
          <Suspense fallback={<div className="text-gray-400 text-sm">Loading battle log...</div>}>
            <BattleLogPage
              battlesState={battlesState}
              teamsState={teamsState}
              speciesRosterState={speciesRosterState}
              spriteCacheState={spriteCacheState}
              gameDataState={gameDataState}
            />
          </Suspense>
        ) : activeTab === 'statistics' ? (
          <Suspense fallback={<div className="text-gray-400 text-sm">Loading statistics...</div>}>
            <StatisticsPage battlesState={battlesState} spriteCacheState={spriteCacheState} />
          </Suspense>
        ) : (
          <Suspense fallback={<div className="text-gray-400 text-sm">Loading settings...</div>}>
            <SettingsPage settingsState={settingsState} teamsState={teamsState} battlesState={battlesState} />
          </Suspense>
        )}
      </main>
    </div>
  );
}
