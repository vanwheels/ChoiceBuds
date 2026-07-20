/**
 * TypeSelector.tsx - Defending Type-Combo Picker
 * Grid of all 18 type badges; click to toggle into/out of the (max 2)
 * selection. A 3rd click while two are already selected bumps the
 * first-selected type out (FIFO), keeping the interaction a single click
 * rather than requiring an explicit deselect first.
 */

import { ALL_TYPES } from '../../config/typeEffectiveness';
import { getTypeTheme } from '../../config/pokemonTheme';

interface TypeSelectorProps {
  selectedTypes: string[];
  onChange: (types: string[]) => void;
}

export default function TypeSelector({ selectedTypes, onChange }: TypeSelectorProps) {
  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      onChange(selectedTypes.filter(t => t !== type));
    } else if (selectedTypes.length < 2) {
      onChange([...selectedTypes, type]);
    } else {
      onChange([selectedTypes[1], type]);
    }
  };

  return (
    <div className="grid grid-cols-6 gap-2">
      {ALL_TYPES.map(type => {
        const theme = getTypeTheme(type);
        const isSelected = selectedTypes.includes(type);
        return (
          <button
            key={type}
            onClick={() => toggleType(type)}
            className={`text-center text-xs font-bold py-2 rounded-md uppercase tracking-wider transition-all ${theme.bg} ${theme.text} ${
              isSelected ? 'ring-2 ring-offset-2 ring-offset-gray-900 ring-white' : 'opacity-70 hover:opacity-100'
            }`}
          >
            {type}
          </button>
        );
      })}
    </div>
  );
}
