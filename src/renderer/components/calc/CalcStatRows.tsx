/**
 * CalcStatRows.tsx - Base Stat + SP + Boost Editor
 * One row per stat (HP/Atk/Def/SpA/SpD/Spe), stacked vertically: label,
 * read-only base stat (from @smogon/calc's species data), SP, and boost -
 * all side by side. SP/boost inputs are kept narrow since their values
 * never exceed 2 digits (0-32 and -6..6).
 */

import type { StatsTable } from '@smogon/calc/dist/data/interface';

/** Confirmed in-game: max 32 Stat Points per stat, 66 total across all six. */
const MAX_SP_TOTAL = 66;

const STAT_FIELDS: Array<{ label: string; key: keyof StatsTable }> = [
  { label: 'HP', key: 'hp' },
  { label: 'Atk', key: 'atk' },
  { label: 'Def', key: 'def' },
  { label: 'SpA', key: 'spa' },
  { label: 'SpD', key: 'spd' },
  { label: 'Spe', key: 'spe' },
];

interface CalcStatRowsProps {
  baseStats: StatsTable | null;
  sps: StatsTable;
  boosts: StatsTable;
  onChangeSp: (key: keyof StatsTable, value: number) => void;
  onChangeBoost: (key: keyof StatsTable, value: number) => void;
}

export default function CalcStatRows({ baseStats, sps, boosts, onChangeSp, onChangeBoost }: CalcStatRowsProps) {
  const total = Object.values(sps).reduce((sum, v) => sum + v, 0);

  return (
    <div className="bg-gray-800 rounded px-2 py-1.5 border border-gray-600 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-wide">
        <span className="w-8 shrink-0" />
        <span className="w-10 text-center shrink-0">Base</span>
        <span className="w-10 text-center shrink-0">SP</span>
        <span className="w-10 text-center shrink-0">Boost</span>
      </div>
      {STAT_FIELDS.map(({ label, key }) => (
        <div key={key} className="flex items-center gap-2">
          <span className="w-8 text-[10px] text-gray-500 uppercase shrink-0">{label}</span>
          <span className="w-10 text-center text-xs text-zinc-300 shrink-0">{baseStats ? baseStats[key] : '—'}</span>
          <input
            type="number"
            min={0}
            max={32}
            value={sps[key]}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (!Number.isNaN(parsed)) onChangeSp(key, Math.max(0, Math.min(32, parsed)));
            }}
            title="Stat Points (0-32)"
            className="w-10 shrink-0 px-1 py-0.5 text-xs text-center bg-gray-900 border border-gray-600 rounded text-white outline-none focus:border-blue-500"
          />
          <input
            type="number"
            min={-6}
            max={6}
            value={boosts[key]}
            onChange={(e) => {
              const parsed = Number(e.target.value);
              if (!Number.isNaN(parsed)) onChangeBoost(key, Math.max(-6, Math.min(6, parsed)));
            }}
            title="Stat stage boost (-6 to +6)"
            className="w-10 shrink-0 px-1 py-0.5 text-xs text-center bg-gray-900 border border-gray-600 rounded text-white outline-none focus:border-blue-500"
          />
        </div>
      ))}
      <p className={`text-[10px] text-right ${total > MAX_SP_TOTAL ? 'text-red-400' : 'text-gray-500'}`}>
        {total} / {MAX_SP_TOTAL} SP total
      </p>
    </div>
  );
}
