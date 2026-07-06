/**
 * SpeciesPickerCard.tsx - In-Slot Species Picker
 * Renders in place of a PokemonCard's own content (matching its container
 * styling and stretching to the same grid-row height) rather than as a
 * floating dropdown - the search input sits where the Nickname row normally
 * is, so it lines up with the other cards in the row, and results fill the
 * rest of the slot. Used for both Roster Swap (PokemonCard) and the
 * trailing Add Pokémon slot (TeamCard).
 */

import { useState } from 'react';
import type { SpeciesRosterEntry } from '../types/pokemon';
import type { RegulationId } from '../utils/pokemonRules';
import { validateSpeciesLegality } from '../utils/pokemonRules';

interface SpeciesPickerCardProps {
  roster: SpeciesRosterEntry[];
  rulesetId: RegulationId;
  onSelect: (species: SpeciesRosterEntry) => void;
  onClose: () => void;
}

export default function SpeciesPickerCard({ roster, rulesetId, onSelect, onClose }: SpeciesPickerCardProps) {
  const [search, setSearch] = useState('');

  const filtered = roster
    .filter(pkmn => validateSpeciesLegality(pkmn.name, rulesetId))
    .filter(pkmn => pkmn.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative bg-gray-700 border-2 border-blue-500 rounded-lg p-3 flex flex-col gap-3 max-w-[280px] h-full min-h-[280px]">
      <button
        onClick={onClose}
        title="Cancel"
        className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-gray-800 border border-gray-600 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors cursor-pointer text-sm"
      >
        ×
      </button>

      {/* Search bar aligned with the Nickname row on other cards */}
      <div className="text-center">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search species..."
          autoFocus
          className="w-full px-2 py-1 text-sm font-bold text-white bg-gray-800 border border-gray-600 rounded text-center outline-none focus:border-blue-500"
        />
      </div>

      {/* Results fill the rest of the slot */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-4">No legal species found</p>
        ) : (
          filtered.map(pkmn => (
            <div
              key={pkmn.id}
              onClick={() => onSelect(pkmn)}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-600 cursor-pointer transition-colors"
            >
              <img src={pkmn.spriteUrl} alt={pkmn.name} className="w-8 h-8 object-contain [image-rendering:pixelated] shrink-0" />
              <span className="text-xs text-white truncate">{pkmn.name}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
