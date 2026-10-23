/**
 * CoverageGapsPanel.tsx - Coverage Gaps
 * Replaces the old Team Gap Analysis panel (UsageThreatsList.tsx, see
 * COMPLETED.md's Type Matchup Rework entry) - that panel ranked real
 * ladder-usage Pokemon (GameDataCache.usage) the team had no typing answer
 * for, a heuristic about which real threats exist today. This panel is
 * purely objective instead: it re-reads the Defensive CoverageTable's own
 * per-type `unfavorableCount`/`favorableCount` (see utils/typeCoverage.ts)
 * to show which of the 18 attacking types the team has no resist/immunity
 * answer to at all (Shared Weaknesses) and which types it's best covered
 * against (Resistance Coverage) - no ladder-usage data, no species lookup,
 * just the counts the two coverage tables above already compute.
 */

import type { CoverageRow } from '../../utils/typeCoverage';
import TypeBadge from '../TypeBadge';

interface CoverageGapsPanelProps {
  defensiveRows: CoverageRow[];
}

function GapRow({ row }: { row: CoverageRow }) {
  return (
    <div className="flex items-center gap-3">
      <TypeBadge type={row.type} widthClass="w-16" />
      <span className="flex-1 text-xs text-zinc-400">
        {row.unfavorableCount} weak, {row.favorableCount} resist
      </span>
    </div>
  );
}

export default function CoverageGapsPanel({ defensiveRows }: CoverageGapsPanelProps) {
  // No team slot resists or is immune to this type at all - the direct,
  // per-type analog of the old panel's "no typing answer" bucket.
  const sharedWeaknesses = defensiveRows
    .filter((r) => r.favorableCount === 0 && r.unfavorableCount > 0)
    .sort((a, b) => b.unfavorableCount - a.unfavorableCount);

  // Every type ranked by how well the team answers it, worst-covered first -
  // the "resistance coverage" half of the view, always fully populated (18
  // rows) rather than a filtered gap list like the section above.
  const resistanceCoverage = [...defensiveRows].sort(
    (a, b) => a.favorableCount - b.favorableCount || b.unfavorableCount - a.unfavorableCount,
  );

  return (
    <div className="bg-zinc-800 rounded-lg p-4">
      <h2 className="text-sm font-bold text-zinc-100 mb-1">Coverage Gaps</h2>
      <p className="text-xs text-zinc-400 mb-3">
        Objective shared-weakness and resistance-coverage view, built from the Defensive Coverage
        table's own per-type counts above - no ladder-usage data involved.
      </p>

      <h3 className="text-xs font-bold text-zinc-100 mt-4 mb-1">Shared Weaknesses</h3>
      <p className="text-xs text-zinc-400 mb-3">
        Attacking types no team slot resists or is immune to at all.
      </p>
      {sharedWeaknesses.length === 0 ? (
        <p className="text-sm text-zinc-400">No fully-unanswered attacking types.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sharedWeaknesses.map((row) => (
            <GapRow key={row.type} row={row} />
          ))}
        </div>
      )}

      <h3 className="text-xs font-bold text-zinc-100 mt-4 mb-1">Resistance Coverage</h3>
      <p className="text-xs text-zinc-400 mb-3">Every attacking type, worst-covered first.</p>
      <div className="flex flex-col gap-2">
        {resistanceCoverage.map((row) => (
          <GapRow key={row.type} row={row} />
        ))}
      </div>
    </div>
  );
}
