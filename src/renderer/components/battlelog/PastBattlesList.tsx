/**
 * PastBattlesList.tsx - Logged Battle History
 * Reverse-chronological (battlesState.battles is already newest-first, since
 * addBattle prepends). Edit/delete only - no separate detail view, since
 * the row already shows everything a post-match record holds (see
 * RecordMatchForm.tsx, which also doubles as the edit form via `onEdit`).
 * Grouped by Bo3 set (see utils/battleSets.ts) - a set of 1 (the common
 * case for anyone not using the Opponent Name field) renders exactly like a
 * plain row always did, no visual change; a set of 2-3 renders as a
 * bordered cluster with a "Set W-L" summary and Game 1/2/3 badges.
 * Card grid cleanup (2026-09-30): `BattleRow` used to render at variable
 * heights - a long team name wrapped to two lines, and `battle.notes`
 * appended a whole extra paragraph - which looked uneven across a row of
 * same-width grid cells. Fixed height now (team name + opponent/notes icon
 * truncate to one line each via native `title` tooltips for the full text)
 * resolves that directly, so the grid itself was kept rather than switched
 * to a plain list - a multi-column grid still shows more logged battles at
 * once than a full-width list would, and uneven heights (the grid's only
 * real problem) no longer happen once every card is the same shape.
 */

import type { Battle } from '../../types/pokemon';
import { groupBattlesBySet, getSetOutcome } from '../../utils/battleSets';

interface PastBattlesListProps {
  battles: Battle[];
  onEdit: (battle: Battle) => void;
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
function BattleRow({ battle, gameLabel, onEdit, onDelete }: {
  battle: Battle;
  gameLabel?: string;
  onEdit: (battle: Battle) => void;
  onDelete: (battleId: string) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 h-16 px-4 rounded-lg bg-zinc-800 border border-zinc-700 border-l-4 ${RESULT_ACCENT_BORDER[battle.result]}`}
    >
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-zinc-100 truncate" title={gameLabel || battle.teamName}>
          {gameLabel || battle.teamName}
        </div>
        <div className="text-xs text-zinc-400 truncate">
          {battle.format} - {new Date(battle.date).toLocaleDateString()}
          {battle.opponentName ? ` - vs ${battle.opponentName}` : ''}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {battle.notes && (
          <span title={battle.notes} className="text-zinc-500 hover:text-zinc-300 cursor-help">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
              <path d="M14 3v4h4" />
              <path d="M8 17.5 9 15l5.5-5.5 2 2L11 17l-2.5 1Z" />
            </svg>
          </span>
        )}
        <span className={`px-2 py-0.5 text-xs font-bold rounded ${RESULT_STYLES[battle.result]}`}>
          {RESULT_LABELS[battle.result]}
        </span>
        <button
          onClick={() => onEdit(battle)}
          title="Edit"
          className="w-6 h-6 flex items-center justify-center rounded text-zinc-500 hover:text-accent-gold hover:bg-zinc-700 cursor-pointer"
        >
          ✎
        </button>
        <button
          onClick={() => onDelete(battle.id)}
          title="Delete"
          className="w-6 h-6 flex items-center justify-center rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-700 cursor-pointer"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default function PastBattlesList({ battles, onEdit, onDelete }: PastBattlesListProps) {
  if (battles.length === 0) {
    return <p className="text-sm text-zinc-400">No battles logged yet.</p>;
  }

  const groups = groupBattlesBySet(battles);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wide">Past Battles</h2>
      <div className="grid items-start gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(360px, 100%), 1fr))' }}>
        {groups.map(group => {
          if (group.battles.length === 1) {
            return <BattleRow key={group.setId} battle={group.battles[0]} onEdit={onEdit} onDelete={onDelete} />;
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
              <span className="px-2 text-xs font-bold text-zinc-300">
                {teamName} vs {group.opponentName} - Set {outcome.wins}-{outcome.losses}{!outcome.decided ? ' (in progress)' : ''}
              </span>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))' }}>
                {group.battles.map((battle, i) => (
                  <BattleRow key={battle.id} battle={battle} gameLabel={`Game ${i + 1}`} onEdit={onEdit} onDelete={onDelete} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
