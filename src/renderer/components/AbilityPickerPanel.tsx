/**
 * AbilityPickerPanel.tsx - In-Slot Ability Picker
 * Same "fills the slot instead of floating a dropdown" pattern as
 * ItemPickerPanel/SpeciesPickerCard: replaces EditOverlays' entire
 * item/ability/move region (not just the Ability pill) while picking, so it
 * always sits solely inside the PokemonCard's own width rather than
 * overflowing past its edges like the old floating ShowdownPopover did.
 */

import { useState } from 'react';
import type { AbilityData } from '../types/pokemon';
import { useDismissable } from '../hooks/useDismissable';
import { toReadableName } from '../utils/displayName';

interface AbilityPickerPanelProps {
  abilities: AbilityData[];
  /** Champions ranked-ladder usage %, keyed by the same slug as AbilityData.name - see EditOverlays.tsx. Absent entries just render with no badge. */
  usagePercentByName?: Record<string, number>;
  maxHeight: number;
  onSelect: (ability: AbilityData) => void;
  onClose: () => void;
}

export default function AbilityPickerPanel({ abilities, usagePercentByName, maxHeight, onSelect, onClose }: AbilityPickerPanelProps) {
  const [search, setSearch] = useState('');
  const ref = useDismissable<HTMLDivElement>(onClose);

  const filtered = abilities.filter(ability => toReadableName(ability.name).toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className="w-full flex flex-col gap-2 bg-gray-800 border-2 border-blue-500 rounded-lg p-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search abilities..."
        autoFocus
        className="w-full px-2 py-1 text-sm font-bold text-white bg-gray-900 border border-gray-600 rounded text-center outline-none focus:border-blue-500"
      />
      <div className="overflow-y-auto flex flex-col gap-1" style={{ maxHeight }}>
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-2">No abilities found</p>
        ) : (
          filtered.map((ability, idx) => {
            const percent = usagePercentByName?.[ability.name];
            return (
              <div
                key={idx}
                onClick={() => onSelect(ability)}
                className="px-2 py-1 rounded hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white text-sm font-medium truncate">{toReadableName(ability.name)}</span>
                  {percent != null && (
                    <span className="text-blue-400 text-xs font-bold shrink-0">{percent.toFixed(1)}%</span>
                  )}
                </div>
                <div className="text-gray-400 text-xs truncate">{ability.description}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
