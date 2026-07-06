/**
 * CalcStatRows.tsx - Combined SP + Boost Stat Editor
 * One row per stat (HP/Atk/Def/SpA/SpD/Spe), stacked vertically, each row
 * holding both the SP value and the stat-stage boost side by side. Replaces
 * the old separate horizontal SPs/Boosts grids (CalcStatsGrid) - narrower
 * and more compact, which matters more now that the app's minimum supported
 * width is 1280 while its primary design target is 1920.
 */

import type { StatsTable } from '@smogon/calc/dist/data/interface';

const STAT_FIELDS: Array<{ label: string; key: keyof StatsTable }> = [
  { label: 'HP', key: 'hp' },
  { label: 'Atk', key: 'atk' },
  { label: 'Def', key: 'def' },
  { label: 'SpA', key: 'spa' },
  { label: 'SpD', key: 'spd' },
  { label: 'Spe', key: 'spe' },
];

interface CalcStatRowsProps {
  sps: StatsTable;
  boosts: StatsTable;
  onChangeSp: (key: keyof StatsTable, value: number) => void;
  onChangeBoost: (key: keyof StatsTable, value: number) => void;
}

export default function CalcStatRows({ sps, boosts, onChangeSp, onChangeBoost }: CalcStatRowsProps) {
  const total = Object.values(sps).reduce((sum, v) => sum + v, 0);

  return (
    <div className="bg-gray-800 rounded px-2 py-1.5 border border-gray-600 flex flex-col gap-1">
      <div className="flex justify-between items-center text-[10px] text-gray-400 uppercase tracking-wide px-8">
        <span>SP</span>
        <span>Boost</span>
      </div>
      {STAT_FIELDS.map(({ label, key }) => (
        <div key={key} className="flex items-center gap-2">
          <span className="w-8 text-[10px] text-gray-500 uppercase shrink-0">{label}</span>
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
            className="flex-1 min-w-0 px-1 py-0.5 text-xs text-center bg-gray-900 border border-gray-600 rounded text-white outline-none focus:border-blue-500"
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
            className="flex-1 min-w-0 px-1 py-0.5 text-xs text-center bg-gray-900 border border-gray-600 rounded text-white outline-none focus:border-blue-500"
          />
        </div>
      ))}
      <p className="text-[10px] text-gray-500 text-right">{total} SP total</p>
    </div>
  );
}
