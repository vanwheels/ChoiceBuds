/**
 * LiveCalcCandidateGroup.tsx - Narrowed Candidate List + Fraction Bar
 * Shared presentational primitive for the three candidate axes the engine
 * narrows independently (nature/ability/item, per docs/investigations/
 * live-calc-stat-inference-scope.md) - a "X of Y possible" fraction plus a
 * proportional bar (same shape as statistics/StatBar.tsx's win-rate bar) is
 * the "certainty indication" this leg's TODO entry asks for: it shrinks
 * visibly as observations accumulate. Chips are only listed individually
 * once the pool is small enough to be a useful glance (an un-narrowed 25-
 * nature pool as a wall of chips isn't more informative than the fraction
 * alone) - `CHIP_DISPLAY_THRESHOLD` is that cutoff.
 */

const CHIP_DISPLAY_THRESHOLD = 12;

interface LiveCalcCandidateGroupProps {
  label: string;
  candidates: string[];
  totalCount: number;
}

export default function LiveCalcCandidateGroup({ label, candidates, totalCount }: LiveCalcCandidateGroupProps) {
  const narrowedPercent = totalCount > 0 ? (candidates.length / totalCount) * 100 : 100;
  const isFullyOpen = totalCount > 0 && candidates.length === totalCount;
  const isContradicted = totalCount > 0 && candidates.length === 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-300 font-semibold">{label}</span>
        <span className={isContradicted ? 'text-red-400' : 'text-zinc-500'}>
          {candidates.length} of {totalCount} possible
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={`h-full ${isContradicted ? 'bg-red-500' : 'bg-accent-gold'}`}
          style={{ width: `${Math.max(narrowedPercent, candidates.length > 0 ? 4 : 0)}%` }}
        />
      </div>
      {isContradicted ? (
        <p className="text-[11px] text-red-400">No {label.toLowerCase()} option fits every observation so far.</p>
      ) : isFullyOpen ? (
        <p className="text-[11px] text-zinc-500">No narrowing yet - all {totalCount} still possible.</p>
      ) : candidates.length <= CHIP_DISPLAY_THRESHOLD ? (
        <div className="flex flex-wrap gap-1">
          {candidates.map(c => (
            <span key={c} className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-300">
              {c}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-zinc-500">{candidates.length} candidates still possible.</p>
      )}
    </div>
  );
}
