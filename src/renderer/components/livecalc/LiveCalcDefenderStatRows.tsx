/**
 * LiveCalcDefenderStatRows.tsx - Opponent's Unified Base/SP/Boost/Total Table
 * The Opponent-panel half of Live Calc Player/Opponent Card Redesign's
 * unified stat table - same four-column shape `CalcStatRows.tsx` already
 * shows for a fully-known Pokémon, but SP and Total are ranges here instead
 * of single editable/computed values, since the opponent's own spread is
 * inferred rather than known. Kept as its own component rather than folded
 * into `CalcStatRows.tsx` because the two data shapes don't overlap enough
 * to share one prop surface (ranges vs. single numbers, no SP input at all
 * here) - same one-component-per-real-shape reasoning as this app's other
 * "structurally similar but not identical" pairs.
 *
 * HP never narrows (see `liveCalcEngine.ts::computeDefenderTotalRanges()`'s
 * header) - its SP cell always reads "0-32" and has no boost input, same
 * "theoretical ceiling for context, not a real narrowing state" framing as
 * that function's Total column for HP. The detailed per-stat narrowing
 * visualization (progress bar + observation count) lives separately, below
 * this table, in `LiveCalcDefenderPanel.tsx`'s own "Stat Points" section -
 * this table is the compact at-a-glance summary, not a replacement for it.
 */

import type { StatsTable } from '@smogon/calc/dist/data/interface';
import type { LiveCalcStatBound, LiveCalcTotalRange } from '../../utils/liveCalcEngine';
import { getStatLabelColor } from '../../config/pokemonTheme';

const SP_MIN = 0;
const SP_MAX = 32;

const STAT_FIELDS: Array<{ label: string; key: keyof StatsTable }> = [
  { label: 'HP', key: 'hp' },
  { label: 'Atk', key: 'atk' },
  { label: 'Def', key: 'def' },
  { label: 'SpA', key: 'spa' },
  { label: 'SpD', key: 'spd' },
  { label: 'Spe', key: 'spe' },
];

function rangeText(bound: { min: number; max: number }): string {
  return bound.min === bound.max ? `${bound.min}` : `${bound.min}-${bound.max}`;
}

interface LiveCalcDefenderStatRowsProps {
  baseStats: StatsTable | null;
  spBounds: Record<keyof StatsTable, LiveCalcStatBound>;
  totalRanges: Record<keyof StatsTable, LiveCalcTotalRange> | null;
  boosts: Partial<Record<keyof StatsTable, { value: number; onChange: (stage: number) => void }>>;
}

export default function LiveCalcDefenderStatRows({ baseStats, spBounds, totalRanges, boosts }: LiveCalcDefenderStatRowsProps) {
  return (
    <div className="bg-zinc-800 rounded px-2 py-1.5 border border-zinc-600 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-[10px] text-zinc-400 uppercase tracking-wide">
        <span className="w-8 shrink-0" />
        <span className="w-10 text-center shrink-0">Base</span>
        <span className="w-14 text-center shrink-0">SP</span>
        <span className="w-10 text-center shrink-0">Boost</span>
        <span className="w-14 text-center shrink-0">Total</span>
      </div>
      {STAT_FIELDS.map(({ label, key }) => {
        const boost = boosts[key];
        const spRange = key === 'hp' ? { min: SP_MIN, max: SP_MAX } : spBounds[key];
        const total = totalRanges?.[key] ?? null;
        return (
          <div key={key} className="flex items-center gap-2">
            <span className={`w-8 text-[10px] uppercase shrink-0 ${getStatLabelColor(label)}`}>{label}</span>
            <span className="w-10 text-center text-xs text-zinc-300 shrink-0">{baseStats ? baseStats[key] : '—'}</span>
            <span className="w-14 text-center text-xs text-zinc-400 shrink-0" title="Narrowed Stat Point range (0-32)">
              {rangeText(spRange)}
            </span>
            {boost ? (
              <input
                type="number"
                min={-6}
                max={6}
                value={boost.value}
                onChange={(e) => {
                  const parsed = Number(e.target.value);
                  if (!Number.isNaN(parsed)) boost.onChange(Math.max(-6, Math.min(6, parsed)));
                }}
                title="Known stat stage boost (-6 to +6)"
                className="w-10 shrink-0 px-1 py-0.5 text-xs text-center bg-zinc-900 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold"
              />
            ) : (
              <span className="w-10 text-center text-xs text-zinc-600 shrink-0">—</span>
            )}
            <span className="w-14 text-center text-xs font-bold text-zinc-200 shrink-0" title="Base + SP + nature + stage boost, as a range">
              {total ? rangeText(total) : '—'}
            </span>
          </div>
        );
      })}
    </div>
  );
}
