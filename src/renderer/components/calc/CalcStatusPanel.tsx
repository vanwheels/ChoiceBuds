import type { CalcPokemonState } from '../../hooks/useDamageCalc';
import { STATUS_OPTIONS, STATUS_LABELS } from '../../hooks/useDamageCalc';
import { useDismissable } from '../../hooks/useDismissable';

interface CalcStatusPanelProps {
  current: CalcPokemonState['status'];
  onSelect: (status: CalcPokemonState['status']) => void;
  onClose: () => void;
}

export default function CalcStatusPanel({ current, onSelect, onClose }: CalcStatusPanelProps) {
  const ref = useDismissable<HTMLDivElement>(onClose);
  const rows: { value: CalcPokemonState['status']; label: string }[] = [
    { value: '', label: 'Healthy' },
    ...STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
  ];

  return (
    <div
      ref={ref}
      className="w-full flex flex-col gap-1 bg-zinc-800 border-2 border-accent-gold rounded-lg p-2"
    >
      {rows.map((row) => (
        <div
          key={row.value}
          onClick={() => onSelect(row.value)}
          className={`px-2 py-1 rounded text-sm font-medium cursor-pointer transition-colors hover:bg-zinc-700 ${
            row.value === current ? 'text-accent-gold' : 'text-white'
          }`}
        >
          {row.label}
        </div>
      ))}
    </div>
  );
}
