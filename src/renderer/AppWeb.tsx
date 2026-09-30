/**
 * AppWeb.tsx - Web Application Shell
 * Sibling to App.tsx (the Electron shell), not a modification of it -
 * Electron's App instantiates ~9 hooks that call window.electron directly
 * and aren't ported to the storage-adapter interface yet (useSavedPokemon,
 * useGameData, useSpeciesRoster, useSpriteCache, useSettings, etc. - see
 * TODO.md's Web App Scaffold leg). This shell only wires up useTeams/
 * useDatabase, the two hooks this leg actually ported, and renders
 * placeholder content for Teams/Box rather than the real TeamsPage/BoxPage
 * components - full wiring is the separate Web Teams Parity/Web Box Parity
 * legs' job. Not using Sidebar.tsx here: it hardcodes all 7 of the desktop
 * app's tabs via its own ActiveTab type from App.tsx, which isn't worth
 * generalizing for a two-item nav.
 */

import { useState } from 'react';
import { useTeams } from './hooks/useTeams';
import { useDatabase } from './hooks/useDatabase';
import { TeamsIcon, BoxIcon } from './components/icons/SidebarIcons';

type WebTab = 'teams' | 'box';

export default function AppWeb() {
  const [activeTab, setActiveTab] = useState<WebTab>('teams');
  const teamsState = useTeams();
  useDatabase();

  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-100">
      <aside className="flex w-52 flex-col gap-1 border-r border-zinc-700 bg-zinc-800 p-3">
        <h1 className="mb-3 px-2 text-[15px] font-bold text-zinc-100">ChoiceBuds</h1>
        <button
          onClick={() => setActiveTab('teams')}
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-[13.5px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'teams' ? 'text-accent-gold bg-accent-gold/15' : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
          }`}
        >
          <TeamsIcon />
          Teams
        </button>
        <button
          onClick={() => setActiveTab('box')}
          className={`flex items-center gap-2.5 rounded-lg px-2.5 py-[9px] text-[13.5px] font-semibold transition-colors cursor-pointer ${
            activeTab === 'box' ? 'text-accent-gold bg-accent-gold/15' : 'text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
          }`}
        >
          <BoxIcon />
          Box
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'teams' && (
          <div>
            <h2 className="mb-4 text-lg font-bold">Teams</h2>
            {teamsState.isLoading && <p className="text-zinc-400">Loading...</p>}
            {!teamsState.isLoading && teamsState.teams.length === 0 && (
              <p className="text-zinc-400">No teams yet.</p>
            )}
            {!teamsState.isLoading && teamsState.teams.length > 0 && (
              <ul className="flex flex-col gap-2">
                {teamsState.teams.map((team) => (
                  <li key={team.id} className="rounded-lg bg-zinc-800 px-3 py-2">
                    {team.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {activeTab === 'box' && (
          <div>
            <h2 className="mb-4 text-lg font-bold">Box</h2>
            <p className="text-zinc-400">Coming soon.</p>
          </div>
        )}
      </main>
    </div>
  );
}
