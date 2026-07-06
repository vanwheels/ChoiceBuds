/**
 * EditOverlays.tsx - Orchestrates ItemSpriteBox, AbilityCapsule, and MoveBubbleGrid.
 * Owns the shared selection/tooltip state; each child is presentational only.
 *
 * Hover state is lifted to a single `hoveredKey` + `hoveredRect` (the trigger's
 * own getBoundingClientRect(), captured once on hover-enter); one shared
 * <Tooltip> renders `position: fixed` next to whatever was actually hovered.
 */

import { useState, useEffect } from 'react';
import type { ImportedPokemonInfo, ItemData, MoveData, AbilityData } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { RegulationId } from '../utils/pokemonRules';
import { toReadableName } from '../utils/displayName';
import MoveBubbleGrid, { type HoverKey } from './MoveBubbleGrid';
import ItemSpriteBox from './ItemSpriteBox';
import ItemPickerPanel from './ItemPickerPanel';
import AbilityCapsule from './AbilityCapsule';
import Tooltip from './Tooltip';
import TypeBadge from './TypeBadge';

interface EditOverlaysProps {
  pokemon: ImportedPokemonInfo;
  isEditing?: boolean;
  gameDataState: UseGameDataReturn;
  rulesetId: RegulationId;
}

// Serebii.net category badge sprites (Physical path verified live via fetch;
// special/status follow the same /pokedex-dp/type/ folder + filename convention).
const MOVE_CATEGORY_BADGE: Record<string, string> = {
  physical: 'https://www.serebii.net/pokedex-dp/type/physical.png',
  special: 'https://www.serebii.net/pokedex-dp/type/special.png',
  status: 'https://www.serebii.net/pokedex-dp/type/other.png',
};

export default function EditOverlays({ pokemon, isEditing = false, gameDataState, rulesetId }: EditOverlaysProps) {
  const { items, getItemData, getAbilityData, getMoveData, getEnrichedSpeciesOptions } = gameDataState;
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
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
  const [failedBadges, setFailedBadges] = useState<Record<string, boolean>>({});
  const [abilityData, setAbilityData] = useState<AbilityData | null>(null);
  const [moveDataSlots, setMoveDataSlots] = useState<Array<MoveData | null>>([null, null, null, null]);

  const toggleMenu = (menuName: string) => setActiveMenu(activeMenu === menuName ? null : menuName);
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
    closeMenu();
  };

  const handleAbilityClick = (ability: AbilityData) => {
    setSelectedAbility(toReadableName(ability.name));
    setAbilityData(ability);
    closeMenu();
  };

  const handleMoveClick = (index: number, move: MoveData) => {
    setSelectedMoves(prev => {
      const next = [...prev];
      next[index] = toReadableName(move.name);
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
            <span className="font-bold text-white">{toReadableName(move.name)}</span>
            <TypeBadge type={move.type} />
          </div>
          <div className="flex items-center gap-1.5 text-gray-300">
            {!failedBadges[move.category] ? (
              <img
                src={MOVE_CATEGORY_BADGE[move.category]}
                alt={move.category}
                loading="lazy"
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

  // Picking an item replaces this whole region in place, starting at the
  // item box's own position (not the card's top - that's species swap's job).
  if (activeMenu === 'item') {
    return <ItemPickerPanel items={items} onSelect={handleItemClick} onClose={closeMenu} />;
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
        onToggleMenu={() => toggleMenu('item')}
      />

      {/* Ability Capsule */}
      <AbilityCapsule
        selectedAbility={selectedAbility}
        legalAbilities={legalAbilities}
        activeMenu={activeMenu}
        isEditing={isEditing}
        onHoverEnter={(e) => hoverEnter('ability', e.currentTarget.getBoundingClientRect())}
        onHoverLeave={() => hoverLeave('ability')}
        onToggleMenu={() => toggleMenu('ability')}
        onCloseMenu={closeMenu}
        onAbilitySelect={handleAbilityClick}
      />

      {/* Move Bubbles - strict 2x2 grid, identical widths, wraps long names */}
      <MoveBubbleGrid
        moveDataSlots={moveDataSlots}
        selectedMoves={selectedMoves}
        legalMoves={legalMoves}
        activeMenu={activeMenu}
        isEditing={isEditing}
        rulesetId={rulesetId}
        onToggleMenu={toggleMenu}
        onCloseMenu={closeMenu}
        onHoverEnter={hoverEnter}
        onHoverLeave={hoverLeave}
        onMoveSelect={handleMoveClick}
      />

      {/* Single shared tooltip, fixed-positioned next to whatever was actually hovered */}
      {hoveredKey && hoveredRect && <Tooltip content={renderTooltipContent()} anchorRect={hoveredRect} />}
    </div>
  );
}
