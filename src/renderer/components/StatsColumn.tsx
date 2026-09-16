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
 *
 * SP / Base / Real Total display mode (Team Builder Stat Display: SP / Base
 * / Real Total Toggle, see TODO.md): a 3-segment button row (same pattern as
 * calc/FormeToggle.tsx's forme-family toggle) picks the whole grid's display
 * state directly - SP/Base/Real all named and visible at once, rather than
 * a single unlabeled cycling control a viewer would have no way to discover
 * (first shipped as a bare clickable "SP" label; re-done after live
 * feedback that nothing signaled it was interactive at all). SP is the only
 * editable state; Base and Real Total render every cell as a plain read-only
 * value, bypassing EVStatCell's edit affordances entirely. Real Total's
 * Base+SP+Nature math needs @smogon/calc, which is
 * lazy-imported (utils/realTotalStats.ts) the first time the grid is
 * flipped to that mode rather than statically imported here, so the runtime
 * `Pokemon` class doesn't enter the bundle for every card that never visits
 * that mode - see that file's header for the exact lazy-load precedent it
 * mirrors. `realTotalCache` memoizes the last computed result against a key
 * of every input that could change it, so re-flipping the toggle back to
 * Real Total without editing anything in between reuses the cached value
 * instead of recomputing.
 */

import { useState, useEffect } from 'react';
import type { MouseEvent } from 'react';
import type { EVSpread, PokemonStats, ShowdownPokemon } from '../types/pokemon';
import { useDismissable } from '../hooks/useDismissable';
import { getNatureEffect } from '../config/vgcData';
import { getStatLabelColor } from '../config/pokemonTheme';
import { measureDropdownMaxHeight } from '../utils/measureDropdownHeight';
import EVStatCell from './EVStatCell';
import NaturePickerPanel from './NaturePickerPanel';
import FloatingCardPanel from './FloatingCardPanel';

type StatDisplayMode = 'sp' | 'base' | 'real';

const DISPLAY_MODES: Array<{ mode: StatDisplayMode; label: string; title: string }> = [
  { mode: 'sp', label: 'SP', title: 'SP - editable Stat Points (0-32/stat, 66 total)' },
  { mode: 'base', label: 'Base', title: 'Base - species base stat, read-only' },
  { mode: 'real', label: 'Real', title: 'Real Total - Base + SP + Nature at Lv50, max IVs' },
];

interface StatsColumnProps {
  species: string;
  level: number;
  gender?: 'M' | 'F' | 'N' | '';
  baseStats: PokemonStats;
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
export default function StatsColumn({ species, level, gender, baseStats, evs, nature, onUpdatePokemon }: StatsColumnProps) {
  const [localEVs, setLocalEVs] = useState(evs);
  const [activeStat, setActiveStat] = useState<keyof EVSpread | null>(null);
  const [natureMenuOpen, setNatureMenuOpen] = useState(false);
  const [natureMenuMaxHeight, setNatureMenuMaxHeight] = useState(400);
  const [natureMenuAnchorRect, setNatureMenuAnchorRect] = useState<DOMRect | null>(null);
  const [natureMenuCardRect, setNatureMenuCardRect] = useState<DOMRect | null>(null);
  const ref = useDismissable<HTMLDivElement>(() => setActiveStat(null));

  const [displayMode, setDisplayMode] = useState<StatDisplayMode>('sp');
  const [realTotalCache, setRealTotalCache] = useState<{ key: string; stats: PokemonStats | null } | null>(null);

  const totalEVs = Object.values(localEVs).reduce((sum, val) => sum + val, 0);
  const natureEffect = getNatureEffect(nature);

  // Recomputed on every render (cheap string concat) rather than stored in
  // state - `realTotalCache.key` only needs comparing against this, not
  // tracking independently.
  const realTotalKey = `${species}|${level}|${gender}|${nature}|${localEVs.hp},${localEVs.attack},${localEVs.defense},${localEVs.specialAttack},${localEVs.specialDefense},${localEVs.speed}`;
  const isRealTotalCurrent = realTotalCache?.key === realTotalKey;

  useEffect(() => {
    if (displayMode !== 'real' || isRealTotalCurrent) return;
    let cancelled = false;
    import('../utils/realTotalStats').then(({ computeRealTotalStats }) => {
      if (cancelled) return;
      setRealTotalCache({ key: realTotalKey, stats: computeRealTotalStats(species, { level, gender, nature, evs: localEVs }) });
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- realTotalKey already encodes every input this needs to react to
  }, [displayMode, realTotalKey]);

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

  const baseTotal = Object.values(baseStats).reduce((sum, v) => sum + v, 0);
  const realTotal = isRealTotalCurrent && realTotalCache?.stats
    ? Object.values(realTotalCache.stats).reduce((sum, v) => sum + v, 0)
    : null;

  return (
    <div ref={ref} className="bg-zinc-800 rounded px-2 py-1.5 border border-zinc-600 min-w-0">
      <div className="mb-1 min-w-0">
        <div className="flex justify-between items-center min-w-0 gap-1">
          <div className="flex items-center gap-1 shrink-0">
            {DISPLAY_MODES.map(({ mode, label, title }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDisplayMode(mode)}
                title={title}
                className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  displayMode === mode ? 'bg-accent-gold text-zinc-900' : 'bg-zinc-900 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'
                }`}
              >{label}</button>
            ))}
          </div>
          {displayMode === 'sp' ? (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
              totalEVs > 66
                ? 'bg-red-600 text-white border border-red-400'
                : totalEVs === 66
                  ? 'bg-emerald-500 text-white'
                  : 'bg-zinc-700 text-zinc-400'
            }`}>{totalEVs > 66 ? '⚠ ' : ''}{totalEVs}/66</span>
          ) : (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">
              {displayMode === 'base' ? baseTotal : (realTotal !== null ? realTotal : '…')}
            </span>
          )}
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
          if (displayMode === 'sp') {
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
          }
          // Base / Real Total are read-only display states - rendered as
          // plain values rather than through EVStatCell, whose whole shape
          // (activate-to-edit, hold-to-repeat +/-) only makes sense for SP.
          const readOnlyValue = displayMode === 'base'
            ? baseStats[stat.key]
            : isRealTotalCurrent
              ? (realTotalCache?.stats ? realTotalCache.stats[stat.key] : '—')
              : '…';
          return (
            <div key={stat.label} className="flex flex-col items-center gap-0.5 rounded px-1 py-0.5">
              <span className={`text-[10px] font-bold uppercase ${getStatLabelColor(stat.label)}`}>{stat.label}</span>
              <span className="text-sm font-mono font-bold text-zinc-100 px-1.5 py-0.5">{readOnlyValue}</span>
            </div>
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
