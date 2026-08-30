/**
 * App.tsx - Primary Application Shell
 * Fixed navigation sidebar on left, primary content viewport on right
 * Provides core data contexts via custom hooks down the component tree
 */

import { lazy, Suspense, useState } from 'react';
import { useTeams } from './hooks/useTeams';
import { useDatabase } from './hooks/useDatabase';
import { useSavedPokemon } from './hooks/useSavedPokemon';
import type { CalcReviewPayload } from './utils/battleCalcReview';
import { useActiveEditor } from './hooks/useActiveEditor';
import { useGameData } from './hooks/useGameData';
import { useSpeciesRoster } from './hooks/useSpeciesRoster';
import { useSpriteCache } from './hooks/useSpriteCache';
import { useInitialSync } from './hooks/useInitialSync';
import { useBattles } from './hooks/useBattles';
import { useSettings } from './hooks/useSettings';
import { useUpdateCheck } from './hooks/useUpdateCheck';
import TeamsPage from './components/TeamsPage';
import LoadingScreen from './components/LoadingScreen';
import Sidebar from './components/Sidebar';

// Lazy-loaded so each tab's code is only fetched/parsed once a user actually
// opens it, not on every app startup - CalcPage in particular pulls in
// @smogon/calc, the app's heaviest dependency.
const CalcPage = lazy(() => import('./components/calc/CalcPage'));
const BattleLogPage = lazy(() => import('./components/battlelog/BattleLogPage'));
const StatisticsPage = lazy(() => import('./components/statistics/StatisticsPage'));
const TypeMatchupPage = lazy(() => import('./components/typematchup/TypeMatchupPage'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));

export type ActiveTab = 'teams' | 'calc' | 'battles' | 'statistics' | 'typeMatchup' | 'settings';

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
 * useInitialSync gates the whole app behind a LoadingScreen until every
 * currently-unsynced legal species (sprites, move/ability/learnset data,
 * species stats) is synced - the full legal dex on a fresh install, just the
 * delta on a later launch after a regulation update adds new species - see
 * useInitialSync.ts.
 */
