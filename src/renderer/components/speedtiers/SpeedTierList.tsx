/**
 * SpeedTierList.tsx - Speed Tiers Result Grid
 * Renders utils/speedTierList.ts's pre-sorted, tie-grouped output - purely
 * presentational, no computation here. Each group is one distinct Speed
 * value; a group with more than one entry is a real speed tie (team members
 * and/or threat builds landing on the exact same number). Rendered as a
 * header per speed value with a horizontal wrap of compact icon+caption
 * units underneath (icon grid, not the old full-width row-per-entry list) -
 * see docs/investigations/speed-tiers-layout-rework.md for why. Bound rows
 * (min/neutral/max reference tiers) render dimmer than real usage-spread
 * rows since they're a hypothetical range, not an observed build.
 */
import type { SpeedTierGroup, SpeedTierEntry } from '../../utils/speedTierList';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';

interface SpeedTierListProps {
  groups: SpeedTierGroup[];
  spriteCacheState: UseSpriteCacheReturn;
}

function EntryTile({ entry, spriteCacheState }: { entry: SpeedTierEntry; spriteCacheState: UseSpriteCacheReturn }) {
  const isBound = !!entry.boundLabel;
  return (
    <div
      className={`flex flex-col items-center gap-0.5 w-16 shrink-0 px-1 py-1.5 rounded-lg ${
        entry.kind === 'team' ? 'bg-accent-gold/10 ring-1 ring-accent-gold/40' : isBound ? 'opacity-50' : 'bg-zinc-900/40'
      }`}
      title={entry.species}
    >
      <img
        src={spriteCacheState.resolveSprite(entry.spriteUrl)}
        alt={entry.species}
        className="w-8 h-8 object-contain [image-rendering:pixelated]"
      />
      <span className={`text-[10px] text-center leading-tight truncate w-full ${entry.kind === 'team' ? 'text-accent-gold font-semibold' : 'text-zinc-200'}`}>
        {entry.species}
      </span>
      <span className="text-[9px] text-zinc-500">
        {entry.kind === 'team' ? 'You' : isBound ? entry.boundLabel : `${entry.percentage?.toFixed(0)}%`}
      </span>
    </div>
  );
}

export default function SpeedTierList({ groups, spriteCacheState }: SpeedTierListProps) {
  if (groups.length === 0) {
    return <p className="text-sm text-zinc-400">Select a team to see its speed tiers against real usage threats.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {groups.map(group => (
        <div key={group.speed} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-zinc-100">{group.speed}</span>
            {group.entries.length > 1 && (
              <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">Tie</span>
            )}
            <div className="flex-1 h-px bg-zinc-800/60" />
          </div>
          <div className="flex flex-wrap gap-2">
            {group.entries.map(entry => (
              <EntryTile key={entry.key} entry={entry} spriteCacheState={spriteCacheState} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
