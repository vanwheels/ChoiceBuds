/**
 * EditOverlays.tsx - Orchestrates ItemSpriteBox, AbilityCapsule, and MoveBubbleGrid.
 * Owns the shared selection/tooltip state; each child is presentational only.
 *
 * Hover state is lifted to a single `hoveredKey` + `hoveredRect` (the trigger's
 * own getBoundingClientRect(), captured once on hover-enter); one shared
 * <Tooltip> renders `position: fixed` next to whatever was actually hovered.
 */

import { useState, useEffect } from 'react';
import type { MouseEvent } from 'react';
import type { ImportedPokemonInfo, ItemData, MoveData, AbilityData, ShowdownPokemon } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { RegulationId } from '../utils/pokemonRules';
import { toReadableName } from '../utils/displayName';
import { measureDropdownMaxHeight } from '../utils/measureDropdownHeight';
import MoveBubbleGrid, { type HoverKey } from './MoveBubbleGrid';
import ItemSpriteBox from './ItemSpriteBox';
import ItemPickerPanel from './ItemPickerPanel';
import AbilityCapsule from './AbilityCapsule';
import AbilityPickerPanel from './AbilityPickerPanel';
import MovePickerPanel from './MovePickerPanel';
import Tooltip from './Tooltip';
import TooltipContent from './TooltipContent';

interface EditOverlaysProps {
  pokemon: ImportedPokemonInfo;
  isEditing?: boolean;
  gameDataState: UseGameDataReturn;
  rulesetId: RegulationId;
  onUpdatePokemon: (updates: Partial<ShowdownPokemon>) => void;
}

export default function EditOverlays({ pokemon, isEditing = false, gameDataState, rulesetId, onUpdatePokemon }: EditOverlaysProps) {
  const { items, getItemData, getAbilityData, getMoveData, getEnrichedSpeciesOptions } = gameDataState;
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeMenuMaxHeight, setActiveMenuMaxHeight] = useState(400);
  const [hoveredKey, setHoveredKey] = useState<HoverKey>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
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
  const [abilityData, setAbilityData] = useState<AbilityData | null>(null);
  const [moveDataSlots, setMoveDataSlots] = useState<Array<MoveData | null>>([null, null, null, null]);

  // Caps the dropdown/panel at whatever room is left between the trigger and
  // the bottom of this PokemonCard, not a fixed height - see measureDropdownHeight.ts
  const toggleMenu = (menuName: string, e: MouseEvent<HTMLElement>) => {
    if (activeMenu === menuName) {
      setActiveMenu(null);
      return;
    }
    setActiveMenuMaxHeight(measureDropdownMaxHeight(e.currentTarget));
    setActiveMenu(menuName);
  };
  const closeMenu = () => setActiveMenu(null);

  const hoverEnter = (key: HoverKey, rect: DOMRect) => {
    setHoveredKey(key);
    setHoveredRect(rect);
  };
  const hoverLeave = (key: HoverKey) => setHoveredKey(prev => (prev === key ? null : prev));

  const handleItemClick = (item: ItemData) => {
    // Store the readable form ("Fairy Feather"), not the raw API slug
    // ("fairy-feather") - keeps display text/tooltips readable and keeps
    // exact-match checks (e.g. the Fairy Feather sprite fallback) working
    // regardless of whether the item came from pasted Showdown text or a
    // picker selection. normalizeNameForAPI still re-derives the correct
    // slug from this when re-fetching, so nothing downstream breaks.
    setSelectedItem(toReadableName(item.name));
    setItemData(item);
    onUpdatePokemon({ item: toReadableName(item.name) });
    closeMenu();
  };

  const handleAbilityClick = (ability: AbilityData) => {
    setSelectedAbility(toReadableName(ability.name));
    setAbilityData(ability);
    onUpdatePokemon({ ability: toReadableName(ability.name) });
    closeMenu();
  };

  const handleMoveClick = (index: number, move: MoveData) => {
    setSelectedMoves(prev => {
      const next = [...prev];
      next[index] = toReadableName(move.name);
      onUpdatePokemon({ moves: next });
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

  // Picking an item/ability/move replaces this whole region in place (not
  // the card's top - that's species swap's job), so the picker always sits
  // solely inside the PokemonCard's own width instead of floating past it.
  if (activeMenu === 'item') {
    return <ItemPickerPanel items={items} maxHeight={activeMenuMaxHeight} onSelect={handleItemClick} onClose={closeMenu} />;
  }
  if (activeMenu === 'ability') {
    return <AbilityPickerPanel abilities={legalAbilities} maxHeight={activeMenuMaxHeight} onSelect={handleAbilityClick} onClose={closeMenu} />;
  }
  if (activeMenu?.startsWith('move')) {
    const moveIndex = Number(activeMenu.slice(4));
    return (
      <MovePickerPanel
        moveIndex={moveIndex}
        moves={legalMoves}
        rulesetId={rulesetId}
        maxHeight={activeMenuMaxHeight}
        onSelect={(move) => handleMoveClick(moveIndex, move)}
        onClose={closeMenu}
      />
    );
  }

  return (
    <div className="flex flex-col items-center gap-2.5">
      {/* Item Sprite Box */}
      <ItemSpriteBox
        selectedItem={selectedItem}
        itemData={itemData}
        isEditing={isEditing}
        spriteFailed={itemSpriteFailed}
        fallbackSpriteFailed={itemFallbackSpriteFailed}
        onSpriteError={() => setItemSpriteFailed(true)}
        onFallbackSpriteError={() => setItemFallbackSpriteFailed(true)}
        onHoverEnter={(e) => hoverEnter('item', e.currentTarget.getBoundingClientRect())}
        onHoverLeave={() => hoverLeave('item')}
        onToggleMenu={(e) => toggleMenu('item', e)}
      />

      {/* Ability Capsule */}
      <AbilityCapsule
        selectedAbility={selectedAbility}
        isEditing={isEditing}
        onHoverEnter={(e) => hoverEnter('ability', e.currentTarget.getBoundingClientRect())}
        onHoverLeave={() => hoverLeave('ability')}
        onToggleMenu={(e) => toggleMenu('ability', e)}
      />

      {/* Move Bubbles - strict 2x2 grid, identical widths, wraps long names */}
      <MoveBubbleGrid
        moveDataSlots={moveDataSlots}
        selectedMoves={selectedMoves}
        isEditing={isEditing}
        onToggleMenu={toggleMenu}
        onHoverEnter={hoverEnter}
        onHoverLeave={hoverLeave}
      />

      {/* Single shared tooltip, fixed-positioned next to whatever was actually hovered */}
      {hoveredKey && hoveredRect && (
        <Tooltip
          content={
            <TooltipContent
              hoveredKey={hoveredKey}
              selectedItem={selectedItem}
              itemData={itemData}
              selectedAbility={selectedAbility}
              abilityData={abilityData}
              selectedMoves={selectedMoves}
              moveDataSlots={moveDataSlots}
            />
          }
          anchorRect={hoveredRect}
        />
      )}
    </div>
  );
}
