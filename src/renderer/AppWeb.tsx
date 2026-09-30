/**
 * AppWeb.tsx - Web Application Shell
 * Sibling to App.tsx (the Electron shell), not a modification of it. Now
 * wires up every hook TeamsPage actually needs (Web Teams Parity leg, see
 * TODO.md) - useGameData/useSettings/useSavedPokemon/useVgcPastesCache/
 * useVgcRealSetsCache were ported to the storage-adapter interface as part
 * of this same leg; useSpeciesRoster/useActiveEditor already had no
 * Electron dependency, and useSpriteCache now no-ops on web (see its own
 * header comment) rather than needing a port.
 *
 * Deliberately NOT wired here yet: useSync (needs useBattles, unported -
 * Battle Logger has no web UI - and there's no sign-up/log-in UI on web
 * yet either, that's Web Hosting & Domain's job per
 * docs/investigations/web-version-scope.md) and useInitialSync/useUsageSync
 * (bulk first-launch dex sync - a perf pre-warm, not a functional
 * requirement, since useGameData already fetches lazily on cache miss).
 *
 * Box still renders a placeholder - that's the separate Web Box Parity leg.
 * Not using Sidebar.tsx here: it hardcodes all 7 of the desktop app's tabs
 * via its own ActiveTab type from App.tsx, which isn't worth generalizing
 * for a two-item nav.
 */

import { useState } from 'react';
import { useTeams } from './hooks/useTeams';
import { useDatabase } from './hooks/useDatabase';
import { useSavedPokemon } from './hooks/useSavedPokemon';
import { useActiveEditor } from './hooks/useActiveEditor';
import { useGameData } from './hooks/useGameData';
import { useSpeciesRoster } from './hooks/useSpeciesRoster';
import { useSpriteCache } from './hooks/useSpriteCache';
import { useSettings } from './hooks/useSettings';
import TeamsPage from './components/TeamsPage';
import { TeamsIcon, BoxIcon } from './components/icons/SidebarIcons';

type WebTab = 'teams' | 'box';

export default function AppWeb() {
  const [activeTab, setActiveTab] = useState<WebTab>('teams');
  const teamsState = useTeams();
  const databaseState = useDatabase();
  const savedPokemonState = useSavedPokemon();
  const editorState = useActiveEditor();
  const gameDataState = useGameData();
  const speciesRosterState = useSpeciesRoster();
  const spriteCacheState = useSpriteCache();
  const settingsState = useSettings();

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

      <main className="flex-1 overflow-y-auto">
        <div style={{ display: activeTab === 'teams' ? 'block' : 'none' }} className="h-full">
          <TeamsPage
            teamsState={teamsState}
            databaseState={databaseState}
            editorState={editorState}
            gameDataState={gameDataState}
            speciesRosterState={speciesRosterState}
            spriteCacheState={spriteCacheState}
            settingsState={settingsState}
            savedPokemonState={savedPokemonState}
          />
        </div>
        {activeTab === 'box' && (
          <div className="p-6">
            <h2 className="mb-4 text-lg font-bold">Box</h2>
            <p className="text-zinc-400">Coming soon.</p>
          </div>
        )}
      </main>
    </div>
  );
}
