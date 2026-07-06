/**
 * ItemPickerPanel.tsx - In-Slot Item Picker
 * Same "fills the slot instead of floating a dropdown" idea as
 * SpeciesPickerCard, but scoped to just the Item box's own position in
 * EditOverlays rather than the whole card - the rest of the card (nickname,
 * sprite, type badges, ability/moves, EVs, footer) stays exactly where it is.
 * Each row shows the item's sprite next to its name and description.
 */

import { useState } from 'react';
import type { ItemData } from '../types/pokemon';
import { useDismissable } from '../hooks/useDismissable';
import { toReadableName } from '../utils/displayName';

interface ItemPickerPanelProps {
  items: ItemData[];
  onSelect: (item: ItemData) => void;
  onClose: () => void;
}

export default function ItemPickerPanel({ items, onSelect, onClose }: ItemPickerPanelProps) {
  const [search, setSearch] = useState('');
  const ref = useDismissable<HTMLDivElement>(onClose);

  const filtered = items.filter(item => toReadableName(item.name).toLowerCase().includes(search.toLowerCase()));

  return (
    <div ref={ref} className="w-full flex flex-col gap-2 bg-gray-800 border-2 border-blue-500 rounded-lg p-2">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search items..."
        autoFocus
        className="w-full px-2 py-1 text-sm font-bold text-white bg-gray-900 border border-gray-600 rounded text-center outline-none focus:border-blue-500"
      />
      <div className="max-h-[32rem] overflow-y-auto flex flex-col gap-1">
        {filtered.length === 0 ? (
          <p className="text-xs text-gray-400 text-center mt-2">No items found</p>
        ) : (
          filtered.map((item, idx) => (
            <div
              key={idx}
              onClick={() => onSelect(item)}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-700 cursor-pointer transition-colors"
            >
              {item.spriteUrl ? (
                <img src={item.spriteUrl} alt={item.name} loading="lazy" className="w-8 h-8 object-contain shrink-0" />
              ) : (
                <span className="w-8 h-8 flex items-center justify-center text-base shrink-0" role="img" aria-label="Unknown item">🎒</span>
              )}
              <div className="min-w-0">
                <div className="text-white text-sm font-medium truncate">{toReadableName(item.name)}</div>
                <div className="text-gray-400 text-xs truncate">{item.description}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