export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('teams');
  // Every tab a user has opened at least once this session stays mounted
  // (hidden via CSS instead of unmounted) once visited - switching tabs
  // used to fully unmount the outgoing page, discarding any state that
  // isn't already lifted into a hook here (e.g. the Calc tab's in-progress
  // matchup, which intentionally lives in CalcPage's own useDamageCalc
  // call rather than up here - see CalcPage.tsx's header comment for why).
  // A tab is still only lazy-loaded the first time it's actually opened.
  const [visitedTabs, setVisitedTabs] = useState<Set<ActiveTab>>(() => new Set(['teams']));
  const goToTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setVisitedTabs(prev => prev.has(tab) ? prev : new Set(prev).add(tab));
  };
  const teamsState = useTeams();
  const databaseState = useDatabase();
  const savedPokemonState = useSavedPokemon();
  // Hand-off for Battle Log's "Show Calc" button (TurnLog.tsx) - set once,
  // consumed once by CalcPage.tsx's own effect, then cleared, so switching
  // away and back to the Calc tab doesn't re-apply stale data.
  const [pendingCalcReview, setPendingCalcReview] = useState<CalcReviewPayload | null>(null);
  const handleReviewInCalc = (payload: CalcReviewPayload) => {
    setPendingCalcReview(payload);
    goToTab('calc');
  };
  const editorState = useActiveEditor();
  const gameDataState = useGameData();
  const speciesRosterState = useSpeciesRoster();
  const spriteCacheState = useSpriteCache();
  const battlesState = useBattles();
  const settingsState = useSettings();
  const updateCheckState = useUpdateCheck();
  const { isDone: isInitialSyncDone, progress: initialSyncProgress } = useInitialSync(gameDataState, speciesRosterState, spriteCacheState, databaseState);

  if (!isInitialSyncDone) {
    return <LoadingScreen progress={initialSyncProgress} />;
  }

  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-100">
      <Sidebar activeTab={activeTab} onTabChange={goToTab} />

      {/* Primary Content Viewport - Right Side */}
      {/* Each visited tab stays mounted (display:none when inactive) rather
          than being unmounted - see goToTab's comment above. Still gated on
          visitedTabs so a tab never visited this session never even pays
          for its React.lazy() import. */}
      {/* scrollbarGutter: 'stable' reserves the scrollbar's track width whether or
          not it's actually showing, so content shifting past one page's height
          doesn't shrink whatever's rendered here the instant the scrollbar pops
          in - reported 2026-08-29. This is the outer scroll container shared by
          every tab; individual tabs can (and do, see TeamsPage.tsx's own nested
          overflow-y-auto content div) have their own inner scroll container too,
          each needing this same treatment independently - fixing this one alone
          doesn't cover a shift happening on an inner container whose height gets
          fixed below this one's. */}
      <main className="flex-1 overflow-y-auto" style={{ paddingLeft: '2rem', paddingRight: '2rem', paddingTop: '1.5rem', paddingBottom: '1.5rem', scrollbarGutter: 'stable' }}>
        <div style={{ display: activeTab === 'teams' ? 'block' : 'none' }}>
          <TeamsPage
            teamsState={teamsState}
            databaseState={databaseState}
            editorState={editorState}
            gameDataState={gameDataState}
            speciesRosterState={speciesRosterState}
            spriteCacheState={spriteCacheState}
            settingsState={settingsState}
          />
        </div>
        {visitedTabs.has('calc') && (
          <div style={{ display: activeTab === 'calc' ? 'block' : 'none' }}>
            <Suspense fallback={<div className="text-zinc-400 text-sm">Loading calculator...</div>}>
              <CalcPage
                gameDataState={gameDataState}
                teamsState={teamsState}
                databaseState={databaseState}
                savedPokemonState={savedPokemonState}
                spriteCacheState={spriteCacheState}
                settingsState={settingsState}
                pendingCalcReview={pendingCalcReview}
                onConsumePendingCalcReview={() => setPendingCalcReview(null)}
              />
            </Suspense>
          </div>
        )}
        {visitedTabs.has('battles') && (
          <div style={{ display: activeTab === 'battles' ? 'block' : 'none' }}>
            <Suspense fallback={<div className="text-zinc-400 text-sm">Loading battle log...</div>}>
              <BattleLogPage
                battlesState={battlesState}
                teamsState={teamsState}
                speciesRosterState={speciesRosterState}
                spriteCacheState={spriteCacheState}
                gameDataState={gameDataState}
                onReviewInCalc={handleReviewInCalc}
              />
            </Suspense>
          </div>
        )}
        {visitedTabs.has('statistics') && (
          <div style={{ display: activeTab === 'statistics' ? 'block' : 'none' }}>
            <Suspense fallback={<div className="text-zinc-400 text-sm">Loading statistics...</div>}>
              <StatisticsPage battlesState={battlesState} spriteCacheState={spriteCacheState} />
            </Suspense>
          </div>
        )}
        {visitedTabs.has('typeMatchup') && (
          <div style={{ display: activeTab === 'typeMatchup' ? 'block' : 'none' }}>
            <Suspense fallback={<div className="text-zinc-400 text-sm">Loading type matchup...</div>}>
              <TypeMatchupPage teamsState={teamsState} gameDataState={gameDataState} spriteCacheState={spriteCacheState} />
            </Suspense>
          </div>
        )}
        {visitedTabs.has('settings') && (
          <div style={{ display: activeTab === 'settings' ? 'block' : 'none' }}>
            <Suspense fallback={<div className="text-zinc-400 text-sm">Loading settings...</div>}>
              <SettingsPage settingsState={settingsState} teamsState={teamsState} battlesState={battlesState} updateCheckState={updateCheckState} databaseState={databaseState} gameDataState={gameDataState} />
            </Suspense>
          </div>
        )}
      </main>
    </div>
  );
}
