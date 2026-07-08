/**
 * ActiveBattleView.tsx - Live Battle Log Screen
 * Roster panels flank a center column stacking the interactive Battlefield
 * (see Battlefield.tsx for the click-to-log flow), turn controls, and the
 * turn log - filling the space below the Battlefield instead of a
 * separate full-width block. Every mutation already persists immediately
 * through useBattles (see useBattleLogActions.ts) - there's no separate
 * "save" step, matching the rest of the app's write-on-every-mutation
 * convention.
 */

import { useState, useEffect, useRef } from 'react';
import type { Battle, SpeciesRosterEntry } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import PlayerFieldPanel from './PlayerFieldPanel';
import OpponentFieldPanel from './OpponentFieldPanel';
import Battlefield from './Battlefield';
import TurnLog from './TurnLog';

interface ActiveBattleViewProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
  roster: SpeciesRosterEntry[];
  resolveSprite: (remoteUrl: string) => string;
  gameDataState: UseGameDataReturn;
  onClose: () => void;
}

export default function ActiveBattleView({ battle, battleLogActions, roster, resolveSprite, gameDataState, onClose }: ActiveBattleViewProps) {
  const [notes, setNotes] = useState(battle.notes || '');
  const turnLogRef = useRef<HTMLDivElement>(null);

  // Always scroll to the newest turn as the log grows, so the latest
  // action is visible without the user having to manually scroll down.
  const lastTurn = battle.turns[battle.turns.length - 1];
  useEffect(() => {
    const el = turnLogRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [battle.turns.length, lastTurn?.actions.length]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-100">{battle.teamName}</h2>
          <p className="text-xs text-gray-400">{battle.format} - {new Date(battle.date).toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => battleLogActions.setResult(battle, 'win')}
            className={`px-3 py-1 text-xs font-bold rounded cursor-pointer ${battle.result === 'win' ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            Win
          </button>
          <button
            onClick={() => battleLogActions.setResult(battle, 'loss')}
            className={`px-3 py-1 text-xs font-bold rounded cursor-pointer ${battle.result === 'loss' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            Loss
          </button>
          <button onClick={onClose} className="text-sm text-gray-400 hover:text-gray-200 ml-2">Back</button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <PlayerFieldPanel battle={battle} battleLogActions={battleLogActions} resolveSprite={resolveSprite} />

        <div className="flex-1 flex flex-col gap-3 min-w-0 w-full">
          <Battlefield battle={battle} battleLogActions={battleLogActions} gameDataState={gameDataState} resolveSprite={resolveSprite} />

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Turn {battle.turns.length}</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => battleLogActions.undoLastAction(battle)}
                className="px-3 py-1 text-xs rounded bg-gray-800 hover:bg-gray-700 text-gray-300 cursor-pointer"
              >
                Undo Last
              </button>
              <button
                type="button"
                onClick={() => battleLogActions.advanceTurn(battle)}
                className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer"
              >
                Next Turn
              </button>
            </div>
          </div>

          <div ref={turnLogRef} className="flex-1 min-h-[12rem] max-h-[24rem] bg-gray-900/40 rounded-lg p-3 overflow-y-auto">
            <TurnLog battle={battle} battleLogActions={battleLogActions} />
          </div>
        </div>

        <OpponentFieldPanel
          battle={battle}
          battleLogActions={battleLogActions}
          roster={roster}
          resolveSprite={resolveSprite}
          gameDataState={gameDataState}
        />
      </div>

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        onBlur={() => battleLogActions.setNotes(battle, notes)}
        placeholder="Notes..."
        rows={2}
        className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg text-gray-200 outline-none focus:border-blue-500 resize-none"
      />
    </div>
  );
}
