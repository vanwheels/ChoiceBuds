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
 */

import type { UsageThreat, PartiallyCoveredUsageThreat } from '../../utils/usageThreats';
import { USAGE_THREAT_RANK_CUTOFF } from '../../utils/usageThreats';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import TypeBadge from '../TypeBadge';

interface UsageThreatsListProps {
  threats: UsageThreat[];
  partiallyCoveredThreats: PartiallyCoveredUsageThreat[];
  spriteCacheState: UseSpriteCacheReturn;
}

function ThreatRow({ threat, spriteCacheState, note }: { threat: UsageThreat; spriteCacheState: UseSpriteCacheReturn; note?: string }) {
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
      {note && <span className="text-[10px] text-zinc-500 shrink-0">{note}</span>}
      <span className="text-xs text-zinc-400 w-10 text-right shrink-0">#{threat.columnPosition}</span>
    </div>
  );
}

export default function UsageThreatsList({ threats, partiallyCoveredThreats, spriteCacheState }: UsageThreatsListProps) {
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
            <ThreatRow key={threat.species} threat={threat} spriteCacheState={spriteCacheState} />
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
            <ThreatRow key={threat.species} threat={threat} spriteCacheState={spriteCacheState} note="1 resist" />
          ))}
        </div>
      )}
    </div>
  );
}
