/**
 * EditOverlays.tsx - Interactive Popover Selector Component
 * Replaces native HTML <select> dropdowns with ShowdownPopover for Item, Ability, and 4 Move slots
 * Wires real data from useGameData and PokeAPI cache
 */

import { useState, useEffect } from 'react';
import type { ImportedPokemonInfo } from '../types/pokemon';
import { ShowdownPopover } from './ShowdownPopover';
import { useGameData } from '../hooks/useGameData';
import { useDatabase } from '../hooks/useDatabase';

interface EditOverlaysProps {
  pokemon: ImportedPokemonInfo;
  isEditing?: boolean;
}

export default function EditOverlays({ pokemon, isEditing = false }: EditOverlaysProps) {
  const { showdownData } = pokemon;
  const { getItemData, getMoveData, getAbilityData, getCachedItem, getCachedMove, getCachedAbility } = useGameData();
  const { getCachedEntry } = useDatabase();
  
  // Track which menu is currently open
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  // State for dynamically fetched data
  const [itemsData, setItemsData] = useState<any[]>([]);
  const [abilitiesData, setAbilitiesData] = useState<any[]>([]);
  const [movesData, setMovesData] = useState<any[]>([]);

  // Toggle menu open/close
  const toggleMenu = (menuName: string) => {
    setActiveMenu(activeMenu === menuName ? null : menuName);
  };

  // Close all menus
  const closeMenu = () => {
    setActiveMenu(null);
  };

  // Handle item selection
  const handleItemSelect = (item: any) => {
    console.log('Item selected:', item.name);
    // TODO: Update pokemon data via context/hook
    closeMenu();
  };

  // Handle ability selection
  const handleAbilitySelect = (ability: any) => {
    console.log('Ability selected:', ability.name);
    // TODO: Update pokemon data via context/hook
    closeMenu();
  };

  // Handle move selection
  const handleMoveSelect = (moveIndex: number, move: any) => {
    console.log(`Move ${moveIndex + 1} selected:`, move.name);
    // TODO: Update pokemon data via context/hook
    closeMenu();
  };

  /**
   * Fetch and cache item data for all VGC items
   * Dynamically loads sprite URLs and descriptions from PokeAPI
   */
   useEffect(() => {
    const fetchItemsData = async () => {
      const activeItemName = showdownData?.item;
      if (!activeItemName) {
        setItemsData([]);
        return;
      }

      // Check cache first for instant load
      let itemData = getCachedItem(activeItemName);
      
      // If not cached, fetch from API
      if (!itemData && getItemData) {
        itemData = await getItemData(activeItemName);
      }
      
      const itemRow = {
        name: activeItemName,
        description: itemData?.effect || itemData?.description || 'No description available',
        sprite: itemData?.spriteUrl || 'https://githubusercontent.com'
      };
      
      setItemsData([itemRow]);
    };
    
    fetchItemsData();
  }, [getItemData, getCachedItem, showdownData?.item]);

  /**
   * Extract abilities from pokemon's cached PokeAPI data
   * Filters to only show abilities this specific species can have
   */
  useEffect(() => {
    const fetchAbilitiesData = async () => {
      // Get the species name and normalize it for cache lookup
      const speciesName = showdownData.species.toLowerCase().trim();
      const gender = showdownData.gender;
      
      // Build cache key (handles gender-divergent forms like Basculegion)
      let cacheKey = speciesName;
      if (gender && (speciesName === 'basculegion' || speciesName === 'indeedee' || 
                     speciesName === 'meowstic' || speciesName === 'oinkologne')) {
        cacheKey = gender === 'F' ? `${speciesName}-female` : `${speciesName}-male`;
      }
      
      // Get abilities from the pokemon's PokeAPI cache entry
      const cachedSpeciesData = getCachedEntry(cacheKey);
      const speciesAbilities = cachedSpeciesData?.abilities || [];
      
      // If we have species-specific abilities, use those; otherwise use a default set
      const abilityNames = speciesAbilities.length > 0 
        ? speciesAbilities 
        : ['Intimidate', 'Protosynthesis', 'Speed Boost', 'Defiant', 'Quark Drive', 'Levitate', 'Regenerator', 'Prankster'];
      
      const abilities = await Promise.all(
        abilityNames.map(async (abilityName) => {
          // Normalize ability name (capitalize first letter of each word)
          const displayName = abilityName
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          // Check cache first
          let abilityData = getCachedAbility(abilityName);
          
          // If not cached, fetch from API
          if (!abilityData) {
            abilityData = await getAbilityData(abilityName);
          }
          
          return {
            name: displayName,
            description: abilityData?.description || 'No description available'
          };
        })
      );
      
      setAbilitiesData(abilities);
    };
    
    fetchAbilitiesData();
  }, [pokemon, showdownData.species, showdownData.gender, getAbilityData, getCachedAbility, getCachedEntry]);

  /**
   * Fetch and cache move data for all VGC moves
   * Dynamically loads type, category, power, accuracy, PP, and descriptions
   * In a full implementation, this would be filtered to species-specific learnsets
   */
  useEffect(() => {
    const fetchMovesData = async () => {
  // Use your real learning validation lists from useGameData
  const championsLearnset: string[] = pokemon.showdownData?.moves || [];
  
    const moves = await Promise.all(
      championsLearnset.map(async (moveName: string) => {
        let moveData = getCachedMove(moveName);
        if (!moveData && getMoveData) {
          moveData = await getMoveData(moveName);
        }
        return {
          name: moveName,
          type: moveData?.type || 'normal',
          category: moveData?.category || 'status',
          power: moveData?.power || null,
          accuracy: moveData?.accuracy || null,
          pp: moveData?.pp || null,
          description: moveData?.description || 'No description available'
        };
      })
    );
    setMovesData(moves);
  };
    
    fetchMovesData();
  }, [getMoveData, getCachedMove]);

  // VIEW MODE: Display static text labels
  if (!isEditing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 0.5rem' }}>
        {/* Item Display */}
        <div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Item</div>
          <div style={{ color: '#fff', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            {pokemon.showdownData?.item || 'None'}
          </div>
        </div>

        {/* Ability Display */}
        <div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Ability</div>
          <div style={{ color: '#fff', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
            {pokemon.showdownData?.ability || 'None'}
          </div>
        </div>

        {/* Moves Display */}
        <div>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>Moves</div>
          {(pokemon.showdownData?.moves || []).map((move, index) => (
            <div key={index} style={{ color: '#fff', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
              {move || 'None'}
          </div>
        ))}
        </div>
      </div>
    );
  }

  // EDIT MODE: Display clickable fields with ShowdownPopover
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
          {showdownData.item || 'No Item'}
        </div>
        {activeMenu === 'item' && (
          <ShowdownPopover
            mode="item"
            data={itemsData}
            onSelect={handleItemSelect}
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
          {showdownData.ability || 'Select Ability'}
        </div>
        {activeMenu === 'ability' && (
          <ShowdownPopover
            mode="ability"
            data={abilitiesData}
            onSelect={handleAbilitySelect}
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
              {showdownData.moves[index] || `Select Move ${index + 1}`}
            </div>
            {activeMenu === `move${index}` && (
              <ShowdownPopover
                mode="move"
                data={movesData}
                onSelect={(move) => handleMoveSelect(index, move)}
                onClose={closeMenu}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
