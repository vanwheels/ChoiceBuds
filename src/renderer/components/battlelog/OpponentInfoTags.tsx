/**
 * OpponentInfoTags.tsx - Live Scouting Tags for One Opponent Pokemon
 * The "Meowstic: Yawn, Prankster" panel - simple editable/growable tags
 * filled in as revealed during the battle. Ephemeral, per-battle only.
 */

import { useState } from 'react';
import type { Battle, OpponentPokemonEntry } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';

interface OpponentInfoTagsProps {
  battle: Battle;
  opponent: OpponentPokemonEntry;
  battleLogActions: UseBattleLogActionsReturn;
}

export default function OpponentInfoTags({ battle, opponent, battleLogActions }: OpponentInfoTagsProps) {
  const [ability, setAbility] = useState(opponent.ability || '');
  const [item, setItem] = useState(opponent.item || '');
  const [newMove, setNewMove] = useState('');

  const commitTags = () => {
    battleLogActions.updateOpponentMoveTags(battle, opponent.id, ability || undefined, item || undefined);
  };

  const submitMove = () => {
    if (!newMove.trim()) return;
    battleLogActions.addOpponentMove(battle, opponent.id, newMove);
    setNewMove('');
  };

  return (
    <div className="flex flex-col gap-1.5 mt-1">
      <div className="flex flex-wrap gap-1">
        {opponent.moves.map(move => (
          <span key={move} className="flex items-center gap-1 text-[10px] bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded">
            {move}
            <button
              type="button"
              onClick={() => battleLogActions.removeOpponentMove(battle, opponent.id, move)}
              className="text-gray-400 hover:text-red-400 cursor-pointer"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={newMove}
        onChange={e => setNewMove(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submitMove(); }}
        onBlur={submitMove}
        placeholder="+ move seen"
        className="w-full px-1.5 py-0.5 text-[10px] bg-gray-900 border border-gray-700 rounded text-gray-200 outline-none focus:border-blue-500"
      />
      <div className="grid grid-cols-2 gap-1">
        <input
          type="text"
          value={ability}
          onChange={e => setAbility(e.target.value)}
          onBlur={commitTags}
          placeholder="ability"
          className="px-1.5 py-0.5 text-[10px] bg-gray-900 border border-gray-700 rounded text-gray-200 outline-none focus:border-blue-500"
        />
        <input
          type="text"
          value={item}
          onChange={e => setItem(e.target.value)}
          onBlur={commitTags}
          placeholder="item"
          className="px-1.5 py-0.5 text-[10px] bg-gray-900 border border-gray-700 rounded text-gray-200 outline-none focus:border-blue-500"
        />
      </div>
    </div>
  );
}
