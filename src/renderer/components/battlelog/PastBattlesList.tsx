/**
 * PastBattlesList.tsx - Logged Battle History
 * Reverse-chronological (battlesState.battles is already newest-first, since
 * addBattle prepends). Click a row to resume/review it; delete removes it.
 * Grouped by Bo3 set (see utils/battleSets.ts) - a set of 1 (the common
 * case for anyone not using the Opponent Name field) renders exactly like a
 * plain row always did, no visual change; a set of 2-3 renders as a
 * bordered cluster with a "Set W-L" summary and Game 1/2/3 badges.
 */

import type { Battle } from '../../types/pokemon';
import { groupBattlesBySet, getSetOutcome } from '../../utils/battleSets';

interface PastBattlesListProps {
  battles: Battle[];
  onOpen: (battleId: string) => void;
  onDelete: (battleId: string) => void;
}

const RESULT_STYLES: Record<Battle['result'], string> = {
  win: 'bg-green-600 text-white',
  loss: 'bg-red-600 text-white',
  'in-progress': 'bg-yellow-600 text-white',
};

const RESULT_LABELS: Record<Battle['result'], string> = {
  win: 'Win',
  loss: 'Loss',
  'in-progress': 'In Progress',
};

function BattleRow({ battle, gameLabel, onOpen, onDelete }: {
  battle: Battle;
  gameLabel?: string;
  onOpen: (battleId: string) => void;
  onDelete: (battleId: string) => void;
}) {
  const turnCount = battle.turns.filter(t => t.actions.length > 0).length;

  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
      onClick={() => onOpen(battle.id)}
    >
      <div>
        <div className="font-semibold text-gray-100">
          {gameLabel && <span className="text-gray-400 font-normal">{gameLabel} - </span>}
          {battle.teamName}
        </div>
        <div className="text-xs text-gray-400">
          {battle.format} - {new Date(battle.date).toLocaleDateString()} - {turnCount} turn{turnCount === 1 ? '' : 's'}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`px-2 py-0.5 text-xs font-bold rounded ${RESULT_STYLES[battle.result]}`}>
          {RESULT_LABELS[battle.result]}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onDelete(battle.id); }}
          title="Delete"
          className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 cursor-pointer"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function PastBattlesList({ battles, onOpen, onDelete }: PastBattlesListProps) {
  if (battles.length === 0) {
    return <p className="text-sm text-gray-400">No battles logged yet.</p>;
  }

  const groups = groupBattlesBySet(battles);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Past Battles</h2>
      {groups.map(group => {
        if (group.battles.length === 1) {
          return <BattleRow key={group.setId} battle={group.battles[0]} onOpen={onOpen} onDelete={onDelete} />;
        }

        const outcome = getSetOutcome(group.battles);
        return (
          <div key={group.setId} className="flex flex-col gap-1.5 p-2 rounded-lg border border-zinc-700 bg-zinc-900/40">
            <span className="px-2 text-xs font-bold text-gray-300">
              vs {group.opponentName} - Set {outcome.wins}-{outcome.losses}{!outcome.decided ? ' (in progress)' : ''}
            </span>
            <div className="flex flex-col gap-1.5">
              {group.battles.map((battle, i) => (
                <BattleRow key={battle.id} battle={battle} gameLabel={`Game ${i + 1}`} onOpen={onOpen} onDelete={onDelete} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
