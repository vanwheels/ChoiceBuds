/**
 * ActiveBattleView.tsx - Live Battle Log Screen
 * Composes both field panels, the turn/action log, and the entry bar. Every
 * mutation already persists immediately through useBattles (see
 * useBattleLogActions.ts) - there's no separate "save" step, matching the
 * rest of the app's write-on-every-mutation convention.
 */

import { useState } from 'react';
import type { Battle, SpeciesRosterEntry } from '../../types/pokemon';
import type { UseBattleLogActionsReturn } from '../../hooks/useBattleLogActions';
import PlayerFieldPanel from './PlayerFieldPanel';
import OpponentFieldPanel from './OpponentFieldPanel';
import Battlefield from './Battlefield';
import TurnLog from './TurnLog';
import ActionEntryBar from './ActionEntryBar';
import FieldWeatherBar from './FieldWeatherBar';

interface ActiveBattleViewProps {
  battle: Battle;
  battleLogActions: UseBattleLogActionsReturn;
  roster: SpeciesRosterEntry[];
  resolveSprite: (remoteUrl: string) => string;
  onClose: () => void;
}

export default function ActiveBattleView({ battle, battleLogActions, roster, resolveSprite, onClose }: ActiveBattleViewProps) {
  const [notes, setNotes] = useState(battle.notes || '');

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

      <ActionEntryBar battle={battle} battleLogActions={battleLogActions} />

      <FieldWeatherBar battle={battle} battleLogActions={battleLogActions} />

      <div className="flex flex-col lg:flex-row gap-4 items-start">
        <PlayerFieldPanel battle={battle} battleLogActions={battleLogActions} resolveSprite={resolveSprite} />
        <Battlefield battle={battle} resolveSprite={resolveSprite} />
        <OpponentFieldPanel battle={battle} battleLogActions={battleLogActions} roster={roster} resolveSprite={resolveSprite} />
      </div>

      <div className="bg-gray-900/40 rounded-lg p-3 max-h-[20rem] overflow-y-auto">
        <TurnLog battle={battle} />
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
