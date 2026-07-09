/**
 * MoveLogPopover.tsx - Move Picker for the Click-to-Log Flow
 * Opens over a Battlefield slot once its Pokemon is clicked. Player mons
 * list their full known moveset; opponent mons list whatever's been
 * revealed so far plus a freeform input for a move seen for the first time
 * - Battlefield's handleMovePicked -> logAction auto-reveals it, no
 * separate reveal step needed here.
 */

import { useState } from 'react';
import type { StatusCondition } from '../../types/pokemon';
import { useDismissable } from '../../hooks/useDismissable';
import { useMoveNameList } from '../../hooks/useMoveNameList';

interface MoveLogPopoverProps {
  actorLabel: string;
  moves: string[];
  allowFreeform: boolean;
  currentStatus: StatusCondition | null;
  onPickMove: (move: string) => void;
  onLogNoAction: (note: string) => void;
  onClose: () => void;
}

/**
 * A Pokemon that's fully paralyzed/still asleep/flinched doesn't get to
 * attack - its turn is used up with no move happening at all, not a
 * modifier on one. Reuses the same "consumes the turn" logAction call a
 * real move would (see Battlefield.tsx's onLogNoAction wiring), just with
 * no move/target/type data attached. Full Paralysis/Didn't Wake Up only
 * make sense while the matching status is actually active; Flinch has no
 * persistent flag to gate on (it depends on turn order/an earlier hit this
 * same turn, which isn't modeled), so it's always offered.
 */
function NoActionButtons({ currentStatus, onLogNoAction }: { currentStatus: StatusCondition | null; onLogNoAction: (note: string) => void }) {
  return (
    <div className="flex flex-col gap-1 pb-1 mb-1 border-b border-gray-700">
      {currentStatus === 'paralysis' && (
        <button
          type="button"
          onClick={() => onLogNoAction('Full Paralysis')}
          className="text-left px-2 py-1 text-xs rounded bg-gray-900 hover:bg-yellow-900/60 text-yellow-300 cursor-pointer transition-colors"
        >
          Full Paralysis
        </button>
      )}
      {currentStatus === 'sleep' && (
        <button
          type="button"
          onClick={() => onLogNoAction("Didn't Wake Up")}
          className="text-left px-2 py-1 text-xs rounded bg-gray-900 hover:bg-gray-700 text-gray-300 cursor-pointer transition-colors"
        >
          Didn&apos;t Wake Up
        </button>
      )}
      <button
        type="button"
        onClick={() => onLogNoAction('Flinched')}
        className="text-left px-2 py-1 text-xs rounded bg-gray-900 hover:bg-purple-900/60 text-purple-300 cursor-pointer transition-colors"
      >
        Flinched
      </button>
    </div>
  );
}

export default function MoveLogPopover({ actorLabel, moves, allowFreeform, currentStatus, onPickMove, onLogNoAction, onClose }: MoveLogPopoverProps) {
  const [freeform, setFreeform] = useState('');
  const ref = useDismissable<HTMLDivElement>(onClose);
  const allMoveNames = useMoveNameList();

  const submitFreeform = () => {
    const trimmed = freeform.trim();
    if (!trimmed) return;
    onPickMove(trimmed);
    setFreeform('');
  };

  // A native <datalist> pick fires a real 'input' event with the option's
  // value already set - if the new value is an exact match for a real move
  // name, treat it as "selected" and log immediately rather than waiting
  // for Enter/blur. Typing the full name by hand behaves identically,
  // since the match only completes on the final keystroke either way.
  const handleFreeformChange = (value: string) => {
    setFreeform(value);
    if (allMoveNames.some(name => name.toLowerCase() === value.toLowerCase())) {
      onPickMove(value);
      setFreeform('');
    }
  };

  return (
    <div ref={ref} className="absolute z-20 top-full mt-1 left-1/2 -translate-x-1/2 w-48 p-2 rounded-lg bg-gray-800 border-2 border-blue-500 shadow-lg flex flex-col gap-1">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">{actorLabel}</span>
      <NoActionButtons currentStatus={currentStatus} onLogNoAction={onLogNoAction} />
      {moves.length === 0 ? (
        <p className="text-[11px] text-gray-500 italic">No moves known yet</p>
      ) : (
        moves.map(move => (
          <button
            key={move}
            type="button"
            onClick={() => onPickMove(move)}
            className="text-left px-2 py-1 text-xs rounded bg-gray-900 hover:bg-blue-900/60 text-gray-200 cursor-pointer transition-colors"
          >
            {move}
          </button>
        ))
      )}
      {allowFreeform && (
        <>
          <input
            type="text"
            list="move-name-suggestions"
            value={freeform}
            onChange={e => handleFreeformChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submitFreeform(); }}
            placeholder="+ new move seen..."
            autoFocus={moves.length === 0}
            className="w-full px-1.5 py-1 text-[11px] bg-gray-900 border border-gray-700 rounded text-gray-200 outline-none focus:border-blue-500"
          />
          <datalist id="move-name-suggestions">
            {allMoveNames.map(name => <option key={name} value={name} />)}
          </datalist>
        </>
      )}
    </div>
  );
}
