/**
 * ActionEntryBar.tsx - Speed-Critical Turn Action Entry
 * The core "record what just happened, in order, fast" control this whole
 * feature exists for. Actor defaults to a currently-active Pokemon; move is
 * freeform text (datalist-suggested from the player actor's own known
 * moves); target and note are optional. Submitting logs the action and
 * clears move/target/note - side/actor stay selected for quick repeats.
 */

import { useState } from 'react';
import type { Battle, BattleSide } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import { battlePokemonDisplayName } from '../../utils/battleLookup';

interface ActionEntryBarProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
}

export default function ActionEntryBar({ battle, battleLogActions }: ActionEntryBarProps) {
  const defaultSide: BattleSide = battle.playerActiveIds[0] ? 'player' : 'opponent';
  const [side, setSide] = useState<BattleSide>(defaultSide);
  const [pokemonId, setPokemonId] = useState<string>(
    (defaultSide === 'player' ? battle.playerActiveIds[0] : battle.opponentActiveIds[0]) || ''
  );
  const [move, setMove] = useState('');
  const [targetKey, setTargetKey] = useState(''); // "side:pokemonId" or ''
  const [note, setNote] = useState('');

  const broughtRoster = battle.playerRoster.filter(p => battle.broughtIds.includes(p.id));
  const actorOptions = side === 'player' ? broughtRoster : battle.opponentRoster;
  const actor = actorOptions.find(p => p.id === pokemonId);
  const actorMoves = actor && 'moves' in actor ? actor.moves : [];

  const allTargets = [
    ...broughtRoster.map(p => ({ side: 'player' as const, id: p.id })),
    ...battle.opponentRoster.map(p => ({ side: 'opponent' as const, id: p.id })),
  ];

  const handleSideChange = (nextSide: BattleSide) => {
    setSide(nextSide);
    const defaultId = nextSide === 'player' ? battle.playerActiveIds[0] : battle.opponentActiveIds[0];
    setPokemonId(defaultId || (nextSide === 'player' ? broughtRoster[0]?.id : battle.opponentRoster[0]?.id) || '');
  };

  const handleSubmit = () => {
    if (!pokemonId) return;
    const [targetSide, targetId] = targetKey ? targetKey.split(':') : [null, null];

    battleLogActions.logAction(battle, {
      side,
      pokemonId,
      move: move.trim() || undefined,
      target: targetSide && targetId ? { side: targetSide as BattleSide, pokemonId: targetId } : undefined,
      note: note.trim() || undefined,
    });

    setMove('');
    setTargetKey('');
    setNote('');
  };

  return (
    <div className="flex flex-col gap-2 p-3 rounded-lg bg-gray-800 border border-gray-700">
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={side}
          onChange={e => handleSideChange(e.target.value as BattleSide)}
          className="px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-gray-200"
        >
          <option value="player">Mine</option>
          <option value="opponent">Opponent</option>
        </select>

        <select
          value={pokemonId}
          onChange={e => setPokemonId(e.target.value)}
          className="px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-gray-200 min-w-[100px]"
        >
          {actorOptions.map(p => (
            <option key={p.id} value={p.id}>{'nickname' in p && p.nickname ? p.nickname : p.species}</option>
          ))}
        </select>

        <input
          type="text"
          value={move}
          onChange={e => setMove(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          list="action-entry-move-options"
          placeholder="move used"
          className="flex-1 min-w-[120px] px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-gray-200 outline-none focus:border-blue-500"
        />
        <datalist id="action-entry-move-options">
          {actorMoves.map(m => <option key={m} value={m} />)}
        </datalist>

        <select
          value={targetKey}
          onChange={e => setTargetKey(e.target.value)}
          className="px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-gray-200"
        >
          <option value="">no target</option>
          {allTargets.map(t => (
            <option key={`${t.side}:${t.id}`} value={`${t.side}:${t.id}`}>
              {battlePokemonDisplayName(battle, t.side, t.id)}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          placeholder="note (optional)"
          className="flex-1 min-w-[100px] px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded text-gray-200 outline-none focus:border-blue-500"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!pokemonId}
          className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold cursor-pointer"
        >
          Log
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => battleLogActions.advanceTurn(battle)}
          className="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200 cursor-pointer"
        >
          Next Turn
        </button>
        <button
          type="button"
          onClick={() => battleLogActions.undoLastAction(battle)}
          className="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200 cursor-pointer"
        >
          Undo Last
        </button>
      </div>
    </div>
  );
}
