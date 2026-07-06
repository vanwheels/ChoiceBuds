/**
 * EditOverlays.tsx - Interactive Popover Selector Component
 * Replaces native HTML <select> dropdowns with ShowdownPopover for Item, Ability, and 4 Move slots
 * Wires real data from useGameData and PokeAPI cache
 */

import { useState, useEffect } from 'react';
import type { ImportedPokemonInfo, ItemData, MoveData, AbilityData } from '../types/pokemon';
import { ShowdownPopover } from './ShowdownPopover';
import { useGameData } from '../hooks/useGameData';

interface EditOverlaysProps {
  pokemon: ImportedPokemonInfo;
  isEditing?: boolean;
}

export default function EditOverlays({ pokemon, isEditing = false }: EditOverlaysProps) {
  const { items, getEnrichedSpeciesOptions } = useGameData();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string>(pokemon.showdownData.item || '');
  const [selectedAbility, setSelectedAbility] = useState<string>(pokemon.showdownData.ability || '');
  const [selectedMoves, setSelectedMoves] = useState<string[]>([
    pokemon.showdownData.moves[0] || '',
    pokemon.showdownData.moves[1] || '',
    pokemon.showdownData.moves[2] || '',
    pokemon.showdownData.moves[3] || '',
  ]);
  const [legalMoves, setLegalMoves] = useState<MoveData[]>([]);
  const [legalAbilities, setLegalAbilities] = useState<AbilityData[]>([]);

  const handleItemClick = (item: ItemData) => {
    setSelectedItem(item.name);
    closeMenu();
  };

  const handleAbilityClick = (ability: AbilityData) => {
    setSelectedAbility(ability.name);
    closeMenu();
  };

  const handleMoveClick = (index: number, move: MoveData) => {
    setSelectedMoves(prev => {
      const next = [...prev];
      next[index] = move.name;
      return next;
    });
    closeMenu();
  };

  const toggleMenu = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  const closeMenu = () => {
    setActiveMenu(null);
  };

  // Pull the species' real legal movepool + ability pool from PokeAPI (via useGameData),
  // instead of falling back to whatever this one Pokemon happens to already have equipped.
  useEffect(() => {
    let cancelled = false;

    getEnrichedSpeciesOptions(pokemon.showdownData.species, pokemon.showdownData.gender)
      .then(({ moves, abilities }) => {
        if (cancelled) return;
        setLegalMoves(moves);
        setLegalAbilities(abilities);
      })
      .catch(() => {
        if (cancelled) return;
        console.warn(`No learnset data available for species: ${pokemon.showdownData.species}`);
      });

    return () => {
      cancelled = true;
    };
  }, [pokemon.showdownData.species, pokemon.showdownData.gender, getEnrichedSpeciesOptions]);

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
            data={items}
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
            data={legalAbilities}
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
                data={legalMoves}
                onSelect={(move: MoveData) => handleMoveClick(index, move)}
                onClose={closeMenu}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
