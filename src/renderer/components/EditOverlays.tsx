/**
 * EditOverlays.tsx - Item Sprite Box, Ability Capsule, and Move Bubble Renderer
 * Displays the equipped item/ability/moves as themed, tooltip-driven UI in both
 * view and edit mode. In edit mode, each element opens a ShowdownPopover selector
 * backed by the species' real legal item/ability/move pool from useGameData.
 *
 * Hover state for tooltips is lifted to a single `hoveredKey`, and only one
 * shared <Tooltip> is rendered (as a direct child of this component's root,
 * not nested inside any of the per-element `relative` wrappers used for the
 * ShowdownPopover). That lets it escape straight up to PokemonCard's `relative`
 * root and render at the card's exact width, instead of being sized/positioned
 * off whichever small element was hovered.
 */

import { useState, useEffect } from 'react';
import type { ImportedPokemonInfo, ItemData, MoveData, AbilityData } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import { ShowdownPopover } from './ShowdownPopover';
import MoveBubbleGrid, { type HoverKey } from './MoveBubbleGrid';
import ItemSpriteBox from './ItemSpriteBox';
import Tooltip from './Tooltip';
import TypeBadge from './TypeBadge';

interface EditOverlaysProps {
  pokemon: ImportedPokemonInfo;
  isEditing?: boolean;
  gameDataState: UseGameDataReturn;
}

// Serebii.net category badge sprites (Physical path verified live via fetch;
// special/status follow the same /pokedex-dp/type/ folder + filename convention).
const MOVE_CATEGORY_BADGE: Record<string, string> = {
  physical: 'https://www.serebii.net/pokedex-dp/type/physical.png',
  special: 'https://www.serebii.net/pokedex-dp/type/special.png',
  status: 'https://www.serebii.net/pokedex-dp/type/other.png',
};

