/**
 * StartBattleFlow.tsx - New Battle Setup
 * Just picks a saved Team - the battle starts immediately with all 6
 * snapshotted (matches real VGC Team Preview, seeing the whole team before
 * choosing which 4 to bring). Which 4 to bring is now chosen live from the
 * roster column in ActiveBattleView, not a separate upfront screen.
 *
 * The optional Opponent Name field is the only persistent opponent-identity
 * concept in the app - typing the same name (case-insensitive) as a recent
 * not-yet-decided battle auto-continues that Bo3 set instead of starting a
 * new one (see useBattleLogActions.ts::startBattle/utils/battleSets.ts).
 * Leaving it blank behaves exactly as before this existed - a plain
 * standalone battle with no Bo3 framing anywhere.
 */

import { useState } from 'react';
import type { Team } from '../../types/pokemon';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseBattlesReturn } from '../../hooks/useBattles';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';

interface StartBattleFlowProps {
  teamsState: UseTeamsReturn;
  battlesState: UseBattlesReturn;
  battleLogActions: UseBattleLogActionsReturn;
  onBattleStarted: (battleId: string) => void;
  onCancel: () => void;
}

export default function StartBattleFlow({ teamsState, battlesState, battleLogActions, onBattleStarted, onCancel }: StartBattleFlowProps) {
  const [opponentName, setOpponentName] = useState('');
  const eligibleTeams = teamsState.teams.filter(t => t.pokemon.length >= 4);
  const priorOpponentNames = Array.from(
    new Set(battlesState.battles.map(b => b.opponentName).filter((n): n is string => !!n))
  );

  const handleSelect = async (team: Team) => {
    const battleId = await battleLogActions.startBattle(team, opponentName);
    if (battleId) onBattleStarted(battleId);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-100">Start a New Battle</h2>
        <button onClick={onCancel} className="text-sm text-gray-400 hover:text-gray-200">Cancel</button>
      </div>

      <div>
        <label htmlFor="opponentName" className="block text-sm font-medium text-gray-300 mb-2">
          Opponent Name <span className="text-gray-500 font-normal">(optional - type the same name again to continue a Bo3 set)</span>
        </label>
        <input
          id="opponentName"
          type="text"
          list="prior-opponent-names"
          value={opponentName}
          onChange={e => setOpponentName(e.target.value)}
          placeholder="Who are you playing?"
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <datalist id="prior-opponent-names">
          {priorOpponentNames.map(name => <option key={name} value={name} />)}
        </datalist>
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
