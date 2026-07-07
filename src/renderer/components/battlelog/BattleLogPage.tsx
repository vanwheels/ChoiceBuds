/**
 * BattleLogPage.tsx - Battle Log Tab Root
 * No open battle -> StartBattleFlow + PastBattlesList. Open battle ->
 * ActiveBattleView. Mirrors CalcPage.tsx's role as the lazy-loaded tab root.
 */

import { useState } from 'react';
import type { UseBattlesReturn } from '../../hooks/useBattles';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseSpeciesRosterReturn } from '../../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import { useBattleLogActions } from '../../hooks/useBattleLogActions';
import StartBattleFlow from './StartBattleFlow';
import PastBattlesList from './PastBattlesList';
import ActiveBattleView from './ActiveBattleView';

interface BattleLogPageProps {
  battlesState: UseBattlesReturn;
  teamsState: UseTeamsReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
}

export default function BattleLogPage({ battlesState, teamsState, speciesRosterState, spriteCacheState }: BattleLogPageProps) {
  const [openBattleId, setOpenBattleId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const battleLogActions = useBattleLogActions(battlesState.addBattle, battlesState.updateBattle);

  const openBattle = openBattleId ? battlesState.getBattleById(openBattleId) : undefined;

  if (openBattle) {
    return (
      <ActiveBattleView
        battle={openBattle}
        battleLogActions={battleLogActions}
        roster={speciesRosterState.roster}
        resolveSprite={spriteCacheState.resolveSprite}
        onClose={() => setOpenBattleId(null)}
      />
    );
  }

  if (isStarting) {
    return (
      <StartBattleFlow
        teamsState={teamsState}
        battleLogActions={battleLogActions}
        resolveSprite={spriteCacheState.resolveSprite}
        onBattleStarted={battleId => { setIsStarting(false); setOpenBattleId(battleId); }}
        onCancel={() => setIsStarting(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-blue-400">Battle Log</h1>
        <button
          onClick={() => setIsStarting(true)}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer"
        >
          + New Battle
        </button>
      </div>

      <PastBattlesList
        battles={battlesState.battles}
        onOpen={setOpenBattleId}
        onDelete={battlesState.deleteBattle}
      />
    </div>
  );
}
