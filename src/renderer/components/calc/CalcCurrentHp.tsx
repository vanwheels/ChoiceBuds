import { flatHpToPercent, percentToFlatHp, clampCurHp } from '../../utils/calcCurrentHp';

interface CalcCurrentHpProps {
  /** Flat current HP; null = full HP. */
  curHp: number | null;
  /** Max HP (boosted-stats HP total), null until a species is picked. */
  maxHp: number | null;
  onChange: (curHp: number | null) => void;
}

const INPUT_CLASS =
  'w-14 shrink-0 px-1 py-0.5 text-xs text-center bg-zinc-900 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold disabled:opacity-40';

/** Current HP as flat and % inputs over one stored value, so the pair can't disagree. */
export default function CalcCurrentHp({ curHp, maxHp, onChange }: CalcCurrentHpProps) {
  const max = maxHp ?? 0;
  const flat = curHp != null && curHp < max ? curHp : max;
  const percent = flatHpToPercent(flat, max);

  return (
    <div className="flex items-center gap-2 text-[10px] text-zinc-400 uppercase tracking-wide">
      <span className="shrink-0">Current HP</span>
      <input
        type="number"
        min={1}
        max={max || undefined}
        disabled={!max}
        value={max ? flat : ''}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (e.target.value !== '' && !Number.isNaN(parsed)) onChange(clampCurHp(parsed, max));
        }}
        title="Current HP (flat)"
        className={INPUT_CLASS}
      />
      <span className="normal-case">/ {max || '—'}</span>
      <input
        type="number"
        min={1}
        max={100}
        disabled={!max}
        value={max ? percent : ''}
        onChange={(e) => {
          const parsed = Number(e.target.value);
          if (e.target.value !== '' && !Number.isNaN(parsed)) {
            onChange(clampCurHp(percentToFlatHp(parsed, max), max));
          }
        }}
        title="Current HP (% of max)"
        className={INPUT_CLASS}
      />
      <span>%</span>
    </div>
  );
}
