/**
 * StartBattleFlow.tsx - New Battle Setup
 * Just picks a saved Team - the battle starts immediately with all 6
 * snapshotted (matches real VGC Team Preview, seeing the whole team before
 * choosing which 4 to bring). Which 4 to bring is now chosen live from the
 * roster column in ActiveBattleView, not a separate upfront screen.
 */

import type { Team } from '../../types/pokemon';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';

interface StartBattleFlowProps {
  teamsState: UseTeamsReturn;
  battleLogActions: UseBattleLogActionsReturn;
  onBattleStarted: (battleId: string) => void;
  onCancel: () => void;
}

export default function StartBattleFlow({ teamsState, battleLogActions, onBattleStarted, onCancel }: StartBattleFlowProps) {
  const eligibleTeams = teamsState.teams.filter(t => t.pokemon.length >= 4);

  const handleSelect = async (team: Team) => {
    const battleId = await battleLogActions.startBattle(team);
    if (battleId) onBattleStarted(battleId);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-100">Start a New Battle</h2>
        <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-200">Cancel</button>
      </div>

      {eligibleTeams.length === 0 ? (
        <p className="text-sm text-gray-400">
          No saved teams with at least 4 Pokemon yet - build one in the Teams tab first.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {eligibleTeams.map(team => (
            <button
              key={team.id}
              onClick={() => handleSelect(team)}
              className="text-left px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 hover:border-blue-500 transition-colors"
            >
              <div className="font-semibold text-gray-100">{team.name}</div>
              <div className="text-xs text-gray-400">{team.format} - {team.pokemon.length} Pokemon</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
