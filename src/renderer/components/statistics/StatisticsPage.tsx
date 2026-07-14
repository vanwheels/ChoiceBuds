/**
 * StatisticsPage.tsx - Win/Loss Statistics
 * Derives every stat client-side from the already-loaded battles array
 * (see utils/battleStats.ts) - no schema changes, no new persisted store.
 * Only completed battles (result !== 'in-progress') count toward win/loss
 * math; see each battleStats.ts function for specifics.
 */

import { useMemo } from 'react';
import type { UseBattlesReturn } from '../../hooks/useBattles';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import {
  getOverallRecord,
  getRecordByFormat,
  getRecordByTeam,
  getRecordByOpponent,
  getRecordBySeason,
  getSetRecord,
  getRecentForm,
  getMostUsedPokemon,
  getMostFacedOpponents,
} from '../../utils/battleStats';
import OverallRecordCard from './OverallRecordCard';
import RecentFormStrip from './RecentFormStrip';
import BreakdownPanel from './BreakdownPanel';
import PokemonUsagePanel from './PokemonUsagePanel';
import OpponentFacedPanel from './OpponentFacedPanel';

interface StatisticsPageProps {
  battlesState: UseBattlesReturn;
  spriteCacheState: UseSpriteCacheReturn;
}

export default function StatisticsPage({ battlesState, spriteCacheState }: StatisticsPageProps) {
  const { battles } = battlesState;

  const overallRecord = useMemo(() => getOverallRecord(battles), [battles]);
  const setRecord = useMemo(() => getSetRecord(battles), [battles]);
  const recordByFormat = useMemo(() => getRecordByFormat(battles), [battles]);
  const recordByTeam = useMemo(() => getRecordByTeam(battles), [battles]);
  const recordByOpponent = useMemo(() => getRecordByOpponent(battles), [battles]);
  const recordBySeason = useMemo(() => getRecordBySeason(battles), [battles]);
  const recentForm = useMemo(() => getRecentForm(battles), [battles]);
  const mostUsedPokemon = useMemo(() => getMostUsedPokemon(battles), [battles]);
  const mostFacedOpponents = useMemo(() => getMostFacedOpponents(battles), [battles]);

  if (overallRecord.total === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-bold text-gray-100">Statistics</h1>
        <p className="text-sm text-gray-400">Log some battles to see stats here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-gray-100">Statistics</h1>

      <OverallRecordCard record={overallRecord} />
      {setRecord.total > 0 && <OverallRecordCard record={setRecord} unitLabel="set" />}
      <RecentFormStrip form={recentForm} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakdownPanel title="By Format" records={recordByFormat} emptyMessage="No completed battles yet." />
        <BreakdownPanel title="By Team" records={recordByTeam} emptyMessage="No completed battles yet." />
        <BreakdownPanel title="By Opponent" records={recordByOpponent} emptyMessage="No named opponents logged yet." />
        <BreakdownPanel title="By Season" records={recordBySeason} emptyMessage="No battles logged during a known season yet." />
        <PokemonUsagePanel stats={mostUsedPokemon} resolveSprite={spriteCacheState.resolveSprite} />
        <OpponentFacedPanel stats={mostFacedOpponents} resolveSprite={spriteCacheState.resolveSprite} />
      </div>
    </div>
  );
}
