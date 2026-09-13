/**
 * CalcStatSpreadChips.tsx - Usage-Ranked Stat Point Spread Picker
 * Stat Points can't use the annotate-the-existing-dropdown pattern the other
 * three usage-ranked axes (Item/Ability/Nature) use in CalcPokemonPanel.tsx -
 * CalcStatRows has 6 free numeric inputs, no dropdown, and Champions usage
 * ranks whole 6-stat spreads rather than one stat at a time (Regular Calc
 * Usage-Data Auto-Populate Leg 2, see TODO.md). This renders each of
 * ChampionsUsageEntry.statSpreads as a clickable chip; picking one writes
 * all 6 `sps` values at once via the panel's existing `onChange({ sps })`.
 */

import type { StatsTable } from '@smogon/calc/dist/data/interface';
import type { ChampionsUsageStatSpreadEntry } from '../../types/gameData';

interface CalcStatSpreadChipsProps {
  statSpreads: ChampionsUsageStatSpreadEntry[];
  currentSps: StatsTable;
  onSelect: (points: StatsTable) => void;
}

const isSameSpread = (a: StatsTable, b: StatsTable): boolean =>
  a.hp === b.hp && a.atk === b.atk && a.def === b.def && a.spa === b.spa && a.spd === b.spd && a.spe === b.spe;

const formatSpread = (points: StatsTable): string =>
  [points.hp, points.atk, points.def, points.spa, points.spd, points.spe].join('/');

export default function CalcStatSpreadChips({ statSpreads, currentSps, onSelect }: CalcStatSpreadChipsProps) {
  if (statSpreads.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] text-zinc-400 uppercase tracking-wide">
        Usage-Ranked SP Spreads (HP/Atk/Def/SpA/SpD/Spe)
      </label>
      <div className="flex flex-wrap gap-1">
        {statSpreads.map((entry, index) => {
          const active = isSameSpread(entry.points, currentSps);
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelect(entry.points)}
              title={`${entry.percentage.toFixed(1)}% of ranked ladder sets`}
              className={`px-1.5 py-0.5 text-[10px] font-mono rounded border transition-colors cursor-pointer ${
                active ? 'border-accent-gold bg-accent-gold/10 text-accent-gold' : 'border-zinc-600 bg-zinc-800 text-zinc-300 hover:border-zinc-400'
              }`}
            >
              {formatSpread(entry.points)} ({entry.percentage.toFixed(1)}%)
            </button>
          );
        })}
      </div>
    </div>
  );
}
