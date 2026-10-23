/**
 * CoverageCell.tsx - One Multiplier Cell in a Coverage Table
 * Color reflects favorability to the viewing team, not the raw multiplier -
 * offensively a 2x is good (green), defensively a 2x is bad (orange), so the
 * caller says which direction is "good" via favorableWhenAbove1. Within each
 * direction, intensity grades by magnitude: mild favorable (2x offense/0.5x
 * defense) is green, extreme favorable (4x offense/0.25x defense) is blue,
 * mild unfavorable (0.5x offense/2x defense) is orange, extreme unfavorable
 * (0.25x offense/4x defense) is red. Immune is always neutral gray regardless
 * of direction - it's categorically different from a reduced/boosted hit,
 * not just the extreme end of the same scale.
 */

const MULTIPLIER_LABELS: Record<number, string> = { 4: '4x', 2: '2x', 0.5: '1/2', 0.25: '1/4' };

// Shared by every branch below so the grid lines stay unbroken regardless of
// which variant (blank/immune/multiplier) a given cell renders.
const CELL_BORDER = 'border border-zinc-700/60';

// Magnitude = distance from neutral (1x), independent of favorable direction.
type Magnitude = 'mild' | 'extreme';

function magnitudeOf(multiplier: number): Magnitude {
  return multiplier === 4 || multiplier === 0.25 ? 'extreme' : 'mild';
}

const IMMUNE_BADGE =
  'inline-block px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded bg-zinc-700 text-zinc-300';

const CELL_CLASSES: Record<'favorable' | 'unfavorable', Record<Magnitude, string>> = {
  favorable: { mild: 'text-green-400', extreme: 'text-blue-400 font-bold' },
  unfavorable: { mild: 'text-orange-400', extreme: 'text-red-400 font-bold' },
};

interface CoverageCellProps {
  multiplier: number | null;
  favorableWhenAbove1: boolean;
}

export default function CoverageCell({ multiplier, favorableWhenAbove1 }: CoverageCellProps) {
  if (multiplier === null || multiplier === 1) {
    return <td className={`text-center py-1.5 ${CELL_BORDER}`} />;
  }

  if (multiplier === 0) {
    return (
      <td className={`text-center py-1.5 ${CELL_BORDER}`}>
        <span className={IMMUNE_BADGE}>immune</span>
      </td>
    );
  }

  const isFavorable = favorableWhenAbove1 ? multiplier > 1 : multiplier < 1;
  const classes = CELL_CLASSES[isFavorable ? 'favorable' : 'unfavorable'][magnitudeOf(multiplier)];

  return (
    <td className={`text-center py-1.5 text-sm font-semibold ${CELL_BORDER} ${classes}`}>
      {MULTIPLIER_LABELS[multiplier] ?? multiplier}
    </td>
  );
}
