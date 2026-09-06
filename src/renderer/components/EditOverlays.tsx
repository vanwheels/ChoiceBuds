/**
 * EditOverlays.tsx - Orchestrates ItemSpriteBox, AbilityCapsule, and MoveBubbleGrid.
 * Owns the shared selection/tooltip/picker state; each child is presentational only.
 *
 * Hover state is lifted to a single `hoveredKey` + `hoveredRect` (the trigger's
 * own getBoundingClientRect(), captured once on hover-enter) + `hoveredCardRect`
 * (the same trigger's closest `[data-pokemon-card]` ancestor, for Tooltip's
 * card-width lock - see measureDropdownHeight.ts for the same lookup pattern);
 * one shared <Tooltip> renders `position: fixed` next to whatever was actually
 * hovered.
 *
 * The active item/ability/move picker panel works the same way: `activeMenu`
 * pairs with `activeMenuAnchorRect`/`activeMenuCardRect` (captured once on
 * open, same rect lookups as the tooltip) plus the existing
 * `activeMenuMaxHeight`, and renders via FloatingCardPanel - floating over
 * this component's existing item/ability/move content instead of replacing
 * it in place (Card Popup Consistency Leg 2 - see TODO.md). Opening a picker
 * clears any open tooltip so the two floats never stack.
 */

import { useState, useEffect, useId, useMemo } from 'react';
import type { MouseEvent } from 'react';
import type { ImportedPokemonInfo, ItemData, MoveData, AbilityData, ShowdownPokemon, ChampionsUsageRankedEntry } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { RegulationId } from '../utils/pokemonRules';
import { normalizeSlug } from '../utils/pokemonRules';
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
import FloatingCardPanel from './FloatingCardPanel';

interface EditOverlaysProps {
  pokemon: ImportedPokemonInfo;
  // Narrowed to MoveBubbleGrid's drag-to-reorder affordance only (Always-On
  // Editing Leg 1, see TODO.md) - see PokemonCard.tsx's isEditing comment.
  // Item/ability/move click-to-pick below is unconditionally on regardless
  // of this prop's value.
  isEditing?: boolean;
  gameDataState: UseGameDataReturn;
  rulesetId: RegulationId;
  resolveSprite: (remoteUrl: string) => string;
  onUpdatePokemon: (updates: Partial<ShowdownPokemon>) => void;
}

