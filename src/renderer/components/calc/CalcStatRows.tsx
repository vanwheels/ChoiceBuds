/**
 * CalcStatRows.tsx - Base Stat + SP + Boost Editor
 * One row per stat (HP/Atk/Def/SpA/SpD/Spe), stacked vertically: label,
 * read-only base stat (from @smogon/calc's species data), SP, and boost -
 * all side by side. SP/boost inputs are kept narrow since their values
 * never exceed 2 digits (0-32 and -6..6).
 */

import type { StatsTable } from '@smogon/calc/dist/data/interface';
import type { NatureStatEffect } from '../../hooks/useDamageCalc';

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
  /** Base+SPs+nature+stage boost (Speed also paralysis-halved) - see useDamageCalc's computeBoostedStats. */
  boostedStats: StatsTable | null;
  sps: StatsTable;
  boosts: StatsTable;
  natureEffect: NatureStatEffect;
  onChangeSp: (key: keyof StatsTable, value: number) => void;
  onChangeBoost: (key: keyof StatsTable, value: number) => void;
}

export default function CalcStatRows({ baseStats, boostedStats, sps, boosts, natureEffect, onChangeSp, onChangeBoost }: CalcStatRowsProps) {
  const total = Object.values(sps).reduce((sum, v) => sum + v, 0);

  return (
    <div className="bg-gray-800 rounded px-2 py-1.5 border border-gray-600 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-wide">
        <span className="w-8 shrink-0" />
        <span className="w-10 text-center shrink-0">Base</span>
        <span className="w-10 text-center shrink-0">SP</span>
        <span className="w-10 text-center shrink-0">Boost</span>
        <span className="w-10 text-center shrink-0">Total</span>
      </div>
      {STAT_FIELDS.map(({ label, key }) => {
        const isBoosted = natureEffect.plus === key;
        const isLowered = natureEffect.minus === key;
        return (
        <div key={key} className="flex items-center gap-2">
          <span
            className={`w-8 text-[10px] uppercase shrink-0 ${
              isBoosted ? 'text-red-400 font-bold' : isLowered ? 'text-blue-400 font-bold' : 'text-gray-500'
            }`}
            title={isBoosted ? 'Boosted by nature (+10%)' : isLowered ? 'Lowered by nature (-10%)' : undefined}
          >
            {label}{isBoosted ? '+' : isLowered ? '-' : ''}
          </span>
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
          <span
            className={`w-10 text-center text-xs font-bold shrink-0 ${
              isBoosted ? 'text-red-400' : isLowered ? 'text-blue-400' : 'text-zinc-200'
            }`}
            title="Base + SP + nature + stage boost"
          >
            {boostedStats ? boostedStats[key] : '—'}
          </span>
        </div>
        );
      })}
      <p className={`text-[10px] text-right ${total > MAX_SP_TOTAL ? 'text-red-400' : 'text-gray-500'}`}>
        {total} / {MAX_SP_TOTAL} SP total
      </p>
    </div>
  );
}
