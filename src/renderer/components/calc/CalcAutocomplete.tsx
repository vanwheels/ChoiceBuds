/**
 * CalcAutocomplete.tsx - Generic Searchable Dropdown
 * Reused for every free-text lookup in the Calc tab (species/item/ability/
 * move) - each just passes a different flat string list. Unlike
 * SpeciesPickerCard (teams roster picker, sprite-aware, legality-filtered),
 * this is a plain sandbox picker: any of @smogon/calc's own data names can
 * be chosen, matching the real Showdown calculator's unrestricted pickers -
 * `usagePercentByName` (Regular Calc Usage-Data Auto-Populate Leg 1) never
 * narrows `options`, it only reorders/annotates them. `priorityOptions` (the
 * species-legal subset) works the same way: it lists first, and the rest of
 * `options` follows under an "All" heading only once the user types a query
 * that isn't just the current value. Opening an unedited field lists every
 * option (select-all on focus), so a click never requires deleting text first.
 */

import { Fragment, useState } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import Tooltip from '../Tooltip';
import { useDismissable } from '../../hooks/useDismissable';
import { normalizeSlug } from '../../utils/pokemonRules';

const MAX_RESULTS = 50;

interface CalcAutocompleteProps {
  label?: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
  /** Fires only on a real click-from-dropdown-list pick, not on every keystroke like onChange does - lets a caller distinguish "the user just selected X" from "the user is still typing". */
  onSelect?: (value: string) => void;
  /**
   * Ladder usage % per option, keyed by `normalizeSlug(option)` (same
   * convention as EditOverlays.tsx's own usage-annotated ability/move
   * pickers). Options with an entry here sort first (highest % first,
   * stable beyond that); everything else keeps today's alphabetical order.
   * Omit/leave undefined for a plain unranked picker (e.g. species, which
   * has no usage-percentage concept).
   */
  usagePercentByName?: Record<string, number>;
  /** Optional leading icon/sprite per dropdown row (species, item). Rows without it keep today's text-only layout. */
  renderOptionIcon?: (option: string) => ReactNode;
  /** Subset of `options` (e.g. the species' legal moves/abilities) listed ahead of the rest. */
  priorityOptions?: string[];
  /** Full hover tooltip body per option (and for the current value on the input), shown in the team builder's shared Tooltip; null shows none. */
  renderTooltip?: (option: string) => ReactNode;
  /** Row cap for large lists (moves, abilities); pass Infinity for a short curated list that must scroll fully. */
  maxResults?: number;
}

export default function CalcAutocomplete({
  label,
  value,
  options,
  placeholder,
  onChange,
  onSelect,
  usagePercentByName,
  renderOptionIcon,
  priorityOptions,
  renderTooltip,
  maxResults = MAX_RESULTS,
}: CalcAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [edited, setEdited] = useState(false);
  const [hovered, setHovered] = useState<{ option: string; rect: DOMRect } | null>(null);
  const hoverProps = (option: string) => ({
    onMouseEnter: (e: MouseEvent<HTMLElement>) =>
      setHovered({ option, rect: e.currentTarget.getBoundingClientRect() }),
    onMouseLeave: () => setHovered(null),
  });
  const ref = useDismissable<HTMLDivElement>(() => {
    setQuery(value);
    setEdited(false);
    setIsOpen(false);
  });

  // Keeps `query` synced with `value` when it changes from outside (e.g. a
  // saved-set load) - set during render rather than in an effect, matching
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [syncedValue, setSyncedValue] = useState(value);
  if (value !== syncedValue) {
    setSyncedValue(value);
    setQuery(value);
    setEdited(false);
  }

  // Most-used-first; anything with no usage entry sorts after every ranked
  // option, keeping its original (alphabetical) relative order since
  // Array.sort is stable - same convention as EditOverlays.tsx's sort.
  const byUsage = (a: string, b: string) =>
    (usagePercentByName?.[normalizeSlug(b)] ?? -1) - (usagePercentByName?.[normalizeSlug(a)] ?? -1);
  // Until the user types, the box just shows the current value; filtering by
  // it would hide every other option, so an unedited open lists everything.
  const activeQuery = edited ? query : '';
  const matches = (o: string) => o.toLowerCase().includes(activeQuery.toLowerCase());
  const prioritySet = new Set(priorityOptions);
  // "All" is for searching beyond the suggestions, so a cleared-by-typing box
  // keeps only the priority list; an unedited open shows the full list.
  const showAll = !priorityOptions || !edited || query.trim() !== '';
  const prioritized = isOpen ? (priorityOptions ?? []).filter(matches).sort(byUsage) : [];
  const rest =
    isOpen && showAll ? options.filter((o) => !prioritySet.has(o) && matches(o)).sort(byUsage) : [];
  const filtered = [...prioritized, ...rest].slice(0, maxResults);
  const firstAllIndex = priorityOptions && prioritized.length > 0 ? prioritized.length : -1;

  const handleSelect = (option: string) => {
    onChange(option);
    onSelect?.(option);
    setQuery(option);
    setEdited(false);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative flex flex-col gap-1">
      {label && (
        <label className="text-[10px] text-zinc-400 uppercase tracking-wide">{label}</label>
      )}
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setEdited(true);
          setIsOpen(true);
        }}
        onFocus={(e) => {
          // Select-all so the first keystroke replaces the value, like the Nature dropdown.
          e.target.select();
          setEdited(false);
          setIsOpen(true);
        }}
        {...(renderTooltip && !isOpen ? hoverProps(value) : {})}
        className="px-2 py-0.5 text-sm bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold"
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-zinc-700 bg-slate-900 shadow-xl">
          {filtered.map((option, i) => {
            const percent = usagePercentByName?.[normalizeSlug(option)];
            return (
              <Fragment key={option}>
                {i === firstAllIndex && (
                  <div className="px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500 bg-zinc-800/60">
                    All
                  </div>
                )}
                <button
                  type="button"
                  {...(renderTooltip ? hoverProps(option) : {})}
                  onClick={() => handleSelect(option)}
                  className="w-full flex items-center gap-2 text-left px-2 py-1 text-sm text-zinc-200 hover:bg-accent-gold hover:text-zinc-900 transition-colors cursor-pointer"
                >
                  {renderOptionIcon && (
                    <span className="w-7 h-7 shrink-0 flex items-center justify-center">
                      {renderOptionIcon(option)}
                    </span>
                  )}
                  <span className="flex-1 truncate">{option}</span>
                  {percent != null && (
                    <span className="text-accent-gold text-[10px] font-bold whitespace-nowrap">
                      {percent.toFixed(1)}%
                    </span>
                  )}
                </button>
              </Fragment>
            );
          })}
        </div>
      )}
      {renderTooltip &&
        hovered &&
        (() => {
          const body = renderTooltip(hovered.option);
          return body ? <Tooltip content={body} anchorRect={hovered.rect} cardRect={null} /> : null;
        })()}
    </div>
  );
}
