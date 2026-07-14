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

const RESULT_ACCENT_BORDER: Record<Battle['result'], string> = {
  win: 'border-l-green-500',
  loss: 'border-l-red-500',
  'in-progress': 'border-l-yellow-500',
};

const RESULT_LABELS: Record<Battle['result'], string> = {
  win: 'Win',
  loss: 'Loss',
  'in-progress': 'In Progress',
};

/** Shows the team name unless `gameLabel` is set - a Bo3 set always uses one team for all 3 games, so grouped rows show the team name once in the set header instead (see the group render below). */
function BattleRow({ battle, gameLabel, onOpen, onDelete }: {
  battle: Battle;
  gameLabel?: string;
  onOpen: (battleId: string) => void;
  onDelete: (battleId: string) => void;
}) {
  const turnCount = battle.turns.filter(t => t.actions.length > 0).length;

  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 border-l-4 ${RESULT_ACCENT_BORDER[battle.result]} hover:border-blue-500 transition-colors cursor-pointer`}
      onClick={() => onOpen(battle.id)}
    >
      <div>
        <div className="font-semibold text-gray-100">
          {gameLabel || battle.teamName}
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
      <div className="grid items-start gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))' }}>
        {groups.map(group => {
          if (group.battles.length === 1) {
            return <BattleRow key={group.setId} battle={group.battles[0]} onOpen={onOpen} onDelete={onDelete} />;
          }

          const outcome = getSetOutcome(group.battles);
          // Bo3 sets always use one team for all 3 games (real VGC match rules) - shown
          // once here from Game 1, rather than repeated on every BattleRow below.
          const teamName = group.battles[0].teamName;
          return (
            <div
              key={group.setId}
              className="flex flex-col gap-1.5 p-2 rounded-lg border border-zinc-700 bg-zinc-900/40"
              style={{ gridColumn: '1 / -1' }}
            >
              <span className="px-2 text-xs font-bold text-gray-300">
                {teamName} vs {group.opponentName} - Set {outcome.wins}-{outcome.losses}{!outcome.decided ? ' (in progress)' : ''}
              </span>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))' }}>
                {group.battles.map((battle, i) => (
                  <BattleRow key={battle.id} battle={battle} gameLabel={`Game ${i + 1}`} onOpen={onOpen} onDelete={onDelete} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
