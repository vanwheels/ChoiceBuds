/**
 * SpeedTierList.tsx - Speed Tiers Result List
 * Renders utils/speedTierList.ts's pre-sorted, tie-grouped output - purely
 * presentational, no computation here. Each group is one distinct Speed
 * value; a group with more than one entry is a real speed tie (team members
 * and/or threat builds landing on the exact same number).
 */
import type { SpeedTierGroup } from '../../utils/speedTierList';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';

interface SpeedTierListProps {
  groups: SpeedTierGroup[];
  spriteCacheState: UseSpriteCacheReturn;
}

export default function SpeedTierList({ groups, spriteCacheState }: SpeedTierListProps) {
  if (groups.length === 0) {
    return <p className="text-sm text-zinc-400">Select a team to see its speed tiers against real usage threats.</p>;
  }

  return (
    <div className="flex flex-col">
      {groups.map(group => (
        <div key={group.speed} className="flex gap-3 py-2 border-b border-zinc-800/60 last:border-b-0">
          <div className="w-14 shrink-0 text-right">
            <span className="text-sm font-bold text-zinc-100">{group.speed}</span>
            {group.entries.length > 1 && (
              <div className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">Tie</div>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            {group.entries.map(entry => (
              <div key={entry.key} className="flex items-center gap-2 flex-wrap">
                <img
                  src={spriteCacheState.resolveSprite(entry.spriteUrl)}
                  alt={entry.species}
                  className="w-7 h-7 object-contain [image-rendering:pixelated]"
                />
                <span className={`text-sm truncate ${entry.kind === 'team' ? 'text-accent-gold font-semibold' : 'text-zinc-200'}`}>
                  {entry.species}
                </span>
                {entry.kind === 'team' ? (
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wide shrink-0">Your team</span>
                ) : (
                  <span className="text-[10px] text-zinc-500 shrink-0">{entry.percentage?.toFixed(0)}% of builds</span>
                )}
                {entry.modifierNotes && entry.modifierNotes.length > 0 && (
                  <span className="text-[10px] text-zinc-500 shrink-0">
                    ({entry.modifierNotes.map(n => `${n.label} → ${n.speed}`).join(', ')})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
