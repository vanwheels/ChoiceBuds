/**
 * MoveLogPopover.tsx - Move Picker for the Click-to-Log Flow
 * Opens over a Battlefield slot once its Pokemon is clicked. Player mons
 * list their full known moveset; opponent mons list whatever's been
 * revealed so far plus a freeform input for a move seen for the first time
 * - Battlefield's handleMovePicked -> logAction auto-reveals it, no
 * separate reveal step needed here.
 */

import { useState } from 'react';
import { useDismissable } from '../../hooks/useDismissable';

interface MoveLogPopoverProps {
  actorLabel: string;
  moves: string[];
  allowFreeform: boolean;
  onPickMove: (move: string) => void;
  onClose: () => void;
}

export default function MoveLogPopover({ actorLabel, moves, allowFreeform, onPickMove, onClose }: MoveLogPopoverProps) {
  const [freeform, setFreeform] = useState('');
  const ref = useDismissable<HTMLDivElement>(onClose);

  const submitFreeform = () => {
    const trimmed = freeform.trim();
    if (!trimmed) return;
    onPickMove(trimmed);
    setFreeform('');
  };

  return (
    <div ref={ref} className="absolute z-20 top-full mt-1 left-1/2 -translate-x-1/2 w-48 p-2 rounded-lg bg-gray-800 border-2 border-blue-500 shadow-lg flex flex-col gap-1">
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate">{actorLabel}</span>
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
        <input
          type="text"
          value={freeform}
          onChange={e => setFreeform(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitFreeform(); }}
          placeholder="+ new move seen..."
          autoFocus={moves.length === 0}
          className="w-full px-1.5 py-1 text-[11px] bg-gray-900 border border-gray-700 rounded text-gray-200 outline-none focus:border-blue-500"
        />
      )}
    </div>
  );
}
