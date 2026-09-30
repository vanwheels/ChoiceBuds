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
 *
 * Nav shell (Web Nav Shell: Adopt Sidebar.tsx leg, see TODO.md): now uses
 * the real Sidebar.tsx + App.tsx's lazy-load/visited-tabs pattern in place
 * of the old hand-rolled 2-button nav - Sidebar.tsx has no Electron
 * dependency of its own (confirmed during scoping), it only type-imports
 * `ActiveTab` from App.tsx. Sidebar's nav list is hardcoded to all 7 desktop
 * tabs, not just Teams/Box, so every tab now shows up in the web nav too;
 * the ones without a ported page yet (Battle Log, Statistics, Type Matchup,
 * Speed Tiers, Settings) render `WebComingSoon` instead until their own
 * parity legs land (see TODO.md's Current Milestone section) - pure shell/
 * structure change, no new feature surface. The sync-status/sign-in footer
 * that used to live in this file's own hand-rolled sidebar now goes through
 * Sidebar's new `renderFooter` slot instead (added by this same leg) so it
 * keeps working with no Settings tab wired yet to host it.
 */

import { lazy, Suspense, useState } from 'react';
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
import type { ActiveTab } from './App';
import TeamsPage from './components/TeamsPage';
import WebAuthScreen from './components/WebAuthScreen';
import WebComingSoon from './components/WebComingSoon';
import Sidebar from './components/Sidebar';
import { CalcIcon } from './components/icons/SidebarIcons';

const BoxPage = lazy(() => import('./components/BoxPage'));
const CalcPopup = lazy(() => import('./components/CalcPopup'));
const TypeMatchupPage = lazy(() => import('./components/typematchup/TypeMatchupPage'));
const SpeedTiersPage = lazy(() => import('./components/speedtiers/SpeedTiersPage'));

// Tabs Sidebar.tsx renders that don't have a ported web page yet - each
// shows WebComingSoon with this label until its own parity leg lands.
const COMING_SOON_LABELS: Partial<Record<ActiveTab, string>> = {
  battles: 'Battle Log',
  statistics: 'Statistics',
  settings: 'Settings',
};

const SYNC_STATUS_LABEL: Record<ReturnType<typeof useSync>['status'], string> = {
  'signed-out': 'Not signed in',
  idle: 'Synced',
  syncing: 'Syncing...',
  error: "Couldn't reach the sync server",
};

export default function AppWeb() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('teams');
  const [visitedTabs, setVisitedTabs] = useState<Set<ActiveTab>>(() => new Set(['teams']));
  const goToTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setVisitedTabs(prev => prev.has(tab) ? prev : new Set(prev).add(tab));
  };
  const [showAuthModal, setShowAuthModal] = useState(false);
  // Same lazy-once/hidden-after-first-open lifecycle as visitedTabs above,
  // mirroring App.tsx's CalcPopup wiring - see that file's header comment.
  const [isCalcPopupOpen, setIsCalcPopupOpen] = useState(false);
  const [hasOpenedCalcPopup, setHasOpenedCalcPopup] = useState(false);
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
      <Sidebar
        activeTab={activeTab}
        onTabChange={goToTab}
        renderFooter={(collapsed) => collapsed ? (
          <div
            className="flex justify-center"
            title={syncState.syncUsername ? `${syncState.syncUsername} - ${SYNC_STATUS_LABEL[syncState.status]}` : 'Not signed in'}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                !syncState.syncUsername ? 'bg-zinc-500' : syncState.status === 'error' ? 'bg-red-400' : 'bg-accent-gold'
              }`}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-1 px-1.5">
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
        )}
      />

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
        {visitedTabs.has('box') && (
          <div style={{ display: activeTab === 'box' ? 'block' : 'none' }} className="h-full">
            <Suspense fallback={<div className="p-8 text-sm text-zinc-400">Loading box...</div>}>
              <BoxPage
                savedPokemonState={savedPokemonState}
                gameDataState={gameDataState}
                databaseState={databaseState}
                speciesRosterState={speciesRosterState}
                spriteCacheState={spriteCacheState}
                settingsState={settingsState}
                teamsState={teamsState}
              />
            </Suspense>
          </div>
        )}
        {visitedTabs.has('typeMatchup') && (
          <div style={{ display: activeTab === 'typeMatchup' ? 'block' : 'none' }} className="h-full">
            <Suspense fallback={<div className="p-8 text-sm text-zinc-400">Loading type matchup...</div>}>
              <TypeMatchupPage
                teamsState={teamsState}
                gameDataState={gameDataState}
                databaseState={databaseState}
                spriteCacheState={spriteCacheState}
              />
            </Suspense>
          </div>
        )}
        {visitedTabs.has('speedTiers') && (
          <div style={{ display: activeTab === 'speedTiers' ? 'block' : 'none' }} className="h-full">
            <Suspense fallback={<div className="p-8 text-sm text-zinc-400">Loading speed tiers...</div>}>
              <SpeedTiersPage
                teamsState={teamsState}
                gameDataState={gameDataState}
                databaseState={databaseState}
                spriteCacheState={spriteCacheState}
                speciesRosterState={speciesRosterState}
              />
            </Suspense>
          </div>
        )}
        {Object.entries(COMING_SOON_LABELS).map(([tab, label]) => visitedTabs.has(tab as ActiveTab) && (
          <div key={tab} style={{ display: activeTab === tab ? 'block' : 'none' }} className="h-full">
            <WebComingSoon feature={label} />
          </div>
        ))}
      </main>

      <button
        onClick={() => { setIsCalcPopupOpen(true); setHasOpenedCalcPopup(true); }}
        aria-label="Open Calc"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-accent-gold px-4 py-3 font-bold text-zinc-900 shadow-lg transition-transform cursor-pointer hover:scale-105"
      >
        <CalcIcon />
        Calc
      </button>

      {hasOpenedCalcPopup && (
        <Suspense fallback={null}>
          <CalcPopup
            isOpen={isCalcPopupOpen}
            onClose={() => setIsCalcPopupOpen(false)}
            gameDataState={gameDataState}
            teamsState={teamsState}
            databaseState={databaseState}
            savedPokemonState={savedPokemonState}
            spriteCacheState={spriteCacheState}
            settingsState={settingsState}
          />
        </Suspense>
      )}
    </div>
  );
}
