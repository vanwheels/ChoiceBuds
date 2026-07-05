/**
 * EditOverlays.tsx - Tiny Dropdown Selector Component
 * Native HTML <select> dropdowns for Item, Ability, and 4 Move slots
 */

import type { ImportedPokemonInfo } from '../types/pokemon';

interface EditOverlaysProps {
  pokemon: ImportedPokemonInfo;
  isEditing?: boolean;
}

const VGC_ITEMS = ['Life Orb', 'Focus Sash', 'Choice Specs', 'Choice Scarf', 'Choice Band', 'Assault Vest', 'Leftovers', 'Clear Amulet', 'Safety Goggles', 'Sitrus Berry'];
const VGC_ABILITIES = ['Intimidate', 'Protosynthesis', 'Speed Boost', 'Defiant', 'Quark Drive', 'Levitate', 'Regenerator', 'Prankster'];
const VGC_MOVES = ['Protect', 'Fake Out', 'Tailwind', 'Close Combat', 'Ice Beam', 'Thunderbolt', 'Draco Meteor', 'Helping Hand', 'Earthquake', 'Flare Blitz'];

export default function EditOverlays({ pokemon, isEditing = false }: EditOverlaysProps) {
  if (!isEditing) return null;

  const { showdownData } = pokemon;

  return (
    <div className="flex flex-col gap-2 px-2">
      {/* Item Selector */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Item</p>
        <select
          value={showdownData.item || ''}
          onChange={(e) => console.log('Item:', e.target.value)}
          className="w-full text-xs px-2 py-1 rounded border"
          style={{
            backgroundColor: '#1f2937',
            color: '#ffffff',
            borderColor: '#374151'
          }}
        >
          <option value="">No Item</option>
          {VGC_ITEMS.map(item => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
      </div>

      {/* Ability Selector */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Ability</p>
        <select
          value={showdownData.ability || ''}
          onChange={(e) => console.log('Ability:', e.target.value)}
          className="w-full text-xs px-2 py-1 rounded border"
          style={{
            backgroundColor: '#1f2937',
            color: '#ffffff',
            borderColor: '#374151'
          }}
        >
          <option value="">Select Ability</option>
          {VGC_ABILITIES.map(ability => (
            <option key={ability} value={ability}>{ability}</option>
          ))}
        </select>
      </div>

      {/* Move Selectors */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Moves</p>
        {[0, 1, 2, 3].map(index => (
          <select
            key={index}
            value={showdownData.moves[index] || ''}
            onChange={(e) => console.log(`Move ${index + 1}:`, e.target.value)}
            className="w-full text-xs px-2 py-1 rounded border mb-1"
            style={{
              backgroundColor: '#1f2937',
              color: '#ffffff',
              borderColor: '#374151'
            }}
          >
            <option value="">Select Move</option>
            {VGC_MOVES.map(move => (
              <option key={move} value={move}>{move}</option>
            ))}
          </select>
        ))}
      </div>
    </div>
  );
}