export default function EditOverlays({ pokemon, isEditing = false, gameDataState, rulesetId, resolveSprite, onUpdatePokemon }: EditOverlaysProps) {
  const { items, getItemData, getAbilityData, getMoveData, getEnrichedSpeciesOptions, getChampionsUsage } = gameDataState;
  // Scopes a move-slot drag to this specific card's own MoveBubbleGrid - see moveReorderDragTypes.ts
  const moveDragOwnerId = useId();
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [activeMenuMaxHeight, setActiveMenuMaxHeight] = useState(400);
  const [activeMenuAnchorRect, setActiveMenuAnchorRect] = useState<DOMRect | null>(null);
  const [activeMenuCardRect, setActiveMenuCardRect] = useState<DOMRect | null>(null);
  const [hoveredKey, setHoveredKey] = useState<HoverKey>(null);
  const [hoveredRect, setHoveredRect] = useState<DOMRect | null>(null);
  const [hoveredCardRect, setHoveredCardRect] = useState<DOMRect | null>(null);
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
  const [moveUsage, setMoveUsage] = useState<ChampionsUsageRankedEntry[]>([]);
  const [abilityUsage, setAbilityUsage] = useState<ChampionsUsageRankedEntry[]>([]);
  const [itemData, setItemData] = useState<ItemData | null>(null);
  const [itemSpriteFailed, setItemSpriteFailed] = useState(false);
  const [itemFallbackSpriteFailed, setItemFallbackSpriteFailed] = useState(false);
  const [abilityData, setAbilityData] = useState<AbilityData | null>(null);
  const [moveDataSlots, setMoveDataSlots] = useState<Array<MoveData | null>>([null, null, null, null]);

  // Caps the panel at whatever room is left between the trigger and the
  // bottom of this PokemonCard, not a fixed height - see
  // measureDropdownHeight.ts. anchorRect/cardRect are captured the same way
  // as the tooltip's hoverEnter below, for FloatingCardPanel's card-width lock.
  const toggleMenu = (menuName: string, e: MouseEvent<HTMLElement>) => {
    if (activeMenu === menuName) {
      setActiveMenu(null);
      return;
    }
    setActiveMenuMaxHeight(measureDropdownMaxHeight(e.currentTarget));
    setActiveMenuAnchorRect(e.currentTarget.getBoundingClientRect());
    setActiveMenuCardRect(e.currentTarget.closest<HTMLElement>('[data-pokemon-card]')?.getBoundingClientRect() ?? null);
    setActiveMenu(menuName);
    setHoveredKey(null); // don't let the tooltip float over the same content as the picker
  };
  const closeMenu = () => setActiveMenu(null);

  const hoverEnter = (key: HoverKey, triggerEl: HTMLElement) => {
    setHoveredKey(key);
    setHoveredRect(triggerEl.getBoundingClientRect());
    setHoveredCardRect(triggerEl.closest<HTMLElement>('[data-pokemon-card]')?.getBoundingClientRect() ?? null);
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

  const handleMoveReorder = (fromIndex: number, toIndex: number) => {
    setSelectedMoves(prev => {
      const next = [...prev];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      onUpdatePokemon({ moves: next });
      return next;
    });
    setMoveDataSlots(prev => {
      const next = [...prev];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    });
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

  // Champions ranked-ladder usage (same source/cache as the Calc page's
  // auto-fill and the Battle Logger's "Likely Set" popover) - drives the
  // Ability/Move picker panels' most-used-first ordering and percentage
  // display below. A species with no usage data yet (never fetched, or the
  // API has nothing for it) just leaves both pickers in their existing
  // legality-derived order with no percentages shown - never blocks the
  // move/ability lists themselves.
  useEffect(() => {
    let cancelled = false;
    getChampionsUsage(pokemon.showdownData.species)
      .then(usage => {
        if (cancelled) return;
        setMoveUsage(usage?.moves ?? []);
        setAbilityUsage(usage?.abilities ?? []);
      })
      .catch(() => {
        if (!cancelled) { setMoveUsage([]); setAbilityUsage([]); }
      });
    return () => { cancelled = true; };
  }, [pokemon.showdownData.species, getChampionsUsage]);

  // Keyed by the same lowercase-hyphenated slug MoveData/AbilityData.name
  // already uses - normalizeSlug is the exact inverse of toReadableName, so
  // this lines up with the API's Title Case usage names without a live
  // round-trip check.
  const movePercentByName = useMemo(
    () => Object.fromEntries(moveUsage.map(m => [normalizeSlug(m.name), m.percentage])),
    [moveUsage]
  );
  const abilityPercentByName = useMemo(
    () => Object.fromEntries(abilityUsage.map(a => [normalizeSlug(a.name), a.percentage])),
    [abilityUsage]
  );

  // Most-used-first; anything with no usage entry (percentage undefined)
  // sorts after every ranked entry, keeping its original relative order
  // (Array.sort is stable) rather than being shuffled to a random spot.
  const sortedLegalMoves = useMemo(
    () => [...legalMoves].sort((a, b) => (movePercentByName[b.name] ?? -1) - (movePercentByName[a.name] ?? -1)),
    [legalMoves, movePercentByName]
  );
  const sortedLegalAbilities = useMemo(
    () => [...legalAbilities].sort((a, b) => (abilityPercentByName[b.name] ?? -1) - (abilityPercentByName[a.name] ?? -1)),
    [legalAbilities, abilityPercentByName]
  );

  // Resets sprite-failed flags and clears stale item data the moment
  // selectedItem changes - set during render rather than in an effect, see
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [resolvedForItem, setResolvedForItem] = useState(selectedItem);
  if (selectedItem !== resolvedForItem) {
    setResolvedForItem(selectedItem);
    setItemSpriteFailed(false);
    setItemFallbackSpriteFailed(false);
    if (!selectedItem) setItemData(null);
  }

  // Resolve full metadata (sprite/description) for whatever item is currently equipped
  useEffect(() => {
    if (!selectedItem) return;
    let cancelled = false;
    getItemData(selectedItem).then(data => { if (!cancelled) setItemData(data); });
    return () => { cancelled = true; };
  }, [selectedItem, getItemData]);

  // Clears stale ability data the moment selectedAbility changes - same render-time pattern as above
  const [resolvedForAbility, setResolvedForAbility] = useState(selectedAbility);
  if (selectedAbility !== resolvedForAbility) {
    setResolvedForAbility(selectedAbility);
    if (!selectedAbility) setAbilityData(null);
  }

  // Resolve full metadata (effect description) for whatever ability is currently equipped
  useEffect(() => {
    if (!selectedAbility) return;
    let cancelled = false;
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

  // Parsed once for the floating move picker below rather than re-parsing
  // activeMenu's "move{index}" suffix in both moveIndex and onSelect.
  const activeMoveIndex = activeMenu?.startsWith('move') ? Number(activeMenu.slice(4)) : null;

  return (
    <div className="flex flex-col items-center gap-2.5">
      {/* Item Sprite Box */}
      <ItemSpriteBox
        selectedItem={selectedItem}
        itemData={itemData}
        spriteFailed={itemSpriteFailed}
        fallbackSpriteFailed={itemFallbackSpriteFailed}
        resolveSprite={resolveSprite}
        onSpriteError={() => setItemSpriteFailed(true)}
        onFallbackSpriteError={() => setItemFallbackSpriteFailed(true)}
        onHoverEnter={(e) => hoverEnter('item', e.currentTarget)}
        onHoverLeave={() => hoverLeave('item')}
        onToggleMenu={(e) => toggleMenu('item', e)}
      />

      {/* Ability Capsule */}
      <AbilityCapsule
        selectedAbility={selectedAbility}
        onHoverEnter={(e) => hoverEnter('ability', e.currentTarget)}
        onHoverLeave={() => hoverLeave('ability')}
        onToggleMenu={(e) => toggleMenu('ability', e)}
      />

      {/* Move Bubbles - strict 2x2 grid, identical widths, wraps long names */}
      <MoveBubbleGrid
        moveDataSlots={moveDataSlots}
        selectedMoves={selectedMoves}
        isEditing={isEditing}
        ownerId={moveDragOwnerId}
        onToggleMenu={toggleMenu}
        onHoverEnter={hoverEnter}
        onHoverLeave={hoverLeave}
        onReorderMoves={handleMoveReorder}
      />

      {/* Active item/ability/move picker, floated over this region rather than replacing it - see FloatingCardPanel.tsx */}
      {activeMenu === 'item' && activeMenuAnchorRect && (
        <FloatingCardPanel anchorRect={activeMenuAnchorRect} cardRect={activeMenuCardRect}>
          <ItemPickerPanel items={items} maxHeight={activeMenuMaxHeight} resolveSprite={resolveSprite} onSelect={handleItemClick} onClose={closeMenu} />
        </FloatingCardPanel>
      )}
      {activeMenu === 'ability' && activeMenuAnchorRect && (
        <FloatingCardPanel anchorRect={activeMenuAnchorRect} cardRect={activeMenuCardRect}>
          <AbilityPickerPanel
            abilities={sortedLegalAbilities}
            usagePercentByName={abilityPercentByName}
            maxHeight={activeMenuMaxHeight}
            onSelect={handleAbilityClick}
            onClose={closeMenu}
          />
        </FloatingCardPanel>
      )}
      {activeMoveIndex !== null && activeMenuAnchorRect && (
        <FloatingCardPanel anchorRect={activeMenuAnchorRect} cardRect={activeMenuCardRect}>
          <MovePickerPanel
            moveIndex={activeMoveIndex}
            moves={sortedLegalMoves}
            usagePercentByName={movePercentByName}
            rulesetId={rulesetId}
            maxHeight={activeMenuMaxHeight}
            onSelect={(move) => handleMoveClick(activeMoveIndex, move)}
            onClose={closeMenu}
          />
        </FloatingCardPanel>
      )}

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
          cardRect={hoveredCardRect}
        />
      )}
    </div>
  );
}
