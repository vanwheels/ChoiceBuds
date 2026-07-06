/**
 * CalcStatsGrid.tsx - EV / IV / Boost Stat Row
 * One reusable 6-column number-input row, keyed by @smogon/calc's own
 * StatID ('hp'/'atk'/'def'/'spa'/'spd'/'spe') - reused three times per
 * CalcPokemonPanel (EVs, IVs, boosts) with different bounds/step.
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

interface CalcStatsGridProps {
  title: string;
  values: StatsTable;
  min: number;
  max: number;
  step: number;
  showTotal?: boolean;
  onChange: (key: keyof StatsTable, value: number) => void;
}

export default function CalcStatsGrid({ title, values, min, max, step, showTotal, onChange }: CalcStatsGridProps) {
  const total = Object.values(values).reduce((sum, v) => sum + v, 0);

  const handleChange = (key: keyof StatsTable, raw: string) => {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    onChange(key, Math.max(min, Math.min(max, parsed)));
  };

  return (
    <div className="bg-gray-800 rounded px-2 py-1.5 border border-gray-600">
      <div className="flex justify-between items-center mb-1">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{title}</p>
        {showTotal && <span className="text-[10px] font-bold text-gray-400">{total}</span>}
      </div>
      <div className="grid grid-cols-6 gap-1">
        {STAT_FIELDS.map(({ label, key }) => (
          <div key={key} className="flex flex-col items-center gap-0.5">
            <label className="text-[9px] text-gray-500 uppercase">{label}</label>
            <input
              type="number"
              min={min}
              max={max}
              step={step}
              value={values[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              className="w-full px-1 py-0.5 text-xs text-center bg-gray-900 border border-gray-600 rounded text-white outline-none focus:border-blue-500"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
