/**
 * StartBattleFlow.tsx - New Battle Setup
 * Step 1: pick a saved Team. Step 2: pick 4 of that team's Pokemon to bring
 * (PickBroughtFourGrid). Confirming calls useBattleLogActions.startBattle
 * and hands the new battle's id back up to BattleLogPage to open it.
 */

import { useState } from 'react';
import type { Team } from '../../types/pokemon';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import PickBroughtFourGrid from './PickBroughtFourGrid';

interface StartBattleFlowProps {
  teamsState: UseTeamsReturn;
  battleLogActions: UseBattleLogActionsReturn;
  resolveSprite: (remoteUrl: string) => string;
  onBattleStarted: (battleId: string) => void;
  onCancel: () => void;
}

export default function StartBattleFlow({ teamsState, battleLogActions, resolveSprite, onBattleStarted, onCancel }: StartBattleFlowProps) {
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [isStarting, setIsStarting] = useState(false);

  const eligibleTeams = teamsState.teams.filter(t => t.pokemon.length >= 4);

  const toggleIndex = (index: number) => {
    setSelectedIndices(prev =>
      prev.includes(index) ? prev.filter(i => i !== index) : prev.length < 4 ? [...prev, index] : prev
    );
  };

  const handleConfirm = async () => {
    if (!selectedTeam || selectedIndices.length !== 4) return;
    setIsStarting(true);
    const battleId = await battleLogActions.startBattle(selectedTeam, selectedIndices);
    setIsStarting(false);
    if (battleId) onBattleStarted(battleId);
  };

  if (!selectedTeam) {
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
                onClick={() => setSelectedTeam(team)}
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-100">Pick 4 to Bring - {selectedTeam.name}</h2>
        <button onClick={() => setSelectedTeam(null)} className="text-sm text-gray-400 hover:text-gray-200">Back</button>
      </div>

      <PickBroughtFourGrid
        pokemon={selectedTeam.pokemon}
        selectedIndices={selectedIndices}
        onToggle={toggleIndex}
        resolveSprite={resolveSprite}
      />

      <button
        onClick={handleConfirm}
        disabled={selectedIndices.length !== 4 || isStarting}
        className="self-start px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition-colors"
      >
        {isStarting ? 'Starting...' : `Start Battle (${selectedIndices.length}/4)`}
      </button>
    </div>
  );
}
