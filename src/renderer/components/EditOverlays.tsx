/**
 * EditOverlays.tsx - Interactive Popover Selector Component
 * Replaces native HTML <select> dropdowns with ShowdownPopover for Item, Ability, and 4 Move slots
 * Wires real data from useGameData and PokeAPI cache
 */

import React, { useState, useEffect } from 'react';
import type { ImportedPokemonInfo } from '../types/pokemon';
import { ShowdownPopover } from './ShowdownPopover';
import { useGameData } from '../hooks/useGameData';

interface EditOverlaysProps {
  pokemon: ImportedPokemonInfo;
  isEditing?: boolean;
}

export default function EditOverlays({ pokemon, isEditing = false }: EditOverlaysProps) {
  const { items, speciesLearnsets } = useGameData();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedAbility, setSelectedAbility] = useState(null);
  const [selectedMoves, setSelectedMoves] = useState(['', '', '', '']);

  const handleItemClick = (item) => {
    setSelectedItem(item.name);
    closeMenu();
  };

  const handleAbilityClick = (ability) => {
    setSelectedAbility(ability.name);
    closeMenu();
  };

  const handleMoveClick = (index, move) => {
    const newMoves = [...selectedMoves];
    newMoves[index] = move.name;
    setSelectedMoves(newMoves);
    closeMenu();
  };

  const toggleMenu = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const closeMenu = () => {
    setActiveMenu(null);
  };

  useEffect(() => {
    if (!speciesLearnsets[pokemon.showdownData.species]) {
      console.warn(`No learnset data available for species: ${pokemon.showdownData.species}`);
    }
  }, [speciesLearnsets, pokemon.showdownData.species]);

  const filteredItems = items.filter(item =>
    item.category === 'held-items' || item.category === 'choice'
  );

  const filteredAbilities = Object.keys(speciesLearnsets[pokemon.showdownData.species] || {})
    .map(ability => ({
      name: ability,
      description: speciesLearnsets[pokemon.showdownData.species][ability]
    }));

  const filteredMoves = (speciesLearnsets[pokemon.showdownData.species] || []).flatMap(moveSet =>
    moveSet.moves.map(move => ({
      name: move.move.name,
      type: move.move.type.name,
      category: move.move.damage_class.name,
      power: move.move.power,
      pp: move.move.pp,
      accuracy: move.move.accuracy,
      description: move.move.effect_entries.find(entry => entry.language.name === 'en')?.short_effect || 'No description available'
    }))
  );

  if (!isEditing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 0.5rem' }}>
        {/* Item Display */}
        <div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Item</div>
          <div style={{ color: '#fff', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            {pokemon.showdownData.item || 'None'}
          </div>
        </div>

        {/* Ability Display */}
        <div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Ability</div>
          <div style={{ color: '#fff', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            {pokemon.showdownData.ability || 'None'}
          </div>
        </div>

        {/* Moves Display */}
        <div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Moves</div>
          {(pokemon.showdownData.moves || []).map((move, index) => (
            <div key={index} style={{ color: '#fff', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
              {move || 'None'}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-2">
      {/* Item Selector */}
      <div className="relative">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Item</p>
        <div
          onClick={() => toggleMenu('item')}
          className="w-full text-sm px-3 py-2 rounded border cursor-pointer hover:bg-gray-700 transition-colors"
          style={{
            backgroundColor: '#1f2937',
            color: '#ffffff',
            borderColor: activeMenu === 'item' ? '#3b82f6' : '#374151'
          }}
        >
          {selectedItem || 'No Item'}
        </div>
        {activeMenu === 'item' && (
          <ShowdownPopover
            mode="item"
            data={filteredItems}
            onSelect={handleItemClick}
            onClose={closeMenu}
          />
        )}
      </div>

      {/* Ability Selector */}
      <div className="relative">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Ability</p>
        <div
          onClick={() => toggleMenu('ability')}
          className="w-full text-sm px-3 py-2 rounded border cursor-pointer hover:bg-gray-700 transition-colors"
          style={{
            backgroundColor: '#1f2937',
            color: '#ffffff',
            borderColor: activeMenu === 'ability' ? '#3b82f6' : '#374151'
          }}
        >
          {selectedAbility || 'Select Ability'}
        </div>
        {activeMenu === 'ability' && (
          <ShowdownPopover
            mode="ability"
            data={filteredAbilities}
            onSelect={handleAbilityClick}
            onClose={closeMenu}
          />
        )}
      </div>

      {/* Move Selectors */}
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Moves</p>
        {[0, 1, 2, 3].map(index => (
          <div key={index} className="relative mb-2">
            <div
              onClick={() => toggleMenu(`move${index}`)}
              className="w-full text-sm px-3 py-2 rounded border cursor-pointer hover:bg-gray-700 transition-colors"
              style={{
                backgroundColor: '#1f2937',
                color: '#ffffff',
                borderColor: activeMenu === `move${index}` ? '#3b82f6' : '#374151'
              }}
            >
              {selectedMoves[index] || `Select Move ${index + 1}`}
            </div>
            {activeMenu === `move${index}` && (
              <ShowdownPopover
                mode="move"
                data={filteredMoves}
                onSelect={(move) => handleMoveClick(index, move)}
                onClose={closeMenu}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
