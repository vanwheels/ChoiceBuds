/**
 * CalcResultPanel.tsx - Selected Move's Full Damage Detail
 * Shows whichever move slot was last clicked in either CalcMoveGrid -
 * matches the real Champions calc's single shared detail line + possible-
 * damage-amounts list under the two move grids.
 */

import type { CalcMoveResultEntry } from '../../hooks/useDamageCalc';

interface CalcResultPanelProps {
  entry: CalcMoveResultEntry | null;
}

export default function CalcResultPanel({ entry }: CalcResultPanelProps) {
  return (
    <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-4 flex flex-col gap-2">
      <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wide">Result</h3>
      {!entry ? (
        <p className="text-sm text-zinc-500">Set up both Pokémon, pick a move, then click a move row to see the full result.</p>
      ) : entry.errorMessage ? (
        <p className="text-sm text-red-400">{entry.errorMessage}</p>
      ) : entry.desc && entry.range ? (
        <>
          <p className="text-base font-semibold text-white">{entry.desc}</p>
          <p className="text-sm text-zinc-400">
            Damage: {entry.range[0]} - {entry.range[1]}
            {entry.kochanceText ? ` · ${entry.kochanceText}` : ''}
          </p>
          {entry.possibleDamages.length > 0 && (
            <p className="text-xs text-zinc-500">
              Possible damage amounts: {entry.possibleDamages.join(', ')}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-zinc-500">Pick a species for both sides and a move to see a damage result.</p>
      )}
    </div>
  );
}
