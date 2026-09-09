/**
 * SpeedTierList.tsx - Speed Tiers Result Grid
 * Renders utils/speedTierList.ts's pre-sorted, tie-grouped output - purely
 * presentational, no computation here. Each group is one distinct Speed
 * value; a group with more than one entry is a real speed tie (team members
 * and/or threat builds landing on the exact same number).
 *
 * One continuous flex-wrap of every entry, fastest (top-left) to slowest
 * (bottom-right, or the reverse under Trick Room - groups arrive pre-sorted)
 * - not a full-width header block per distinct speed value (that earlier
 * design read as a tall, mostly-empty vertical list once real data made
 * groups uneven in size: a group of 1 wasted just as much header space as a
 * group of 30 - see docs/investigations/speed-tiers-grid-density-rework.md).
 * Each tile carries its own speed number instead of a shared group header,
 * so removing that header loses no information; a tied entry (its group has
 * 2+ members) gets a subtle amber ring rather than a separate "Tie" label,
 * since adjacent same-speed tiles already read as a visual cluster once
 * they're not each forced onto their own full-width row. Bound rows
 * (min/neutral/max reference tiers) render dimmer than real usage-spread
 * rows since they're a hypothetical range, not an observed build.
 */
import type { SpeedTierGroup, SpeedTierEntry } from '../../utils/speedTierList';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';

interface SpeedTierListProps {
  groups: SpeedTierGroup[];
  spriteCacheState: UseSpriteCacheReturn;
}

function EntryTile({ entry, tied, spriteCacheState }: { entry: SpeedTierEntry; tied: boolean; spriteCacheState: UseSpriteCacheReturn }) {
  const isBound = !!entry.boundLabel;
  return (
    <div
      className={`flex flex-col items-center gap-0.5 w-16 shrink-0 px-1 py-1.5 rounded-lg ${
        entry.kind === 'team' ? 'bg-accent-gold/10 ring-1 ring-accent-gold/40' : isBound ? 'opacity-50' : 'bg-zinc-900/40'
      } ${tied && entry.kind !== 'team' ? 'ring-1 ring-amber-500/40' : ''}`}
      title={entry.species}
    >
      <span className="text-[10px] font-bold text-zinc-300 leading-none">{entry.speed}</span>
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
    <div className="flex flex-wrap gap-2">
      {groups.flatMap(group =>
        group.entries.map(entry => (
          <EntryTile key={entry.key} entry={entry} tied={group.entries.length > 1} spriteCacheState={spriteCacheState} />
        ))
      )}
    </div>
  );
}
