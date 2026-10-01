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
 * blocker. useBattles is now ported to the storage adapter (Web Battle Log
 * Storage Adapter Port leg, see TODO.md) and wired into useSync directly.
 * Still NOT wired: useInitialSync/useUsageSync (bulk first-launch dex sync -
 * a perf pre-warm, not a functional requirement, since useGameData already
 * fetches lazily on cache miss).
 *
 * Battle Log + Statistics (Web Battle Log & Statistics Parity leg, see
 * TODO.md) now render the same BattleLogPage/StatisticsPage.tsx the desktop
 * app does, mirroring App.tsx's wiring verbatim - including the
 * battleLogSession state that links an in-progress RecordMatchForm session
 * to the floating Calc popup's opponent tray (see App.tsx's own comment on
 * that state for why it lives up here rather than inside BattleLogPage).
 * StatisticsPage itself had no Electron dependency of its own (derives
 * everything client-side from the battles array).
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
 * tabs, so every tab shows up in the web nav. The sync-status/sign-in footer
 * that used to live in this file's own hand-rolled sidebar now goes through
 * Sidebar's new `renderFooter` slot instead (added by this same leg).
 *
 * Settings (Web Settings Parity leg, see TODO.md) renders the same
 * SettingsPage.tsx the desktop app does, minus `updateCheckState` -
 * `useUpdateCheck` talks to `window.electron.onUpdateStatus` directly (no
 * web equivalent, and no in-app auto-update concept for a web app: it's
 * always whatever's currently deployed), so it's simply never instantiated
 * here. SettingsPage treats `updateCheckState` as optional and skips
 * `UpdateCheckSection` entirely when it's absent. `ReleaseNotesMarkdown.tsx`/
 * `ExportTeamModal.tsx`'s `window.electron.openExternal` calls (used by
 * Settings' release-notes history and the team-export Pokepaste link) fall
 * back to a plain `<a target="_blank">` on web instead. This was the last
 * tab still showing `WebComingSoon` (now deleted, nothing references it) -
 * every Sidebar tab now renders its real page on web.
 *
 * Mobile Nav Shell: Drawer leg (see TODO.md): the outer shell stacks
 * (`flex-col`) below `md` instead of its normal row layout, mirroring
 * App.tsx's own shell - see that file's header comment for why.
 */

import { lazy, Suspense, useState } from 'react';
import type { OpponentPokemonEntry } from './types/pokemon';
import { useTeams } from './hooks/useTeams';
import { useDatabase } from './hooks/useDatabase';
import { useSavedPokemon } from './hooks/useSavedPokemon';
import { useActiveEditor } from './hooks/useActiveEditor';
import { useGameData } from './hooks/useGameData';
import { useSpeciesRoster } from './hooks/useSpeciesRoster';
import { useSpriteCache } from './hooks/useSpriteCache';
import { useSettings } from './hooks/useSettings';
import { useSync } from './hooks/useSync';
import { useBattles } from './hooks/useBattles';
import { useReleaseNotes } from './hooks/useReleaseNotes';
import type { ActiveTab } from './App';
import TeamsPage from './components/TeamsPage';
import WebAuthScreen from './components/WebAuthScreen';
import Sidebar from './components/Sidebar';
import { CalcLauncherButton } from './components/CalcLauncherButton';
import { CalcIcon } from './components/icons/SidebarIcons';
import { MobileHeaderActionsProvider } from './hooks/useMobileHeaderActions';

const BoxPage = lazy(() => import('./components/BoxPage'));
const CalcPopup = lazy(() => import('./components/CalcPopup'));
const BattleLogPage = lazy(() => import('./components/battlelog/BattleLogPage'));
const StatisticsPage = lazy(() => import('./components/statistics/StatisticsPage'));
const TypeMatchupPage = lazy(() => import('./components/typematchup/TypeMatchupPage'));
const SpeedTiersPage = lazy(() => import('./components/speedtiers/SpeedTiersPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));

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
  // Mirrors App.tsx's battleLogSession wiring - see that file's header
  // comment for why this lives up here rather than inside BattleLogPage.
  const [battleLogSession, setBattleLogSession] = useState<{
    roster: OpponentPokemonEntry[];
    onUpdateEntry: (entryId: string, updates: Partial<OpponentPokemonEntry>) => void;
    teamId?: string;
  } | null>(null);
  const teamsState = useTeams();
  const databaseState = useDatabase();
  const savedPokemonState = useSavedPokemon();
  const editorState = useActiveEditor();
  const gameDataState = useGameData();
  const speciesRosterState = useSpeciesRoster();
  const spriteCacheState = useSpriteCache();
  const settingsState = useSettings();
  const battlesState = useBattles();
  const syncState = useSync(settingsState, teamsState, battlesState, savedPokemonState);
  // No useUpdateCheck() here (unlike App.tsx) - it talks to
  // window.electron.onUpdateStatus directly, which doesn't exist on web, and
  // there's no in-app auto-update concept for a web app anyway. SettingsPage
  // treats updateCheckState as optional and skips UpdateCheckSection
  // entirely when it's absent - see SettingsPage.tsx.
  const releaseNotesState = useReleaseNotes(settingsState.settings, settingsState.isLoading, settingsState.updateSettings);

  return (
    // Mobile Compact Top Bar: Teams & Box leg (see TODO.md) - see App.tsx's
    // matching comment for why this needs to wrap both Sidebar and <main>.
    <MobileHeaderActionsProvider>
    <div className="flex flex-col md:flex-row h-screen bg-zinc-900 text-zinc-100">
      <Sidebar
        activeTab={activeTab}
        onTabChange={goToTab}
        renderFooter={(collapsed) => collapsed ? null : (
          <div className="flex flex-col gap-1 px-1.5">
            {syncState.syncUsername ? (
              <>
                <span className="truncate text-xs font-mono text-zinc-300" title={syncState.syncUsername}>
                  {syncState.syncUsername}
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
        mobileTopBarEnd={
          <button
            onClick={() => { setIsCalcPopupOpen(true); setHasOpenedCalcPopup(true); }}
            aria-label="Open Calc"
            className="flex items-center justify-center rounded-lg p-2 text-accent-gold transition-colors cursor-pointer hover:bg-zinc-700"
          >
            <CalcIcon />
          </button>
        }
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
        {visitedTabs.has('battles') && (
          <div style={{ display: activeTab === 'battles' ? 'block' : 'none' }} className="h-full">
            <Suspense fallback={<div className="p-8 text-sm text-zinc-400">Loading battle log...</div>}>
              <BattleLogPage
                battlesState={battlesState}
                teamsState={teamsState}
                speciesRosterState={speciesRosterState}
                spriteCacheState={spriteCacheState}
                registerBattleLogSession={setBattleLogSession}
              />
            </Suspense>
          </div>
        )}
        {visitedTabs.has('statistics') && (
          <div style={{ display: activeTab === 'statistics' ? 'block' : 'none' }} className="h-full">
            <Suspense fallback={<div className="p-8 text-sm text-zinc-400">Loading statistics...</div>}>
              <StatisticsPage battlesState={battlesState} spriteCacheState={spriteCacheState} />
            </Suspense>
          </div>
        )}
        {visitedTabs.has('settings') && (
          <div style={{ display: activeTab === 'settings' ? 'block' : 'none' }} className="h-full">
            <Suspense fallback={<div className="p-8 text-sm text-zinc-400">Loading settings...</div>}>
              <SettingsPage
                settingsState={settingsState}
                syncState={syncState}
                teamsState={teamsState}
                releaseNotesState={releaseNotesState}
                databaseState={databaseState}
                gameDataState={gameDataState}
              />
            </Suspense>
          </div>
        )}
      </main>

      {/* Corner-snap draggable (Floating Calc Button Repositioning Leg 1) -
          see CalcLauncherButton.tsx. Desktop/tablet only (`hidden md:flex`,
          handled inside that component) - below `md` this covered whatever
          page content sat at the bottom of a phone viewport (reported live),
          so Sidebar.tsx's mobile top bar gets a compact version instead
          (`mobileTopBarEnd` above). */}
      <CalcLauncherButton onOpen={() => { setIsCalcPopupOpen(true); setHasOpenedCalcPopup(true); }} />

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
            battleLogOpponentRoster={battleLogSession?.roster}
            onUpdateOpponentEntry={battleLogSession?.onUpdateEntry}
            battleLogPlayerTeamId={battleLogSession?.teamId}
          />
        </Suspense>
      )}
    </div>
    </MobileHeaderActionsProvider>
  );
}
