/**
 * App.tsx - Primary Application Shell
 * Fixed navigation sidebar on left, primary content viewport on right
 * Provides core data contexts via custom hooks down the component tree
 */

import { useTeams } from './hooks/useTeams';
import { useDatabase } from './hooks/useDatabase';
import { useActiveEditor } from './hooks/useActiveEditor';
import TeamsPage from './components/TeamsPage';

/**
 * Main application shell component
 * Manages global state and layout structure
 */
export default function App() {
  const teamsState = useTeams();
  const databaseState = useDatabase();
  const editorState = useActiveEditor();

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
              <button className="w-full text-left px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors">
                Teams
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
        <TeamsPage
          teamsState={teamsState}
          databaseState={databaseState}
          editorState={editorState}
        />
      </main>
    </div>
  );
}
