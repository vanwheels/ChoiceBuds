/**
 * PokemonCard.tsx - Lightweight Pokemon Card Shell
 * Layout order: Nickname -> Name/Number -> Sprite (with Gender/Shiny corner
 * badges) -> Type Badges -> Item/Ability/Moves (EditOverlays) -> EVs (StatsColumn)
 *
 * Receives `team`/`updateTeam`/`gameDataState`/`speciesRosterState`/`rosterActions`
 * as props from TeamCard rather than calling useTeams()/useGameData() itself -
 * see TeamCard.tsx for why a second hook instance here would desync from what's
 * actually on screen.
 */

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { CSSProperties, DragEvent, MouseEvent as ReactMouseEvent } from 'react';
import type { ImportedPokemonInfo, ShowdownPokemon, Team, SpeciesRosterEntry } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseRosterActionsReturn } from '../hooks/useRosterActions';
import { getTypeGlowColors } from '../config/pokemonTheme';
import TypeBadge from './TypeBadge';
import StatsColumn from './StatsColumn';
import EditOverlays from './EditOverlays';
import SpeciesPickerCard from './SpeciesPickerCard';
import ExportTeamModal from './ExportTeamModal';
import ContextMenu from './ContextMenu';
import { isGenderless, isFemaleLocked } from '../config/pokemonRules';
import { toRegulationId } from '../utils/pokemonRules';
import { getMegaApiSlug } from '../config/megaEvolution';
import { useMegaSprite } from '../hooks/useMegaSprite';
import { getPixelSpriteUrl, getAnimatedSpriteUrl } from '../utils/spriteUrl';
import { getTotalSP, MAX_TOTAL_SP } from '../utils/evTotal';
import { TEAM_ROSTER_DRAG_TYPE, type TeamRosterDragPayload } from '../utils/teamRosterDragTypes';
import { DRAG_REORDER_TRANSITION } from '../config/motion';

interface PokemonCardProps {
  pokemon: ImportedPokemonInfo;
  team: Team;
  pokemonIndex: number;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<boolean>;
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  rosterActions: UseRosterActionsReturn;
  showAnimatedSprites: boolean;
}

const FORM_DIVERGENT: Record<string, boolean> = { 'basculegion': true, 'indeedee': true, 'meowstic': true, 'oinkologne': true };

