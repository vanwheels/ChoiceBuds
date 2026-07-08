/**
 * StatsColumn.tsx - Tiny EV Stats Component
 * 3x2 CSS grid; only one cell (`activeStat`) is ever expanded into its
 * hold-to-repeat +/- editor at a time - see EVStatCell.tsx. Clicking outside
 * the grid (or Escape) collapses back to the compact label+value buttons.
 */

import { useState } from 'react';
import type { EVSpread, ShowdownPokemon } from '../types/pokemon';
import { useDismissable } from '../hooks/useDismissable';
import { NATURES, getNatureEffect } from '../config/vgcData';
import { getStatLabelColor } from '../config/pokemonTheme';
import EVStatCell from './EVStatCell';

interface StatsColumnProps {
  evs: EVSpread;
  nature?: string;
  isEditing?: boolean;
  onUpdatePokemon: (updates: Partial<ShowdownPokemon>) => void;
}

const STATS: Array<{ label: string; key: keyof EVSpread }> = [
  { label: 'HP', key: 'hp' },
  { label: 'Atk', key: 'attack' },
  { label: 'Def', key: 'defense' },
  { label: 'SpA', key: 'specialAttack' },
  { label: 'SpD', key: 'specialDefense' },
  { label: 'Spe', key: 'speed' },
];

export default function StatsColumn({ evs, nature, isEditing = false, onUpdatePokemon }: StatsColumnProps) {
  const [localEVs, setLocalEVs] = useState(evs);
  const [activeStat, setActiveStat] = useState<keyof EVSpread | null>(null);
  const ref = useDismissable<HTMLDivElement>(() => setActiveStat(null));

  const totalEVs = Object.values(localEVs).reduce((sum, val) => sum + val, 0);
  const natureEffect = getNatureEffect(nature);

  // Functional updates so hold-to-repeat always checks the true latest
  // state on every tick, rather than the totalEVs/localEVs closured from
  // whichever render the interval's callback was created in. Every tick
  // also persists immediately, matching the rest of the app's "write on
  // every mutation" convention (see useTeams.ts).
  const handleIncrement = (key: keyof EVSpread) => {
    setLocalEVs(prev => {
      const currentTotal = Object.values(prev).reduce((sum, v) => sum + v, 0);
      if (prev[key] >= 32 || currentTotal >= 66) return prev;
      const next = { ...prev, [key]: prev[key] + 1 };
      onUpdatePokemon({ evs: next });
      return next;
    });
  };

  const handleDecrement = (key: keyof EVSpread) => {
    setLocalEVs(prev => {
      if (prev[key] <= 0) return prev;
      const next = { ...prev, [key]: prev[key] - 1 };
      onUpdatePokemon({ evs: next });
      return next;
    });
  };

  const handleDirectInput = (key: keyof EVSpread, rawValue: number) => {
    if (Number.isNaN(rawValue)) return;
    setLocalEVs(prev => {
      const clampedForStat = Math.max(0, Math.min(32, Math.floor(rawValue)));
      const totalWithoutThisStat = Object.entries(prev).reduce(
        (sum, [k, v]) => (k === key ? sum : sum + v), 0
      );
      const maxAllowedForStat = Math.min(32, 66 - totalWithoutThisStat);
      const finalValue = Math.max(0, Math.min(clampedForStat, maxAllowedForStat));
      const next = { ...prev, [key]: finalValue };
      onUpdatePokemon({ evs: next });
      return next;
    });
  };

  return (
    <div ref={ref} className="bg-gray-800 rounded px-2 py-1.5 border border-gray-600">
      <div className="mb-1">
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-400 uppercase tracking-wide shrink-0">SP</p>
          {isEditing && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              totalEVs > 66
                ? 'bg-red-600 text-white border border-red-400'
                : totalEVs === 66
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-700 text-gray-400'
            }`}>{totalEVs > 66 ? '⚠ ' : ''}{totalEVs}/66</span>
          )}
        </div>
        {(isEditing || nature) && (
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
            {isEditing ? (
              <select
                value={nature || ''}
                onChange={(e) => onUpdatePokemon({ nature: e.target.value || undefined })}
                title="Nature"
                className="min-w-0 text-[10px] bg-gray-900 border border-gray-600 rounded px-1 py-0 text-gray-200 outline-none focus:border-blue-500"
              >
                <option value="">Nature</option>
                {NATURES.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            ) : (
              <span className="text-[10px] text-gray-500 truncate">{nature}</span>
            )}
            {natureEffect && (
              <span className="text-[10px] whitespace-nowrap shrink-0">
                (<span className={getStatLabelColor(natureEffect.plus)}>+{natureEffect.plus}</span>
                {', '}
                <span className={getStatLabelColor(natureEffect.minus)}>-{natureEffect.minus}</span>)
              </span>
            )}
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
        {STATS.map(stat => {
          const val = isEditing ? localEVs[stat.key] : evs[stat.key];
          return (
            <EVStatCell
              key={stat.label}
              label={stat.label}
              value={val}
              isEditing={isEditing}
              isActive={activeStat === stat.key}
              exceedsMax={val > 32}
              canIncrement={val < 32 && totalEVs < 66}
              onActivate={() => setActiveStat(stat.key)}
              onIncrement={() => handleIncrement(stat.key)}
              onDecrement={() => handleDecrement(stat.key)}
              onDirectInput={(value) => handleDirectInput(stat.key, value)}
            />
          );
        })}
      </div>
    </div>
  );
}
