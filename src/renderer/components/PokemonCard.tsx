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
import type { ImportedPokemonInfo, Team, SpeciesRosterEntry } from '../types/pokemon';
import type { UseGameDataReturn } from '../hooks/useGameData';
import type { UseSpeciesRosterReturn } from '../hooks/useSpeciesRoster';
import type { UseRosterActionsReturn } from '../hooks/useRosterActions';
import TypeBadge from './TypeBadge';
import StatsColumn from './StatsColumn';
import EditOverlays from './EditOverlays';
import { ShowdownPopover } from './ShowdownPopover';
import { isGenderless, isFemaleLocked } from '../config/pokemonRules';
import { toRegulationId } from '../utils/pokemonRules';

interface PokemonCardProps {
  pokemon: ImportedPokemonInfo;
  team: Team;
  pokemonIndex: number;
  isEditing?: boolean;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<boolean>;
  gameDataState: UseGameDataReturn;
  speciesRosterState: UseSpeciesRosterReturn;
  rosterActions: UseRosterActionsReturn;
}

const FORM_DIVERGENT: Record<string, boolean> = { 'basculegion': true, 'indeedee': true, 'meowstic': true, 'oinkologne': true };

function getPixelSpriteUrl(id: number, name: string, gender: string, shiny: boolean): string {
  const n = name.toLowerCase().trim();
  const s = shiny ? 'shiny/' : '';
  if (n.includes('basculegion') || n.includes('indeedee')) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s}${id}.png`;
  if (gender === 'F' && ['pikachu', 'eevee', 'venusaur', 'raichu', 'torchic', 'wobbuffet'].includes(n)) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s}female/${id}.png`;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${s}${id}.png`;
}

export default function PokemonCard({ pokemon, team, pokemonIndex, isEditing = false, updateTeam, gameDataState, speciesRosterState, rosterActions }: PokemonCardProps) {
  const { showdownData, types, pokedexNumber } = pokemon;
  const [isLocalShiny, setIsLocalShiny] = useState(showdownData.shiny);
  const [localGender, setLocalGender] = useState<'M' | 'F' | 'N' | '' | undefined>(showdownData.gender);
  const [localNickname, setLocalNickname] = useState(showdownData.nickname || '');
  const [isSwapPickerOpen, setIsSwapPickerOpen] = useState(false);
  const spriteUrl = getPixelSpriteUrl(pokedexNumber, showdownData.species, localGender || 'M', isLocalShiny);
  const rulesetId = toRegulationId(team.format);

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

  const isGenderClickable = (): boolean => {
    const species = showdownData.species;
    const speciesLower = species.toLowerCase();
    if (speciesLower.includes('basculegion') || speciesLower.includes('indeedee') || speciesLower.includes('meowstic') || speciesLower.includes('oinkologne')) return false;
    return !isGenderless(species) && !isFemaleLocked(species);
  };

  return (
    <div className="relative bg-gray-700 border border-gray-600 rounded-lg p-3 flex flex-col gap-3 max-w-[280px]">
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

      {/* Nickname Input */}
      <div className="text-center">
        {isEditing ? (
          <input type="text" value={localNickname} onChange={(e) => setLocalNickname(e.target.value)} placeholder="Enter nickname" className="w-full px-2 py-1 text-sm font-bold text-white bg-gray-800 border border-gray-600 rounded text-center outline-none" />
        ) : (
          showdownData.nickname && <h4 className="text-sm font-bold text-gray-100 truncate">{showdownData.nickname}</h4>
        )}
        <p className="text-xs text-gray-300 truncate">{showdownData.species} #{pokedexNumber}</p>
      </div>

      {/* Sprite Container - clickable in edit mode to open the Roster Swap picker */}
      <div className="flex justify-center">
        <div className="relative">
          <div
            onClick={isEditing ? () => setIsSwapPickerOpen(prev => !prev) : undefined}
            className={`w-full max-w-[128px] mx-auto h-24 bg-gray-800 rounded-lg border border-gray-600 flex items-center justify-center overflow-hidden ${isEditing ? 'cursor-pointer hover:border-blue-500 transition-colors' : ''}`}
            title={isEditing ? 'Click to swap this Pokémon' : undefined}
          >
            {spriteUrl ? (
              <img src={spriteUrl} alt={showdownData.species} className="w-24 h-24 object-contain mx-auto transition-transform duration-150 [image-rendering:pixelated]" />
            ) : (
              <span className="text-xs text-gray-400">No sprite</span>
            )}
          </div>
          {isSwapPickerOpen && (
            <ShowdownPopover
              mode="pokemon"
              data={speciesRosterState.roster}
              rulesetId={rulesetId}
              onSelect={handleSwapSelect}
              onClose={() => setIsSwapPickerOpen(false)}
            />
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
      <EditOverlays pokemon={pokemon} isEditing={isEditing} gameDataState={gameDataState} rulesetId={rulesetId} />

      {/* EVs Grid Block */}
      <StatsColumn pokemon={pokemon} isEditing={isEditing} />

      {/* Footer: Gender and Shiny Indicators */}
      <div className="flex flex-row items-center justify-center gap-3 pt-2 mt-1 border-t border-zinc-800/60 w-full">
        <div className={`flex items-center ${isGenderClickable() ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-not-allowed opacity-60'}`} onClick={isGenderClickable() ? handleGenderToggle : undefined} title={isGenderless(showdownData.species) ? 'Genderless species' : isFemaleLocked(showdownData.species) ? 'Female-only species' : 'Click to toggle gender'}>
          {localGender === 'M' && <span className="text-2xl font-bold text-blue-400">♂</span>}
          {localGender === 'F' && <span className="text-2xl font-bold text-pink-400">♀</span>}
          {localGender !== 'M' && localGender !== 'F' && <span className="text-2xl font-bold text-zinc-400">⌀</span>}
        </div>
        <span className={isLocalShiny ? 'text-base select-none cursor-pointer filter-none opacity-100' : 'text-base select-none cursor-pointer grayscale opacity-30'} onClick={handleShinyToggle} title="Click to toggle shiny status">✨</span>
      </div>
    </div>
  );
}
