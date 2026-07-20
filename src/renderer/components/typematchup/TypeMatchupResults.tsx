/**
 * TypeMatchupResults.tsx - Grouped Weakness/Resistance/Immunity Breakdown
 * For the selected 1-2 defending types, buckets all 18 attacking types by
 * the multiplier they'd land at (config/typeEffectiveness.ts's
 * getEffectivenessMultiplier already handles dual-type products, so 4x/
 * 0.25x/0x buckets fall out naturally for dual-typed selections).
 */

import { useMemo } from 'react';
import { ALL_TYPES, getEffectivenessMultiplier } from '../../config/typeEffectiveness';
import TypeBadge from '../TypeBadge';

interface TypeMatchupResultsProps {
  defendingTypes: string[];
}

const BUCKETS: { multiplier: number; label: string; hint: string }[] = [
  { multiplier: 4, label: '4x Weak', hint: 'Takes quadruple damage' },
  { multiplier: 2, label: '2x Weak', hint: 'Takes double damage' },
  { multiplier: 1, label: 'Neutral', hint: 'Takes normal damage' },
  { multiplier: 0.5, label: '2x Resist', hint: 'Takes half damage' },
  { multiplier: 0.25, label: '4x Resist', hint: 'Takes quarter damage' },
  { multiplier: 0, label: 'Immune', hint: 'Takes no damage' },
];

export default function TypeMatchupResults({ defendingTypes }: TypeMatchupResultsProps) {
  const grouped = useMemo(() => {
    const map = new Map<number, string[]>(BUCKETS.map(b => [b.multiplier, []]));
    for (const attackType of ALL_TYPES) {
      const multiplier = getEffectivenessMultiplier(attackType, defendingTypes);
      map.get(multiplier)?.push(attackType);
    }
    return map;
  }, [defendingTypes]);

  if (defendingTypes.length === 0) {
    return <p className="text-sm text-gray-400">Select one or two types above to see their matchups.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {BUCKETS.map(bucket => {
        const types = grouped.get(bucket.multiplier) ?? [];
        if (types.length === 0) return null;
        return (
          <div key={bucket.label} className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <h2 className="text-sm font-bold text-gray-100">{bucket.label}</h2>
              <span className="text-xs text-gray-500">{bucket.hint}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {types.map(type => (
                <TypeBadge key={type} type={type} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