export default function PokemonCard({ pokemon, team, pokemonIndex, updateTeam, gameDataState, speciesRosterState, spriteCacheState, rosterActions, showAnimatedSprites }: PokemonCardProps) {
  const { showdownData, types, pokedexNumber } = pokemon;
  const [isLocalShiny, setIsLocalShiny] = useState(showdownData.shiny);
  const [localGender, setLocalGender] = useState<'M' | 'F' | 'N' | '' | undefined>(showdownData.gender);
  const [localNickname, setLocalNickname] = useState(showdownData.nickname || '');
  const [isSwapPickerOpen, setIsSwapPickerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  // Export moved out of the corner into a right-click context menu (Card
  // Action Button Placement Leg 1, see TODO.md) - null when closed, the
  // click's own coordinates (not the card's rect) while open, since
  // ContextMenu positions itself at literal click coordinates.
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  // Tracks the specific animated URL that last failed to load, not just a
  // bare "give up" flag - so a subsequent gender/shiny/Mega-state change
  // (which produces a different candidate URL) gets a fresh chance rather
  // than being stuck on the static fallback for the rest of this card's
  // lifetime.
  const [failedAnimatedUrl, setFailedAnimatedUrl] = useState<string | null>(null);
  const spriteUrl = getPixelSpriteUrl(pokedexNumber, showdownData.species, localGender || 'M', isLocalShiny);
  const rulesetId = toRegulationId(team.format);
  // Over-cap SP warning (Speed Tiers Save Override: Over-Cap SP Warning, see
  // TODO.md) - a Speed Tiers Preview Strip save only sees Speed's SP in
  // isolation, so it can legitimately push this total over the 66 cap that
  // StatsColumn.tsx's own live editing gates against. Not a rewire of that
  // gate; StatsColumn already shows its own totalEVs/66 pill down in the EV
  // grid, but that's only visible once you're already looking at the EVs -
  // this header-level badge surfaces the same overage where a quick scan of
  // the expanded card actually looks first.
  const totalSP = getTotalSP(showdownData.evs);
  const isOverSPCap = totalSP > MAX_TOTAL_SP;
  const [glowC1, glowC2] = getTypeGlowColors(types);
  const glowRingStyle = { '--glow-c1': glowC1, '--glow-c2': glowC2 } as CSSProperties;

  // Mega sprite only applies while holding this exact species' own Mega
  // Stone - see config/megaEvolution.ts for the verified stone->species map.
  const megaApiSlug = getMegaApiSlug(showdownData.item, showdownData.species);
  const megaSprite = useMegaSprite(megaApiSlug);
  const staticSpriteUrl = megaSprite ? (isLocalShiny ? megaSprite.shinySpriteUrl : megaSprite.spriteUrl) : spriteUrl;

  // Showdown's sprite roster can lag official reveals (a newly-added Mega,
  // in particular) - onError below records this exact URL as failed so the
  // card degrades to the static PNG instead of a broken image.
  const animatedCandidateUrl = showAnimatedSprites
    ? getAnimatedSpriteUrl(megaApiSlug || showdownData.species, localGender || 'M', isLocalShiny)
    : null;
  const useAnimated = animatedCandidateUrl !== null && animatedCandidateUrl !== failedAnimatedUrl;
  const displaySpriteUrl = useAnimated ? animatedCandidateUrl : staticSpriteUrl;

  // Item/ability/move/EV edits commit immediately through this, same
  // "write on every mutation" convention gender/shiny toggling already uses.
  const updateShowdownData = async (updates: Partial<ShowdownPokemon>): Promise<boolean> => {
    const updatedPokemon = [...team.pokemon];
    updatedPokemon[pokemonIndex] = {
      ...updatedPokemon[pokemonIndex],
      showdownData: { ...updatedPokemon[pokemonIndex].showdownData, ...updates },
    };
    return updateTeam(team.id, { pokemon: updatedPokemon });
  };

  const handleNicknameBlur = async () => {
    if (localNickname !== (showdownData.nickname || '')) {
      await updateShowdownData({ nickname: localNickname });
    }
  };

  const handleGenderToggle = async () => {
    const species = showdownData.species;
    if (species.toLowerCase().includes('basculegion')) return;
    if (isGenderless(species) || isFemaleLocked(species)) return;
    const currentGender = localGender || 'M';
    const newGender = currentGender === 'M' ? 'F' : 'M';
    setLocalGender(newGender);
    const updatedPokemon = [...team.pokemon];
    updatedPokemon[pokemonIndex] = {
      ...updatedPokemon[pokemonIndex],
      showdownData: { ...updatedPokemon[pokemonIndex].showdownData, gender: newGender },
    };
    const speciesLower = species.toLowerCase();
    const baseSpecies = speciesLower.split('-')[0];
    if (FORM_DIVERGENT[baseSpecies]) {
      const currentSpriteUrl = updatedPokemon[pokemonIndex].spriteUrl;
      let newSpriteUrl = currentSpriteUrl;
      if (newGender === 'F') {
        if (!currentSpriteUrl.includes('-female')) newSpriteUrl = currentSpriteUrl.replace(/\/(\d+)\.png$/, '/$1-female.png');
      } else {
        newSpriteUrl = currentSpriteUrl.replace(/-female\.png$/, '.png');
      }
      updatedPokemon[pokemonIndex].spriteUrl = newSpriteUrl;
    }
    await updateTeam(team.id, { pokemon: updatedPokemon });
  };

  const handleShinyToggle = async () => {
    const newShinyState = !isLocalShiny;
    setIsLocalShiny(newShinyState);
    const updatedPokemon = [...team.pokemon];
    updatedPokemon[pokemonIndex] = {
      ...updatedPokemon[pokemonIndex],
      showdownData: { ...updatedPokemon[pokemonIndex].showdownData, shiny: newShinyState },
    };
    await updateTeam(team.id, { pokemon: updatedPokemon });
  };

  const handleSwapSelect = async (species: SpeciesRosterEntry) => {
    setIsSwapPickerOpen(false);
    await rosterActions.swapSlot(team, pokemonIndex, species.name);
  };

  const handleDelete = async () => {
    await rosterActions.removeSlot(team, pokemonIndex);
  };

  // Right-click opens the Export context menu instead of the OS/browser's
  // native one (Card Action Button Placement Leg 1, see TODO.md).
  const handleContextMenu = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  // Roster reorder via drag-and-drop (Always-On Editing Leg 2, see TODO.md) -
  // draggable now lives on the whole card div below rather than a dedicated
  // grip-handle icon (Pokémon Card Drag Without Handle Leg 1, see TODO.md).
  // The prior whole-card attempt was reverted for click/drag ambiguity, but
  // the actual cause wasn't HTML5's own click-vs-drag disambiguation (that
  // already works cleanly for MoveBubbleGrid.tsx's move-bubble drag, which
  // is simultaneously a click target and a drag source) - it was `draggable`
  // on a container with no exclusion logic for its natively-draggable/
  // text-selectable descendants. Bailing out here when the drag actually
  // started on an input/button/[data-no-drag] element is what fixes that:
  // nickname input and the delete button are native `input`/`button`
  // elements already covered by the selector; the sprite/swap box and
  // gender/shiny corner badges and EditOverlays' item/ability pills carry
  // `data-no-drag` explicitly. Same MIME-type-payload pattern as the Battle
  // Logger roster drag (utils/dragTypes.ts) and Calc team tray drag
  // (utils/calcDragTypes.ts). teamId travels in the payload (not the type
  // string itself) since a mismatched-team drop is checked on `drop`, not
  // shown live during `dragover` - unlike those two, dragging between two
  // different teams' cards has no valid outcome to preview either way.
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('input, button, [data-no-drag]')) {
      e.preventDefault();
      return;
    }
    const payload: TeamRosterDragPayload = { teamId: team.id, fromIndex: pokemonIndex };
    e.dataTransfer.setData(TEAM_ROSTER_DRAG_TYPE, JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!e.dataTransfer.types.includes(TEAM_ROSTER_DRAG_TYPE)) return;
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const raw = e.dataTransfer.getData(TEAM_ROSTER_DRAG_TYPE);
    if (!raw) return;
    try {
      const payload: TeamRosterDragPayload = JSON.parse(raw);
      if (payload.teamId === team.id && payload.fromIndex !== pokemonIndex) {
        rosterActions.reorderSlot(team, payload.fromIndex, pokemonIndex);
      }
    } catch {
      // malformed/foreign drag payload - ignore
    }
  };

  const isGenderClickable = (): boolean => {
    const species = showdownData.species;
    const speciesLower = species.toLowerCase();
    if (speciesLower.includes('basculegion') || speciesLower.includes('indeedee') || speciesLower.includes('meowstic') || speciesLower.includes('oinkologne')) return false;
    return !isGenderless(species) && !isFemaleLocked(species);
  };

  // Roster Swap fills this slot with an in-card species picker rather than
  // floating a dropdown under the sprite - see SpeciesPickerCard.tsx
  if (isSwapPickerOpen) {
    return (
      <SpeciesPickerCard
        roster={speciesRosterState.roster}
        rulesetId={rulesetId}
        resolveSprite={spriteCacheState.resolveSprite}
        onSelect={handleSwapSelect}
        onClose={() => setIsSwapPickerOpen(false)}
      />
    );
  }

  return (
    // Outer ring wraps the actual card in a soft per-type colored glow (see
    // config/pokemonTheme.ts::getTypeGlowColors + index.css's .type-glow-ring) -
    // a dual-type Pokemon blends both type colors via one shared gradient.
    // This replaces the card's own flat border; the inner card below carries
    // no border of its own, only its background/radius/padding.
    // layout="position" (leg 4, see TODO.md): animates this card sliding to its
    // new grid slot when reorderSlot changes roster order (position delta only -
    // NOT plain `layout`, which would also try to FLIP-animate this card's own
    // size if its content ever changes height).
    <motion.div layout="position" transition={DRAG_REORDER_TRANSITION} className="type-glow-ring max-w-[280px] min-w-0" style={glowRingStyle}>
      <div
        data-pokemon-card
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onContextMenu={handleContextMenu}
        className={`relative bg-zinc-700 rounded-[11px] p-3 flex flex-col gap-3 min-w-0 transition-colors cursor-grab ${isDragOver ? 'ring-2 ring-accent-gold' : ''}`}
      >
        {/* Left-Shifting Slot Deletion - permanently on (Always-On Editing Leg 2,
            see TODO.md). Centered on the card's top-right corner with a negative
            offset (Card Action Button Placement Leg 1, see TODO.md) - sits outside
            the card's rounded border rather than inset from it, now that Export
            (below) has moved out of this corner entirely and left it free. */}
        <button
          onClick={handleDelete}
          title="Remove from roster"
          className="absolute -top-2.5 -right-2.5 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-600 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors cursor-pointer text-sm"
        >
          ×
        </button>

        {/* Nickname Input - permanently editable (Always-On Editing Leg 1, see
            TODO.md), no more isEditing gate. Falls back to the species name
            as the placeholder when there's no nickname set. */}
        <div className="text-center">
          <input
            type="text"
            value={localNickname}
            onChange={(e) => setLocalNickname(e.target.value)}
            onBlur={handleNicknameBlur}
            maxLength={12}
            placeholder={showdownData.species}
            className="w-full px-2 py-1 text-sm font-bold text-white bg-zinc-800 border border-zinc-600 rounded text-center outline-none"
          />
          <p className="text-xs text-zinc-300 truncate">{showdownData.species} #{pokedexNumber}</p>
          {isOverSPCap && (
            <span
              title={`Total SP (${totalSP}) exceeds the ${MAX_TOTAL_SP} cap`}
              className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white border border-red-400"
            >
              ⚠ {totalSP}/{MAX_TOTAL_SP}
            </span>
          )}
        </div>

        {/* Sprite Container - clickable to open the Roster Swap picker, permanently
            on (Always-On Editing Leg 2, see TODO.md). Width matches the span from
            the left edge of the first Type Badge to the right edge of the second
            (134px = 64px badge + 6px gap + 64px badge), same target width as the
            Ability pill below. */}
        <div className="flex justify-center">
          <div
            data-no-drag
            onClick={() => setIsSwapPickerOpen(true)}
            className="relative w-[134px] mx-auto h-24 bg-zinc-800 rounded-lg border border-zinc-600 flex items-center justify-center overflow-hidden cursor-pointer hover:border-accent-gold transition-colors"
            title="Click to swap this Pokémon"
          >
            {displaySpriteUrl ? (
              <img
                src={spriteCacheState.resolveSprite(displaySpriteUrl)}
                alt={showdownData.species}
                draggable={false}
                onError={useAnimated ? () => setFailedAnimatedUrl(animatedCandidateUrl) : undefined}
                className={`w-24 h-24 object-contain mx-auto transition-transform duration-150 ${useAnimated ? '' : '[image-rendering:pixelated]'}`}
              />
            ) : (
              <span className="text-xs text-zinc-400">No sprite</span>
            )}

            {/* Gender/Shiny corner badges (Sprite Corner Badges Leg 1, see TODO.md) -
                replaces the old footer row below the card. Each is a ~34px padded
                hit zone (invisible by default) wrapping a ~22px visual icon, matching
                the drag-handle/delete-button icon scale elsewhere on this card.
                stopPropagation keeps a badge click from also bubbling into this
                sprite box's own onClick (which would re-open the swap picker). */}
            <div
              data-no-drag
              className={`group absolute top-0.5 left-0.5 z-10 w-[34px] h-[34px] flex items-center justify-center ${isGenderClickable() ? 'cursor-pointer' : 'cursor-not-allowed'}`}
              onClick={(e) => {
                e.stopPropagation();
                if (isGenderClickable()) handleGenderToggle();
              }}
              title={isGenderless(showdownData.species) ? 'Genderless species' : isFemaleLocked(showdownData.species) ? 'Female-only species' : 'Click to toggle gender'}
            >
              <div className={`w-[22px] h-[22px] flex items-center justify-center rounded-md border border-transparent transition-colors ${isGenderClickable() ? 'group-hover:bg-zinc-900/55 group-hover:border-zinc-600/60' : 'opacity-60'}`}>
                {localGender === 'M' && <span className="text-sm font-bold text-blue-400">♂</span>}
                {localGender === 'F' && <span className="text-sm font-bold text-pink-400">♀</span>}
                {localGender !== 'M' && localGender !== 'F' && <span className="text-sm font-bold text-zinc-400">⌀</span>}
              </div>
            </div>
            <div
              data-no-drag
              className="group absolute top-0.5 right-0.5 z-10 w-[34px] h-[34px] flex items-center justify-center cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleShinyToggle();
              }}
              title="Click to toggle shiny status"
            >
              <div className="w-[22px] h-[22px] flex items-center justify-center rounded-md border border-transparent transition-colors group-hover:bg-zinc-900/55 group-hover:border-zinc-600/60">
                <span className={isLocalShiny ? 'text-sm select-none filter-none opacity-100' : 'text-sm select-none grayscale opacity-30'}>✨</span>
              </div>
            </div>
          </div>
        </div>

        {/* Type Badges - min-w-0 on the outer row lets it shrink with the card
            (Card Content Overflow at Mid Widths Leg 1, see TODO.md); flex-wrap
            on the inner row is the actual overflow guard, since TypeBadge's
            fixed w-20/shrink-0 badges (deliberately not truncated - "GRASS"
            clipped to "GRA" reads worse than wrapping) don't shrink to fit a
            track narrower than their combined width. */}
        <div className="w-full flex justify-center items-center my-1.5 px-2 min-w-0">
          <div className="flex flex-row flex-wrap items-center justify-center gap-1.5 w-full">
            {types.map((type, index) => (
              <TypeBadge key={index} type={type} />
            ))}
          </div>
        </div>

        {/* Item Sprite Box / Ability Capsule / Move Bubbles - clicking to pick is
            permanently on (Always-On Editing Leg 1, see TODO.md), and so is
            MoveBubbleGrid's move-slot drag-to-reorder (Move-Slot Drag Handle
            Leg 1, see TODO.md) - a move bubble is simultaneously the click
            target that opens its picker and the drag source, disambiguated
            natively since HTML5 only fires dragstart after real pointer
            movement and suppresses click when a drag actually occurred. */}
        <EditOverlays pokemon={pokemon} gameDataState={gameDataState} rulesetId={rulesetId} resolveSprite={spriteCacheState.resolveSprite} onUpdatePokemon={updateShowdownData} />

        {/* EVs Grid Block - permanently editable (Always-On Editing Leg 1, see TODO.md) */}
        <StatsColumn evs={showdownData.evs} nature={showdownData.nature} onUpdatePokemon={updateShowdownData} />

        <AnimatePresence>
          {isExportOpen && (
            <ExportTeamModal
              pokemonList={[showdownData]}
              title={`Export ${showdownData.nickname || showdownData.species}`}
              pasteTitle={showdownData.nickname || showdownData.species}
              onClose={() => setIsExportOpen(false)}
            />
          )}
        </AnimatePresence>

        {contextMenuPos && (
          <ContextMenu
            x={contextMenuPos.x}
            y={contextMenuPos.y}
            onClose={() => setContextMenuPos(null)}
            items={[
              {
                label: 'Export',
                onClick: () => setIsExportOpen(true),
                icon: (
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v12" />
                    <path d="m7 10 5 5 5-5" />
                    <path d="M5 21h14" />
                  </svg>
                ),
              },
            ]}
          />
        )}
      </div>
    </motion.div>
  );
}
