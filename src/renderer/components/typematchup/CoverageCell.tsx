/**
 * CoverageCell.tsx - One Multiplier Cell in a Coverage Table
 * Color reflects favorability to the viewing team, not the raw multiplier -
 * offensively a 2x is good (green), defensively a 2x is bad (orange), so the
 * caller says which direction is "good" via favorableWhenAbove1. Reuses the
 * same green/orange/gray palette as TurnLog.tsx's effectivenessLabel for a
 * consistent "super effective/not very effective/no effect" vocabulary
 * across the app.
 */

const MULTIPLIER_LABELS: Record<number, string> = { 4: '4x', 2: '2x', 0.5: '1/2', 0.25: '1/4' };

interface CoverageCellProps {
  multiplier: number | null;
  favorableWhenAbove1: boolean;
}

export default function CoverageCell({ multiplier, favorableWhenAbove1 }: CoverageCellProps) {
  if (multiplier === null || multiplier === 1) {
    return <td className="text-center py-1.5" />;
  }

  if (multiplier === 0) {
    return (
      <td className="text-center py-1.5">
        <span className="inline-block px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide rounded bg-gray-700 text-gray-300">
          immune
        </span>
      </td>
    );
  }

  const isFavorable = favorableWhenAbove1 ? multiplier > 1 : multiplier < 1;
  return (
    <td className={`text-center py-1.5 text-sm font-semibold ${isFavorable ? 'text-green-400' : 'text-orange-400'}`}>
      {MULTIPLIER_LABELS[multiplier] ?? multiplier}
    </td>
  );
}
