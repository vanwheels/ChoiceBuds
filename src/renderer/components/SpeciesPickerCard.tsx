/**
 * SpeciesPickerCard.tsx - In-Slot Species Picker
 * Renders in place of a PokemonCard's own content (matching its container
 * styling) rather than as a floating dropdown - the search input sits where
 * the Nickname row normally is, so it lines up with the other cards in the
 * row, and results fill the rest of the slot. Used for both Roster Swap
 * (PokemonCard) and the trailing Add Pokémon slot (TeamCard).
 *
 * The results list has an explicit max-height (not just `h-full`): a grid
 * row's height is only as tall as its content dictates, and if this picker
 * were the only thing in its row, `h-full` would have nothing definite to
 * stretch to, so the full unfiltered roster would render and stretch the
 * slot/row instead of scrolling - hence the fixed cap here.
 */

import { useState } from 'react';
import type { SpeciesRosterEntry } from '../types/pokemon';
import type { RegulationId } from '../utils/pokemonRules';
import { validateSpeciesLegality } from '../utils/pokemonRules';
import { useDismissable } from '../hooks/useDismissable';
import { usePokemonTypeFilter } from '../hooks/usePokemonTypeFilter';
import { usePokemonMoveFilter } from '../hooks/usePokemonMoveFilter';
import { parseTagFilter } from '../utils/tagSearch';
import { ALL_TYPES } from '../config/typeEffectiveness';
import { normalizeNameForAPI } from '../services/pokeapiService';

interface SpeciesPickerCardProps {
  roster: SpeciesRosterEntry[];
  rulesetId: RegulationId;
  resolveSprite: (remoteUrl: string) => string;
  onSelect: (species: SpeciesRosterEntry) => void;
  onClose: () => void;
}

export default function SpeciesPickerCard({ roster, rulesetId, resolveSprite, onSelect, onClose }: SpeciesPickerCardProps) {
  const [search, setSearch] = useState('');
  const ref = useDismissable<HTMLDivElement>(onClose);

  // A '#tag' is a type lookup when it names one of the 18 real types;
  // otherwise it's treated as a move name, surfacing every species that can
  // learn it (learned_by_pokemon) rather than requiring an exact species
  // name match - see usePokemonMoveFilter.ts.
  const tag = parseTagFilter(search);
  const isTypeTag = tag !== null && (ALL_TYPES as readonly string[]).includes(tag);
  const typeMembers = usePokemonTypeFilter(isTypeTag ? tag : null);
  const moveMembers = usePokemonMoveFilter(tag !== null && !isTypeTag ? normalizeNameForAPI(tag) : null);

  const legalRoster = roster.filter(pkmn => validateSpeciesLegality(pkmn.name, rulesetId));
  const filtered = tag === null
    ? legalRoster.filter(pkmn => pkmn.name.toLowerCase().includes(search.toLowerCase()))
    : isTypeTag
      ? legalRoster.filter(pkmn => typeMembers?.has(pkmn.name.toLowerCase()) ?? false)
      : legalRoster.filter(pkmn => moveMembers?.has(pkmn.name.toLowerCase()) ?? false);

  return (
    <div ref={ref} className="relative bg-zinc-700 border-2 border-accent-gold rounded-lg p-3 flex flex-col gap-3 max-w-[280px] min-h-[280px] max-h-[32rem]">
      <button
        onClick={onClose}
        title="Cancel"
        className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-600 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors cursor-pointer text-sm"
      >
        ×
      </button>

      {/* Search bar aligned with the Nickname row on other cards */}
      <div className="text-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search species... (#fire, #dragon dance, ...)"
          autoFocus
          className="w-full px-2 py-1 text-sm font-bold text-white bg-zinc-800 border border-zinc-600 rounded text-center outline-none focus:border-accent-gold"
        />
      </div>

      {/* Results fill the rest of the slot, capped and scrollable */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-zinc-400 text-center mt-4">
            {tag !== null && isTypeTag && typeMembers === null
              ? 'Loading type…'
              : tag !== null && !isTypeTag && moveMembers === null
                ? 'Loading move…'
                : 'No legal species found'}
          </p>
        ) : (
          filtered.map(pkmn => (
            <div
              key={pkmn.id}
              onClick={() => onSelect(pkmn)}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-600 cursor-pointer transition-colors"
            >
              <img src={resolveSprite(pkmn.spriteUrl)} alt={pkmn.name} loading="lazy" className="w-8 h-8 object-contain [image-rendering:pixelated] shrink-0" />
              <span className="text-xs text-white truncate">{pkmn.name}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
