/**
 * App.tsx - Primary Application Shell
 * Fixed navigation sidebar on left, primary content viewport on right
 * Provides core data contexts via custom hooks down the component tree
 */

import { useState } from 'react';
import { useTeams } from './hooks/useTeams';
import { useDatabase } from './hooks/useDatabase';
import { useActiveEditor } from './hooks/useActiveEditor';
import { useGameData } from './hooks/useGameData';
import { useSpeciesRoster } from './hooks/useSpeciesRoster';
import { useDamageCalc } from './hooks/useDamageCalc';
import TeamsPage from './components/TeamsPage';
import CalcPage from './components/calc/CalcPage';

type ActiveTab = 'teams' | 'calc';

/**
 * Main application shell component
 * Manages global state and layout structure
 *
 * useTeams/useGameData/useSpeciesRoster are each instantiated exactly once
 * here and threaded down as props through TeamsPage -> TeamCard -> PokemonCard.
 * Components further down must never call these hooks themselves - a second
 * instance would hold its own disconnected copy of team/cache state, so
 * writes made through it would silently not appear in what's on screen.
 */
export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('teams');
  const teamsState = useTeams();
  const databaseState = useDatabase();
  const editorState = useActiveEditor();
  const gameDataState = useGameData();
  const speciesRosterState = useSpeciesRoster();
  const calcState = useDamageCalc(gameDataState);

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Fixed Navigation Sidebar - Left Side */}
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col" style={{ paddingLeft: '1.25rem', paddingRight: '1.25rem', paddingTop: '1rem', paddingBottom: '1rem' }}>
        {/* App Header */}
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-2xl font-bold text-blue-400">ChoiceBuds</h1>
          <p className="text-sm text-gray-400 mt-1">VGC Team Manager</p>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
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
              <button className="w-full text-left px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-700 transition-colors">
                Builder
              </button>
            </li>
            <li>
              <button className="w-full text-left px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-700 transition-colors">
                Settings
              </button>
            </li>
          </ul>
        </nav>

        {/* Status Footer */}
        <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
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
          />
        ) : (
          <CalcPage calcState={calcState} />
        )}
      </main>
    </div>
  );
}
