/**
 * PastBattlesList.tsx - Logged Battle History
 * Reverse-chronological (battlesState.battles is already newest-first, since
 * addBattle prepends). Click a row to resume/review it; delete removes it.
 */

import type { Battle } from '../../types/pokemon';

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

export default function PastBattlesList({ battles, onOpen, onDelete }: PastBattlesListProps) {
  if (battles.length === 0) {
    return <p className="text-sm text-gray-400">No battles logged yet.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-bold text-gray-300 uppercase tracking-wide">Past Battles</h2>
      {battles.map(battle => {
        const turnCount = battle.turns.filter(t => t.actions.length > 0).length;

        return (
          <div
            key={battle.id}
            className="flex items-center justify-between px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 hover:border-blue-500 transition-colors cursor-pointer"
            onClick={() => onOpen(battle.id)}
          >
            <div>
              <div className="font-semibold text-gray-100">{battle.teamName}</div>
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
      })}
    </div>
  );
}
