/**
 * TagChipInput.tsx - Multi-Select Type/Move/Ability Chip Input
 * Foundation component for the Tag-Chip Redesign (see TODO.md) - not wired
 * into any real picker yet. Replaces the old free-text '#tag' syntax
 * (utils/tagSearch.ts) with explicit chips: typing filters a category-
 * labeled autocomplete dropdown (matching/dedupe logic in
 * utils/tagChipMatch.ts), and picking an option adds a removable chip.
 * Multiple chips are meant to AND together - that combination lives in
 * whichever picker wires this in (SpeciesPickerCard.tsx, Box search,
 * AddPokemonStatTable.tsx), not in this component.
 *
 * Candidate option lists (typeOptions/moveOptions/abilityOptions) are
 * passed in rather than fetched here, so this component stays a pure
 * presentational piece - the consumer owns where those lists come from
 * (e.g. config/typeEffectiveness.ts's ALL_TYPES, hooks/useMoveNameList.ts).
 */

import { useState } from 'react';
import type { TagChip } from '../types/tagChip';
import {
  addChip,
  buildChipOptions,
  excludeSelectedOptions,
  removeChip,
} from '../utils/tagChipMatch';
import { useDismissable } from '../hooks/useDismissable';

interface TagChipInputProps {
  chips: TagChip[];
  onChipsChange: (chips: TagChip[]) => void;
  typeOptions: string[];
  moveOptions: string[];
  abilityOptions: string[];
  placeholder?: string;
}

const CATEGORY_LABELS = {
  type: 'Type',
  move: 'Move',
  ability: 'Ability',
} as const;

export default function TagChipInput({
  chips,
  onChipsChange,
  typeOptions,
  moveOptions,
  abilityOptions,
  placeholder = 'Search type/move/ability...',
}: TagChipInputProps) {
  const [query, setQuery] = useState('');
  const ref = useDismissable<HTMLDivElement>(() => setQuery(''));

  const options = excludeSelectedOptions(
    buildChipOptions(query, { types: typeOptions, moves: moveOptions, abilities: abilityOptions }),
    chips,
  );

  return (
    <div ref={ref} className="relative flex flex-col gap-1">
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chips.map((chip) => (
            <span
              key={`${chip.category}:${chip.value}`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono rounded border border-accent-gold bg-accent-gold/10 text-accent-gold"
            >
              <span className="uppercase text-zinc-400">{CATEGORY_LABELS[chip.category]}</span>
              {chip.value}
              <button
                type="button"
                onClick={() => onChipsChange(removeChip(chips, chip))}
                aria-label={`Remove ${chip.value}`}
                className="text-zinc-400 hover:text-red-400 cursor-pointer"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full px-2 py-1 text-sm font-bold text-white bg-zinc-800 border border-zinc-600 rounded text-center outline-none focus:border-accent-gold"
      />

      {options.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto bg-zinc-700 border border-accent-gold rounded-lg p-1 flex flex-col gap-0.5">
          {options.map((option) => (
            <div
              key={`${option.category}:${option.value}`}
              onClick={() => {
                onChipsChange(addChip(chips, { category: option.category, value: option.value }));
                setQuery('');
              }}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-600 cursor-pointer transition-colors"
            >
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                {CATEGORY_LABELS[option.category]}
              </span>
              <span className="text-xs text-white truncate">{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