export default function EditOverlays({ pokemon, isEditing = false, gameDataState }: EditOverlaysProps) {
  const { items, getItemData, getAbilityData, getMoveData, getEnrichedSpeciesOptions } = gameDataState;
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [hoveredKey, setHoveredKey] = useState<HoverKey>(null);
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
  const [itemData, setItemData] = useState<ItemData | null>(null);
  const [itemSpriteFailed, setItemSpriteFailed] = useState(false);
  const [itemFallbackSpriteFailed, setItemFallbackSpriteFailed] = useState(false);
  const [failedBadges, setFailedBadges] = useState<Record<string, boolean>>({});
  const [abilityData, setAbilityData] = useState<AbilityData | null>(null);
  const [moveDataSlots, setMoveDataSlots] = useState<Array<MoveData | null>>([null, null, null, null]);

  const toggleMenu = (menuName: string) => setActiveMenu(activeMenu === menuName ? null : menuName);
  const closeMenu = () => setActiveMenu(null);

  const hoverEnter = (key: HoverKey) => setHoveredKey(key);
  const hoverLeave = (key: HoverKey) => setHoveredKey(prev => (prev === key ? null : prev));

  const handleItemClick = (item: ItemData) => {
    setSelectedItem(item.name);
    setItemData(item);
    closeMenu();
  };

  const handleAbilityClick = (ability: AbilityData) => {
    setSelectedAbility(ability.name);
    setAbilityData(ability);
    closeMenu();
  };

  const handleMoveClick = (index: number, move: MoveData) => {
    setSelectedMoves(prev => {
      const next = [...prev];
      next[index] = move.name;
      return next;
    });
    setMoveDataSlots(prev => {
      const next = [...prev];
      next[index] = move;
      return next;
    });
    closeMenu();
  };

  // Real legal movepool + ability pool for this species (never a per-Pokemon fallback)
  useEffect(() => {
    let cancelled = false;
    getEnrichedSpeciesOptions(pokemon.showdownData.species, pokemon.showdownData.gender)
      .then(({ moves, abilities }) => {
        if (cancelled) return;
        setLegalMoves(moves);
        setLegalAbilities(abilities);
      })
      .catch(() => {
        if (!cancelled) console.warn(`No learnset data available for species: ${pokemon.showdownData.species}`);
      });
    return () => { cancelled = true; };
  }, [pokemon.showdownData.species, pokemon.showdownData.gender, getEnrichedSpeciesOptions]);

  // Resolve full metadata (sprite/description) for whatever item is currently equipped
  useEffect(() => {
    let cancelled = false;
    setItemSpriteFailed(false);
    setItemFallbackSpriteFailed(false);
    if (!selectedItem) {
      setItemData(null);
      return;
    }
    getItemData(selectedItem).then(data => { if (!cancelled) setItemData(data); });
    return () => { cancelled = true; };
  }, [selectedItem, getItemData]);

  // Resolve full metadata (effect description) for whatever ability is currently equipped
  useEffect(() => {
    let cancelled = false;
    if (!selectedAbility) {
      setAbilityData(null);
      return;
    }
    getAbilityData(selectedAbility).then(data => { if (!cancelled) setAbilityData(data); });
    return () => { cancelled = true; };
  }, [selectedAbility, getAbilityData]);

  // Resolve full metadata (type/category/power/pp/accuracy/description) for the 4 equipped moves
  useEffect(() => {
    let cancelled = false;
    Promise.all(selectedMoves.map(name => (name ? getMoveData(name) : Promise.resolve(null))))
      .then(results => { if (!cancelled) setMoveDataSlots(results); });
    return () => { cancelled = true; };
  }, [selectedMoves, getMoveData]);

  const renderTooltipContent = () => {
    if (hoveredKey === 'item') {
      return (
        <>
          <div className="font-bold text-white mb-1">{selectedItem || 'No Item'}</div>
          {selectedItem && <div className="text-gray-300">{itemData?.description || 'Loading…'}</div>}
        </>
      );
    }
    if (hoveredKey === 'ability') {
      return (
        <>
          <div className="font-bold text-white mb-1">{selectedAbility || 'No Ability'}</div>
          {selectedAbility && <div className="text-gray-300">{abilityData?.description || 'Loading…'}</div>}
        </>
      );
    }
    if (hoveredKey?.startsWith('move')) {
      const index = Number(hoveredKey.slice(4));
      const move = moveDataSlots[index];
      if (!move) {
        return <div className="text-gray-400">{selectedMoves[index] || 'No move selected'}</div>;
      }
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">{move.name}</span>
            <TypeBadge type={move.type} />
          </div>
          <div className="flex items-center gap-1.5 text-gray-300">
            {!failedBadges[move.category] ? (
              <img
                src={MOVE_CATEGORY_BADGE[move.category]}
                alt={move.category}
                className="h-4 w-auto"
                onError={() => setFailedBadges(prev => ({ ...prev, [move.category]: true }))}
              />
            ) : null}
            <span className="capitalize">{move.category}</span> · PP {move.pp} · Pow {move.power ?? '—'} · Acc {move.accuracy != null ? `${move.accuracy}%` : '--'}
          </div>
          <div className="text-gray-400">{move.description}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col items-center gap-2.5">
      {/* Item Sprite Box */}
      <ItemSpriteBox
        selectedItem={selectedItem}
        itemData={itemData}
        items={items}
        activeMenu={activeMenu}
        isEditing={isEditing}
        spriteFailed={itemSpriteFailed}
        fallbackSpriteFailed={itemFallbackSpriteFailed}
        onSpriteError={() => setItemSpriteFailed(true)}
        onFallbackSpriteError={() => setItemFallbackSpriteFailed(true)}
        onHoverEnter={() => hoverEnter('item')}
        onHoverLeave={() => hoverLeave('item')}
        onToggleMenu={() => toggleMenu('item')}
        onCloseMenu={closeMenu}
        onItemSelect={handleItemClick}
      />

      {/* Ability Capsule */}
      <div className="relative">
        <div
          onMouseEnter={() => hoverEnter('ability')}
          onMouseLeave={() => hoverLeave('ability')}
          onClick={isEditing ? () => toggleMenu('ability') : undefined}
          className={`px-4 py-1.5 rounded-full border bg-gray-800 text-xs font-semibold text-white truncate max-w-[180px] transition-colors ${isEditing ? 'cursor-pointer hover:border-blue-500' : ''}`}
          style={{ borderColor: activeMenu === 'ability' ? '#3b82f6' : '#4b5563' }}
        >
          {selectedAbility || 'Select Ability'}
        </div>
        {activeMenu === 'ability' && (
          <ShowdownPopover mode="ability" data={legalAbilities} onSelect={handleAbilityClick} onClose={closeMenu} />
        )}
      </div>

      {/* Move Bubbles - strict 2x2 grid, identical widths, wraps long names */}
      <MoveBubbleGrid
        moveDataSlots={moveDataSlots}
        selectedMoves={selectedMoves}
        legalMoves={legalMoves}
        activeMenu={activeMenu}
        isEditing={isEditing}
        onToggleMenu={toggleMenu}
        onCloseMenu={closeMenu}
        onHoverEnter={hoverEnter}
        onHoverLeave={hoverLeave}
        onMoveSelect={handleMoveClick}
      />

      {/* Single shared tooltip, anchored to PokemonCard's `relative` root - not to whatever tiny element is hovered */}
      {hoveredKey && <Tooltip content={renderTooltipContent()} />}
    </div>
  );
}
