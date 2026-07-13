/**
 * CalcAutocomplete.tsx - Generic Searchable Dropdown
 * Reused for every free-text lookup in the Calc tab (species/item/ability/
 * move) - each just passes a different flat string list. Unlike
 * SpeciesPickerCard (teams roster picker, sprite-aware, legality-filtered),
 * this is a plain sandbox picker: any of @smogon/calc's own data names can
 * be chosen, matching the real Showdown calculator's unrestricted pickers.
 */

import { useEffect, useState } from 'react';
import { useDismissable } from '../../hooks/useDismissable';

const MAX_RESULTS = 50;

interface CalcAutocompleteProps {
  label?: string;
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (value: string) => void;
  /** Fires only on a real click-from-dropdown-list pick, not on every keystroke like onChange does - lets a caller distinguish "the user just selected X" from "the user is still typing". */
  onSelect?: (value: string) => void;
}

export default function CalcAutocomplete({ label, value, options, placeholder, onChange, onSelect }: CalcAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const ref = useDismissable<HTMLDivElement>(() => {
    setQuery(value);
    setIsOpen(false);
  });

  useEffect(() => setQuery(value), [value]);

  const filtered = isOpen
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())).slice(0, MAX_RESULTS)
    : [];

  const handleSelect = (option: string) => {
    onChange(option);
    onSelect?.(option);
    setQuery(option);
    setIsOpen(false);
  };

  return (
    <div ref={ref} className="relative flex flex-col gap-1">
      {label && <label className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</label>}
      <input
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        className="px-2 py-1 text-sm bg-gray-800 border border-gray-600 rounded text-white outline-none focus:border-blue-500"
      />
      {isOpen && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-zinc-700 bg-slate-900 shadow-xl">
          {filtered.map(option => (
            <button
              key={option}
              type="button"
              onClick={() => handleSelect(option)}
              className="w-full text-left px-2 py-1 text-sm text-zinc-200 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
