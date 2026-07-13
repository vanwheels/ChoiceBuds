/**
 * PokemonCard.tsx - Lightweight Pokemon Card Shell
 * Layout order: Nickname -> Name/Number -> Sprite -> Type Badges ->
 * Item/Ability/Moves (EditOverlays) -> EVs (StatsColumn) -> Gender/Shiny footer
 *
 * Receives `team`/`updateTeam`/`gameDataState`/`speciesRosterState`/`rosterActions`
 * as props from TeamCard rather than calling useTeams()/useGameData() itself -
 * see TeamCard.tsx for why a second hook instance here would desync from what's
 * actually on screen.
 */

import { useState } from 'react';
import type { DragEvent } from 'react';
import type { ImportedPokemonInfo, ShowdownPokemon, Team, SpeciesRosterEntry } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseSpriteCacheReturn } from '../hooks/useSpriteCache';
import type { UseRosterActionsReturn } from '../hooks/useRosterActions';
import TypeBadge from './TypeBadge';
import StatsColumn from './StatsColumn';
import EditOverlays from './EditOverlays';
import SpeciesPickerCard from './SpeciesPickerCard';
import ExportTeamModal from './ExportTeamModal';
import { isGenderless, isFemaleLocked } from '../config/pokemonRules';
import { toRegulationId } from '../utils/pokemonRules';
import { getMegaApiSlug } from '../config/megaEvolution';
import { useMegaSprite } from '../hooks/useMegaSprite';
import { getPixelSpriteUrl } from '../utils/spriteUrl';
import { TEAM_ROSTER_DRAG_TYPE, type TeamRosterDragPayload } from '../utils/teamRosterDragTypes';

interface PokemonCardProps {
  pokemon: ImportedPokemonInfo;
  team: Team;
  pokemonIndex: number;
  isEditing?: boolean;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<boolean>;
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  spriteCacheState: UseSpriteCacheReturn;
  rosterActions: UseRosterActionsReturn;
}

const FORM_DIVERGENT: Record<string, boolean> = { 'basculegion': true, 'indeedee': true, 'meowstic': true, 'oinkologne': true };

