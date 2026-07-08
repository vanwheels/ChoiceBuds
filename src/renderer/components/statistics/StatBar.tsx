/**
 * StatBar.tsx - Labeled Win/Loss Bar
 * Shared presentational primitive for the Statistics page's breakdown
 * panels: a label, a proportional green(win)/red(loss) bar, and a
 * trailing "12-4 (75%)"-style record label.
 */

interface StatBarProps {
  label: string;
  wins: number;
  losses: number;
  winRate: number; // 0-1
}

export default function StatBar({ label, wins, losses, winRate }: StatBarProps) {
  const total = wins + losses;
  const winPercent = total > 0 ? (wins / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-200">{label}</span>
        <span className="text-gray-400 text-xs">
          {wins}-{losses} ({Math.round(winRate * 100)}%)
        </span>
      </div>
      <div className="h-2 rounded-full bg-red-900/50 overflow-hidden">
        <div className="h-full bg-green-500" style={{ width: `${winPercent}%` }} />
      </div>
    </div>
  );
}
