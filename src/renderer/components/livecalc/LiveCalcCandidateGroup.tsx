/**
 * LiveCalcCandidateGroup.tsx - Narrowed Candidate List + Fraction Bar
 * Shared presentational primitive for the three candidate axes the engine
 * narrows independently (nature/ability/item, per docs/investigations/
 * live-calc-stat-inference-scope.md) - a "X of Y possible" fraction plus a
 * proportional bar (same shape as statistics/StatBar.tsx's win-rate bar) is
 * the "certainty indication" this leg's TODO entry asks for: it shrinks
 * visibly as observations accumulate. The fraction/bar always reflect
 * `candidates` (the physically-possible set - unaffected by usage
 * weighting), never `usageCandidates` - see this file's header comment
 * further down for why those stay a separate display layer underneath.
 *
 * Live Calc Usage-Data-Backed Inference - Leg 2: the chip list itself now
 * defaults to `usageCandidates` (Champions ranked-ladder usage-ranked/
 * filtered, per-chip percentage badge) rather than the plain physically-
 * possible list, with a toggle back to the full `candidates` set - Vanny's
 * "hidden by default, one toggle reveals the full physically-possible set"
 * call in the scope doc. The toggle only appears when `usageCandidates` is
 * actually a distinct, ranked view (`isUsageRanked` below) - see
 * `liveCalcUsageWeighting.ts`'s header for the two cases (no Champions page
 * for this species, or every remaining candidate is off-meta) where it's
 * instead an unranked 0%-everywhere mirror of `candidates`, in which case
 * there's nothing for a toggle to reveal and the plain list renders as it
 * always has.
 */

import { useState } from 'react';
import type { LiveCalcUsageRankedCandidate } from '../../utils/liveCalcEngine';

const CHIP_DISPLAY_THRESHOLD = 12;

interface LiveCalcCandidateGroupProps {
  label: string;
  candidates: string[];
  totalCount: number;
  /** Usage-ranked/filtered view of `candidates` - see this file's header. */
  usageCandidates: LiveCalcUsageRankedCandidate[];
}

export default function LiveCalcCandidateGroup({ label, candidates, totalCount, usageCandidates }: LiveCalcCandidateGroupProps) {
  const [showAll, setShowAll] = useState(false);
  const narrowedPercent = totalCount > 0 ? (candidates.length / totalCount) * 100 : 100;
  const isFullyOpen = totalCount > 0 && candidates.length === totalCount;
  const isContradicted = totalCount > 0 && candidates.length === 0;
  const isUsageRanked = usageCandidates.some(c => c.percentage > 0);
  const displayed: { value: string; percentage?: number }[] =
    showAll || !isUsageRanked ? candidates.map(value => ({ value })) : usageCandidates;

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
      ) : isFullyOpen && !isUsageRanked ? (
        <p className="text-[11px] text-zinc-500">No narrowing yet - all {totalCount} still possible.</p>
      ) : (
        <>
          {isUsageRanked && (
            <button
              type="button"
              onClick={() => setShowAll(v => !v)}
              title={showAll ? 'Switch back to the ladder-usage-ranked view' : 'Reveal every physically-possible candidate, ranked or not'}
              className="self-start text-[10px] text-accent-gold hover:underline cursor-pointer"
            >
              {showAll ? 'Show ranked by usage' : `Show all ${candidates.length} possible`}
            </button>
          )}
          {displayed.length <= CHIP_DISPLAY_THRESHOLD ? (
            <div className="flex flex-wrap gap-1">
              {displayed.map(c => (
                <span key={c.value} className="px-1.5 py-0.5 text-[10px] rounded bg-zinc-800 text-zinc-300">
                  {c.value}
                  {c.percentage !== undefined && <span className="text-zinc-500"> {c.percentage.toFixed(1)}%</span>}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500">{displayed.length} candidates still possible.</p>
          )}
        </>
      )}
    </div>
  );
}
