/**
 * NaturePickerPanel.tsx - Nature Picker
 * Pure content - StatsColumn.tsx wraps this in FloatingCardPanel, same
 * shape as AbilityPickerPanel.tsx (Card Popup Consistency Leg 3 - see
 * TODO.md). Replaces the native <select> that used to sit directly in
 * StatsColumn, which had no positioning/styling control and spilled over
 * neighboring UI. Also reused by the Calc popup (CalcDropdown.tsx), which
 * passes its own usage-sorted `options` and `percentByName`.
 */

import { useState } from 'react';
import { NATURES, getNatureEffect } from '../config/vgcData';
import { getStatLabelColor } from '../config/pokemonTheme';
import { normalizeSlug } from '../utils/pokemonRules';
import { useDismissable } from '../hooks/useDismissable';

interface NaturePickerPanelProps {
  maxHeight: number;
  /** Display order; defaults to the canonical NATURES list. */
  options?: readonly string[];
  /** Usage % keyed by normalizeSlug(nature); omitted natures show none. */
  percentByName?: Record<string, number>;
  onSelect: (nature: string) => void;
  onClose: () => void;
}

export default function NaturePickerPanel({
  maxHeight,
  options = NATURES,
  percentByName,
  onSelect,
  onClose,
}: NaturePickerPanelProps) {
  const [search, setSearch] = useState('');
  const ref = useDismissable<HTMLDivElement>(onClose);

  const filtered = options.filter((nature) => nature.toLowerCase().includes(search.toLowerCase()));

  return (
    <div
      ref={ref}
      className="w-full flex flex-col gap-2 bg-zinc-800 border-2 border-accent-gold rounded-lg p-2"
    >
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search natures..."
        autoFocus
        className="w-full px-2 py-1 text-sm font-bold text-white bg-zinc-900 border border-zinc-600 rounded text-center outline-none focus:border-accent-gold"
      />
      <div className="overflow-y-auto flex flex-col gap-1" style={{ maxHeight }}>
        {filtered.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center mt-2">No natures found</p>
        ) : (
          filtered.map((nature) => {
            const effect = getNatureEffect(nature);
            const percent = percentByName?.[normalizeSlug(nature)];
            return (
              <div
                key={nature}
                onClick={() => onSelect(nature)}
                className="flex items-center justify-between gap-2 px-2 py-1 rounded hover:bg-zinc-700 cursor-pointer transition-colors"
              >
                <span className="text-white text-sm font-medium truncate">{nature}</span>
                <span className="flex items-center gap-2 shrink-0">
                  {effect ? (
                    <span className="text-xs whitespace-nowrap">
                      (<span className={getStatLabelColor(effect.plus)}>+{effect.plus}</span>
                      {', '}
                      <span className={getStatLabelColor(effect.minus)}>-{effect.minus}</span>)
                    </span>
                  ) : (
                    <span className="text-zinc-500 text-xs whitespace-nowrap">Neutral</span>
                  )}
                  {percent != null && (
                    <span className="text-zinc-400 text-xs tabular-nums w-10 text-right">
                      {percent.toFixed(1)}%
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
