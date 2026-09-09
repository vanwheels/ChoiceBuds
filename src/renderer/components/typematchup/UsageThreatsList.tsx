/**
 * UsageThreatsList.tsx - Team Gap Analysis Panel
 * Ranked list (real Pokemon Champions ladder usage, most-used first) of
 * threats the selected team has no typing answer for at all - no team slot
 * resists or is immune to the threat's own (1-2) types - plus a second,
 * separate section for threats only one team slot resists/is immune to (a
 * fragile single answer). See utils/usageThreats.ts for the typing-only,
 * top-N usage cutoff computations this panel just renders. Additive
 * alongside the existing Offensive/Defensive CoverageTables, not a
 * replacement for either.
 *
 * A third section, Likely Coverage Gaps, is additive on top of the two
 * typing-only sections above - see utils/usageCoverageGaps.ts. It doesn't
 * de-duplicate against the other two lists; a threat can legitimately appear
 * in more than one section.
 *
 * Every row also carries a Speed Annotation (Team Gap Analysis: Speed
 * Annotation leg, see TODO.md/COMPLETED.md): the threat's raw base Speed
 * stat next to the team's own base-Speed range (min-max across all slots).
 * Informational only - never factors into any section's threat/no-answer
 * membership, purely a "can I even out-speed this" gut-check alongside the
 * typing verdict.
 */

import type { UsageThreat, PartiallyCoveredUsageThreat } from '../../utils/usageThreats';
import { USAGE_THREAT_RANK_CUTOFF } from '../../utils/usageThreats';
import type { MovesetCoverageGapThreat } from '../../utils/usageCoverageGaps';
import { COVERAGE_GAP_MOVE_CUTOFF } from '../../utils/usageCoverageGaps';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import TypeBadge from '../TypeBadge';

interface UsageThreatsListProps {
  threats: UsageThreat[];
  partiallyCoveredThreats: PartiallyCoveredUsageThreat[];
  movesetCoverageGaps: MovesetCoverageGapThreat[];
  /** Team's own raw base-Speed range across all slots, for the Speed Annotation - null when no team is selected. */
  teamSpeedRange: { min: number; max: number } | null;
  spriteCacheState: UseSpriteCacheReturn;
}

/** Common shape rendered by ThreatRow - UsageThreat, PartiallyCoveredUsageThreat, and MovesetCoverageGapThreat all satisfy it (the latter's `types` holds move-effective types rather than species types - see usageCoverageGaps.ts). */
type ThreatRowData = Pick<UsageThreat, 'species' | 'types' | 'columnPosition' | 'spriteUrl' | 'speed'>;

function ThreatRow({
  threat,
  spriteCacheState,
  teamSpeedRange,
  note,
}: {
  threat: ThreatRowData;
  spriteCacheState: UseSpriteCacheReturn;
  teamSpeedRange: { min: number; max: number } | null;
  note?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <img
        src={spriteCacheState.resolveSprite(threat.spriteUrl)}
        alt={threat.species}
        className="w-8 h-8 object-contain [image-rendering:pixelated]"
      />
      <span className="flex-1 text-sm text-zinc-200 truncate">{threat.species}</span>
      <div className="flex gap-1">
        {threat.types.map(t => (
          <TypeBadge key={t} type={t} />
        ))}
      </div>
      {teamSpeedRange && (
        <span className="text-[10px] text-zinc-500 shrink-0" title="Threat's base Speed vs. your team's own base-Speed range">
          Spe {threat.speed} vs {teamSpeedRange.min}-{teamSpeedRange.max}
        </span>
      )}
      {note && <span className="text-[10px] text-zinc-500 shrink-0">{note}</span>}
      <span className="text-xs text-zinc-400 w-10 text-right shrink-0">#{threat.columnPosition}</span>
    </div>
  );
}

export default function UsageThreatsList({
  threats,
  partiallyCoveredThreats,
  movesetCoverageGaps,
  teamSpeedRange,
  spriteCacheState,
}: UsageThreatsListProps) {
  return (
    <div className="bg-zinc-800 rounded-lg p-4">
      <h2 className="text-sm font-bold text-zinc-100 mb-1">Team Gap Analysis</h2>
      <p className="text-xs text-zinc-400 mb-3">
        Real, commonly-used Pokemon (top {USAGE_THREAT_RANK_CUTOFF} ladder usage) this team has no typing answer
        for - no team slot resists or is immune to their own types.
      </p>
      {threats.length === 0 ? (
        <p className="text-sm text-zinc-400">No unanswered threats in the top {USAGE_THREAT_RANK_CUTOFF} usage.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {threats.map(threat => (
            <ThreatRow key={threat.species} threat={threat} spriteCacheState={spriteCacheState} teamSpeedRange={teamSpeedRange} />
          ))}
        </div>
      )}

      <h3 className="text-xs font-bold text-zinc-100 mt-4 mb-1">Partially Covered</h3>
      <p className="text-xs text-zinc-400 mb-3">
        Threats only one team slot resists or is immune to - a single, fragile answer.
      </p>
      {partiallyCoveredThreats.length === 0 ? (
        <p className="text-sm text-zinc-400">No partially-covered threats in the top {USAGE_THREAT_RANK_CUTOFF} usage.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {partiallyCoveredThreats.map(threat => (
            <ThreatRow
              key={threat.species}
              threat={threat}
              spriteCacheState={spriteCacheState}
              teamSpeedRange={teamSpeedRange}
              note="1 resist"
            />
          ))}
        </div>
      )}

      <h3 className="text-xs font-bold text-zinc-100 mt-4 mb-1">Likely Coverage Gaps</h3>
      <p className="text-xs text-zinc-400 mb-3">
        Threats no team slot resists once their top {COVERAGE_GAP_MOVE_CUTOFF} ranked-usage moves' effective types
        (through their own top-ranked ability) are checked instead of their raw typing.
      </p>
      {movesetCoverageGaps.length === 0 ? (
        <p className="text-sm text-zinc-400">No moveset-based coverage gaps in the top {USAGE_THREAT_RANK_CUTOFF} usage.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {movesetCoverageGaps.map(threat => (
            <ThreatRow key={threat.species} threat={threat} spriteCacheState={spriteCacheState} teamSpeedRange={teamSpeedRange} />
          ))}
        </div>
      )}
    </div>
  );
}