export default function PokemonCard({ pokemon, team, pokemonIndex, isEditing = false, updateTeam, gameDataState, speciesRosterState, spriteCacheState, rosterActions }: PokemonCardProps) {
  const { showdownData, types, pokedexNumber } = pokemon;
  const [isLocalShiny, setIsLocalShiny] = useState(showdownData.shiny);
  const [localGender, setLocalGender] = useState<'M' | 'F' | 'N' | '' | undefined>(showdownData.gender);
  const [localNickname, setLocalNickname] = useState(showdownData.nickname || '');
  const [isSwapPickerOpen, setIsSwapPickerOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const spriteUrl = getPixelSpriteUrl(pokedexNumber, showdownData.species, localGender || 'M', isLocalShiny);
  const rulesetId = toRegulationId(team.format);

  // Mega sprite only applies while holding this exact species' own Mega
  // Stone - see config/megaEvolution.ts for the verified stone->species map.
  const megaApiSlug = getMegaApiSlug(showdownData.item, showdownData.species);
  const megaSprite = useMegaSprite(megaApiSlug);
  const displaySpriteUrl = megaSprite ? (isLocalShiny ? megaSprite.shinySpriteUrl : megaSprite.spriteUrl) : spriteUrl;

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

  // Roster reorder via drag-and-drop - same MIME-type-payload pattern as the
  // Battle Logger roster drag (utils/dragTypes.ts) and Calc team tray drag
  // (utils/calcDragTypes.ts). teamId travels in the payload (not the type
  // string itself) since a mismatched-team drop is checked on `drop`, not
  // shown live during `dragover` - unlike those two, dragging between two
  // different teams' cards has no valid outcome to preview either way.
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
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
    <div
      data-pokemon-card
      draggable={isEditing}
      onDragStart={isEditing ? handleDragStart : undefined}
      onDragOver={isEditing ? handleDragOver : undefined}
      onDragLeave={isEditing ? () => setIsDragOver(false) : undefined}
      onDrop={isEditing ? handleDrop : undefined}
      className={`relative bg-gray-700 border rounded-lg p-3 flex flex-col gap-3 max-w-[280px] transition-colors ${
        isEditing ? 'cursor-grab' : ''
      } ${isDragOver ? 'border-blue-500 ring-2 ring-blue-400' : 'border-gray-600'}`}
    >
      {/* Left-Shifting Slot Deletion */}
      {isEditing && (
        <button
          onClick={handleDelete}
          title="Remove from roster"
          className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-gray-800 border border-gray-600 text-zinc-500 hover:text-red-400 hover:border-red-500 transition-colors cursor-pointer text-sm"
        >
          ×
        </button>
      )}

      {/* Single-Pokemon Export - same Showdown-format modal as TeamCard's whole-team
          export, just given a one-element list. Shifts left of the Delete button
          (which also lives in this corner) while editing, otherwise sits in the
          bare top-right corner. */}
      <button
        onClick={() => setIsExportOpen(true)}
        title="Export Pokémon (Showdown format)"
        className={`absolute top-2 z-10 w-6 h-6 flex items-center justify-center rounded-full bg-gray-800 border border-gray-600 text-zinc-500 hover:text-blue-400 hover:border-blue-500 transition-colors cursor-pointer text-sm ${isEditing ? 'right-9' : 'right-2'}`}
      >
        ⇩
      </button>

      {/* Nickname Input - falls back to the species name when there's no nickname set */}
      <div className="text-center">
        {isEditing ? (
          <input
            type="text"
            value={localNickname}
            onChange={(e) => setLocalNickname(e.target.value)}
            onBlur={handleNicknameBlur}
            maxLength={12}
            placeholder={showdownData.species}
            className="w-full px-2 py-1 text-sm font-bold text-white bg-gray-800 border border-gray-600 rounded text-center outline-none"
          />
        ) : (
          <h4 className="text-sm font-bold text-gray-100 truncate">{showdownData.nickname || showdownData.species}</h4>
        )}
        <p className="text-xs text-gray-300 truncate">{showdownData.species} #{pokedexNumber}</p>
      </div>

      {/* Sprite Container - clickable in edit mode to open the Roster Swap picker.
          Width matches the span from the left edge of the first Type Badge to
          the right edge of the second (134px = 64px badge + 6px gap + 64px badge),
          same target width as the Ability pill below. */}
      <div className="flex justify-center">
        <div
          onClick={isEditing ? () => setIsSwapPickerOpen(true) : undefined}
          className={`w-[134px] mx-auto h-24 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center overflow-hidden ${isEditing ? 'cursor-pointer hover:border-blue-500 transition-colors' : ''}`}
          title={isEditing ? 'Click to swap this Pokémon' : undefined}
        >
          {displaySpriteUrl ? (
            <img src={spriteCacheState.resolveSprite(displaySpriteUrl)} alt={showdownData.species} className="w-24 h-24 object-contain mx-auto transition-transform duration-150 [image-rendering:pixelated]" />
          ) : (
            <span className="text-xs text-gray-400">No sprite</span>
          )}
        </div>
      </div>

      {/* Type Badges */}
      <div className="w-full flex justify-center items-center my-1.5 px-2">
        <div className="flex flex-row items-center justify-center gap-1.5 w-full">
          {types.map((type, index) => (
            <TypeBadge key={index} type={type} />
          ))}
        </div>
      </div>

      {/* Item Sprite Box / Ability Capsule / Move Bubbles */}
      <EditOverlays pokemon={pokemon} isEditing={isEditing} gameDataState={gameDataState} rulesetId={rulesetId} onUpdatePokemon={updateShowdownData} />

      {/* EVs Grid Block */}
      <StatsColumn evs={showdownData.evs} nature={showdownData.nature} isEditing={isEditing} onUpdatePokemon={updateShowdownData} />

      {/* Footer: Gender and Shiny Indicators - each in its own item-sprite-style box, side by side */}
      <div className="flex flex-row items-center justify-center gap-3 pt-2 mt-1 border-t border-zinc-800/60 w-full">
        <div
          className={`w-14 h-14 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center overflow-hidden transition-colors ${isGenderClickable() ? 'cursor-pointer hover:border-blue-500' : 'cursor-not-allowed opacity-60'}`}
          onClick={isGenderClickable() ? handleGenderToggle : undefined}
          title={isGenderless(showdownData.species) ? 'Genderless species' : isFemaleLocked(showdownData.species) ? 'Female-only species' : 'Click to toggle gender'}
        >
          {localGender === 'M' && <span className="text-2xl font-bold text-blue-400">♂</span>}
          {localGender === 'F' && <span className="text-2xl font-bold text-pink-400">♀</span>}
          {localGender !== 'M' && localGender !== 'F' && <span className="text-2xl font-bold text-zinc-400">⌀</span>}
        </div>
        <div
          className="w-14 h-14 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-500 transition-colors"
          onClick={handleShinyToggle}
          title="Click to toggle shiny status"
        >
          <span className={isLocalShiny ? 'text-2xl select-none filter-none opacity-100' : 'text-2xl select-none grayscale opacity-30'}>✨</span>
        </div>
      </div>

      {isExportOpen && (
        <ExportTeamModal
          pokemonList={[showdownData]}
          title={`Export ${showdownData.nickname || showdownData.species}`}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </div>
  );
}
