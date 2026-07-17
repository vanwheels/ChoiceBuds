/**
 * LikelySetsPopover.tsx - Ranked-Usage "Likely Set" Suggestion
 * Deliberately separate from OpponentRowFields.tsx's real ability/item/move
 * controls - this is guessed data from championsbattledata.com's ranked
 * usage stats (see services/championsBattleData.ts), never a confirmed
 * reveal. Visually distinct (dashed border, amber accent, never the app's
 * existing confirmed-state blue/red) so it can never be mistaken for
 * OpponentPokemonEntry's actually-observed fields.
 *
 * v1 (Phase 1) only surfaces the Ability category - Item/Moves/Nature/Stat
 * Points are a follow-up pass, see TODO.md.
 */

import type { ChampionsUsageEntry } from '../../types/pokemon';
import { useDismissable } from '../../hooks/useDismissable';

interface LikelySetsPopoverProps {
  usage: ChampionsUsageEntry;
  hideAbility: boolean;
  onClose: () => void;
}

export default function LikelySetsPopover({ usage, hideAbility, onClose }: LikelySetsPopoverProps) {
  const ref = useDismissable<HTMLDivElement>(onClose);
  const abilities = hideAbility ? [] : usage.abilities.slice(0, 3);

  return (
    <div ref={ref} className="absolute z-20 top-full mt-1 left-0 w-48 p-2 rounded-lg bg-gray-800 border-2 border-dashed border-amber-700 shadow-lg flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">Likely Set (unconfirmed)</span>
        <button type="button" onClick={onClose} className="text-gray-500 hover:text-red-400 cursor-pointer text-xs shrink-0">×</button>
      </div>
      {abilities.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] text-gray-500 uppercase">Ability</span>
          {abilities.map(a => (
            <div key={a.name} className="flex items-center justify-between text-[10px] text-gray-200">
              <span className="truncate">{a.name}</span>
              <span className="text-gray-500 shrink-0 ml-1">{a.percentage.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      )}
      <span className="text-[8px] text-gray-600">Champions ranked usage · {usage.season}</span>
    </div>
  );
}
