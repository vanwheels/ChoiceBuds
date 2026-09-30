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
 * Wired here (Web Login/Signup UX leg, see TODO.md): useSync. Signing in is
 * opt-in, not a gate - same as desktop, Teams/Box/the calc all work fully
 * signed-out, stored only in this browser's IndexedDB (and at risk of being
 * lost if that cache gets cleared). Signing in is what turns on syncing
 * teams/Box/battle data/settings across sessions, devices, and platforms -
 * takes a page from Showdown's book: never lock the player out of using the
 * app over an account. WebAuthScreen renders as a dismissible modal (opened
 * from the sidebar's "Sign in to sync" prompt) rather than a full-screen
 * blocker. useBattles itself still isn't ported (Battle Logger has no web
 * UI), so useSync gets a stub battles state (useWebBattlesStub.ts) instead -
 * see that file's own comment for why that's safe against the Worker's
 * merge. Still NOT wired: useInitialSync/useUsageSync (bulk first-launch
 * dex sync - a perf pre-warm, not a functional requirement, since
 * useGameData already fetches lazily on cache miss).
 *
 * Box (Web Box Parity leg) reuses the same BoxPage.tsx the desktop app
 * renders, passing the same hook states already instantiated above for
 * Teams - BoxPage's own dependencies (useRosterActions, the type/move/
 * ability filter hooks, clipboardPayload.ts) have no Electron dependency of
 * their own, so no further porting was needed.
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
import { useSync } from './hooks/useSync';
import { useWebBattlesStub } from './hooks/useWebBattlesStub';
import TeamsPage from './components/TeamsPage';
import BoxPage from './components/BoxPage';
import WebAuthScreen from './components/WebAuthScreen';
import { TeamsIcon, BoxIcon } from './components/icons/SidebarIcons';

type WebTab = 'teams' | 'box';

const SYNC_STATUS_LABEL: Record<ReturnType<typeof useSync>['status'], string> = {
  'signed-out': 'Not signed in',
  idle: 'Synced',
  syncing: 'Syncing...',
  error: "Couldn't reach the sync server",
};

export default function AppWeb() {
  const [activeTab, setActiveTab] = useState<WebTab>('teams');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const teamsState = useTeams();
  const databaseState = useDatabase();
  const savedPokemonState = useSavedPokemon();
  const editorState = useActiveEditor();
  const gameDataState = useGameData();
  const speciesRosterState = useSpeciesRoster();
  const spriteCacheState = useSpriteCache();
  const settingsState = useSettings();
  const battlesStub = useWebBattlesStub();
  const syncState = useSync(settingsState, teamsState, battlesStub, savedPokemonState);

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

        <div className="mt-auto flex flex-col gap-1 border-t border-zinc-700 pt-3 px-2">
          {syncState.syncUsername ? (
            <>
              <span className="truncate text-xs font-mono text-zinc-300" title={syncState.syncUsername}>
                {syncState.syncUsername}
              </span>
              <span className={`text-[11px] ${syncState.status === 'error' ? 'text-red-400' : 'text-zinc-500'}`}>
                {SYNC_STATUS_LABEL[syncState.status]}
              </span>
              <button
                onClick={() => { syncState.logOut(); }}
                className="mt-1 self-start text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <span className="text-[11px] text-zinc-500">Not signed in</span>
              <button
                onClick={() => setShowAuthModal(true)}
                className="self-start text-[11px] font-semibold text-accent-gold hover:text-accent-gold-deep transition-colors cursor-pointer"
              >
                Sign in to sync
              </button>
            </>
          )}
        </div>
      </aside>

      {showAuthModal && (
        <WebAuthScreen syncState={syncState} onClose={() => setShowAuthModal(false)} />
      )}

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
        <div style={{ display: activeTab === 'box' ? 'block' : 'none' }} className="h-full">
          <BoxPage
            savedPokemonState={savedPokemonState}
            gameDataState={gameDataState}
            databaseState={databaseState}
            speciesRosterState={speciesRosterState}
            spriteCacheState={spriteCacheState}
            settingsState={settingsState}
            teamsState={teamsState}
          />
        </div>
      </main>
    </div>
  );
}
