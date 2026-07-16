/**
 * StatisticsPage.tsx - Win/Loss Statistics
 * Derives every stat client-side from the already-loaded battles array
 * (see utils/battleStats.ts) - no schema changes, no new persisted store.
 * Only completed battles (result !== 'in-progress') count toward win/loss
 * math; see each battleStats.ts function for specifics.
 */

import { useMemo, useState } from 'react';
import type { UseBattlesReturn } from '../../hooks/useBattles';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import { getSeasonForDate } from '../../config/seasons';
import {
  getOverallRecord,
  getRecordByFormat,
  getRecordByTeam,
  getRecordByOpponent,
  getRecordBySeason,
  getSeasonsWithBattles,
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

const ALL_SEASONS = 'All';

export default function StatisticsPage({ battlesState, spriteCacheState }: StatisticsPageProps) {
  const { battles } = battlesState;
  const [seasonFilter, setSeasonFilter] = useState<string>(ALL_SEASONS);

  const availableSeasons = useMemo(() => getSeasonsWithBattles(battles), [battles]);
  const filterOptions = useMemo(
    () => [{ id: ALL_SEASONS, label: ALL_SEASONS }, ...availableSeasons.map(s => ({ id: s.id, label: s.label }))],
    [availableSeasons]
  );

  const filteredBattles = useMemo(
    () => seasonFilter === ALL_SEASONS ? battles : battles.filter(b => getSeasonForDate(b.date)?.id === seasonFilter),
    [battles, seasonFilter]
  );

  const overallRecord = useMemo(() => getOverallRecord(filteredBattles), [filteredBattles]);
  const setRecord = useMemo(() => getSetRecord(filteredBattles), [filteredBattles]);
  const recordByFormat = useMemo(() => getRecordByFormat(filteredBattles), [filteredBattles]);
  const recordByTeam = useMemo(() => getRecordByTeam(filteredBattles), [filteredBattles]);
  const recordByOpponent = useMemo(() => getRecordByOpponent(filteredBattles), [filteredBattles]);
  const recordBySeason = useMemo(() => getRecordBySeason(battles), [battles]);
  const recentForm = useMemo(() => getRecentForm(filteredBattles), [filteredBattles]);
  const mostUsedPokemon = useMemo(() => getMostUsedPokemon(filteredBattles), [filteredBattles]);
  const mostFacedOpponents = useMemo(() => getMostFacedOpponents(filteredBattles), [filteredBattles]);

  if (battles.length === 0) {
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

      {availableSeasons.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {filterOptions.map(option => (
            <button
              key={option.id}
              onClick={() => setSeasonFilter(option.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                seasonFilter === option.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      <OverallRecordCard record={overallRecord} />
      {setRecord.total > 0 && <OverallRecordCard record={setRecord} unitLabel="set" />}
      <RecentFormStrip form={recentForm} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BreakdownPanel title="By Format" records={recordByFormat} emptyMessage="No completed battles yet." />
        <BreakdownPanel title="By Team" records={recordByTeam} emptyMessage="No completed battles yet." />
        <BreakdownPanel title="By Opponent" records={recordByOpponent} emptyMessage="No named opponents logged yet." />
        {seasonFilter === ALL_SEASONS && (
          <BreakdownPanel title="By Season" records={recordBySeason} emptyMessage="No battles logged during a known season yet." />
        )}
        <PokemonUsagePanel stats={mostUsedPokemon} resolveSprite={spriteCacheState.resolveSprite} />
        <OpponentFacedPanel stats={mostFacedOpponents} resolveSprite={spriteCacheState.resolveSprite} />
      </div>
    </div>
  );
}
