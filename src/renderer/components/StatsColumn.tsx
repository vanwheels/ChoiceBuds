/**
 * StatsColumn.tsx - Tiny EV Stats Component
 * 3x2 CSS grid; only one cell (`activeStat`) is ever expanded into its
 * hold-to-repeat +/- editor at a time - see EVStatCell.tsx. Clicking outside
 * the grid (or Escape) collapses back to the compact label+value buttons.
 *
 * The Nature control floats NaturePickerPanel over the card via
 * FloatingCardPanel (same pattern as EditOverlays.tsx's item/ability/move
 * pickers - see NaturePickerPanel.tsx) rather than a native <select>, which
 * had no positioning control and spilled over the notes textarea/toolbar
 * below it (Card Popup Consistency Leg 3 - see TODO.md).
 */

import { useState } from 'react';
import type { MouseEvent } from 'react';
import type { EVSpread, ShowdownPokemon } from '../types/pokemon';
import { useDismissable } from '../hooks/useDismissable';
import { getNatureEffect } from '../config/vgcData';
import { getStatLabelColor } from '../config/pokemonTheme';
import { measureDropdownMaxHeight } from '../utils/measureDropdownHeight';
import EVStatCell from './EVStatCell';
import NaturePickerPanel from './NaturePickerPanel';
import FloatingCardPanel from './FloatingCardPanel';

interface StatsColumnProps {
  evs: EVSpread;
  nature?: string;
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

// Permanently editable (Always-On Editing Leg 1, see TODO.md) - no more
// isEditing gate; the total-EV badge, nature picker, and stat cells below
// are all unconditionally interactive now.
export default function StatsColumn({ evs, nature, onUpdatePokemon }: StatsColumnProps) {
  const [localEVs, setLocalEVs] = useState(evs);
  const [activeStat, setActiveStat] = useState<keyof EVSpread | null>(null);
  const [natureMenuOpen, setNatureMenuOpen] = useState(false);
  const [natureMenuMaxHeight, setNatureMenuMaxHeight] = useState(400);
  const [natureMenuAnchorRect, setNatureMenuAnchorRect] = useState<DOMRect | null>(null);
  const [natureMenuCardRect, setNatureMenuCardRect] = useState<DOMRect | null>(null);
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

  const toggleNatureMenu = (e: MouseEvent<HTMLElement>) => {
    if (natureMenuOpen) {
      setNatureMenuOpen(false);
      return;
    }
    setNatureMenuMaxHeight(measureDropdownMaxHeight(e.currentTarget));
    setNatureMenuAnchorRect(e.currentTarget.getBoundingClientRect());
    setNatureMenuCardRect(e.currentTarget.closest<HTMLElement>('[data-pokemon-card]')?.getBoundingClientRect() ?? null);
    setNatureMenuOpen(true);
  };

  const handleNatureSelect = (nature: string) => {
    onUpdatePokemon({ nature });
    setNatureMenuOpen(false);
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
    <div ref={ref} className="bg-zinc-800 rounded px-2 py-1.5 border border-zinc-600">
      <div className="mb-1">
        <div className="flex justify-between items-center">
          <p className="text-xs text-zinc-400 uppercase tracking-wide shrink-0">SP</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            totalEVs > 66
              ? 'bg-red-600 text-white border border-red-400'
              : totalEVs === 66
                ? 'bg-emerald-500 text-white'
                : 'bg-zinc-700 text-zinc-400'
          }`}>{totalEVs > 66 ? '⚠ ' : ''}{totalEVs}/66</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
          <div
            onClick={toggleNatureMenu}
            title="Nature"
            className="min-w-0 text-[10px] bg-zinc-900 border border-zinc-600 rounded px-1 py-0 text-zinc-200 truncate cursor-pointer hover:border-accent-gold transition-colors"
          >
            {nature || 'Nature'}
          </div>
          {natureEffect && (
            <span className="text-[10px] whitespace-nowrap shrink-0">
              (<span className={getStatLabelColor(natureEffect.plus)}>+{natureEffect.plus}</span>
              {', '}
              <span className={getStatLabelColor(natureEffect.minus)}>-{natureEffect.minus}</span>)
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
        {STATS.map(stat => {
          const val = localEVs[stat.key];
          return (
            <EVStatCell
              key={stat.label}
              label={stat.label}
              value={val}
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
      {natureMenuOpen && natureMenuAnchorRect && (
        <FloatingCardPanel anchorRect={natureMenuAnchorRect} cardRect={natureMenuCardRect}>
          <NaturePickerPanel maxHeight={natureMenuMaxHeight} onSelect={handleNatureSelect} onClose={() => setNatureMenuOpen(false)} />
        </FloatingCardPanel>
      )}
    </div>
  );
}
