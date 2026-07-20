/**
 * useRosterActions Hook - Immutable Team Roster Mutations
 * Swap/add/remove a roster slot. Composes over the already-lifted useTeams,
 * useDatabase, and useGameData state (passed in, never re-instantiated here)
 * so every mutation writes through the same single source of truth.
 */

import { useCallback } from 'react';
import type { EVSpread, ImportedPokemonInfo, ShowdownPokemon, Team, PokeAPICacheEntry } from '../types/pokemon';
import type { UseGameDataReturn } from './useGameData';
import { enrichPokemonWithAPI } from '../services/pokeapi';
import { getFallbackGender } from '../config/pokemonRules';
import { normalizeSlug } from '../utils/pokemonRules';
import { toReadableName } from '../utils/displayName';

const ZERO_EVS: EVSpread = {
  hp: 0,
  attack: 0,
  defense: 0,
  specialAttack: 0,
  specialDefense: 0,
  speed: 0,
};

export interface UseRosterActionsReturn {
  swapSlot: (team: Team, index: number, species: string) => Promise<boolean>;
  addSlot: (team: Team, species: string) => Promise<boolean>;
  removeSlot: (team: Team, index: number) => Promise<boolean>;
  reorderSlot: (team: Team, fromIndex: number, toIndex: number) => Promise<boolean>;
}

export function useRosterActions(
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<boolean>,
  getCachedEntry: (species: string) => PokeAPICacheEntry | null,
  setCacheEntry: (species: string, entry: PokeAPICacheEntry) => Promise<boolean>,
  getEnrichedSpeciesOptions: UseGameDataReturn['getEnrichedSpeciesOptions'],
  getChampionsUsage: UseGameDataReturn['getChampionsUsage']
): UseRosterActionsReturn {
  /**
   * Smart Slot Initialization: ability defaults to the species' most-used
   * legal option, moves to its 4 most-used legal moves (Champions
   * ranked-ladder usage - same source as the Calc page's auto-fill and the
   * Battle Logger's "Likely Set" popover), EVs to zero, item to empty - all
   * sourced from the real per-species learnset, never a fallback list.
   *
   * getEnrichedSpeciesOptions already opportunistically sorts by usage
   * using whatever's cached (see its own doc comment), but that's a
   * zero-network-cost best effort that can be empty for a species nobody's
   * looked at yet. This is a single on-demand "add one Pokemon to a team"
   * action, not a bulk operation, so a live getChampionsUsage fetch here is
   * proportionate (same tier as the Calc page's autoFillFromUsage) and
   * guarantees a correct usage-based default even the first time a species
   * is ever added. Falls back to whatever order getEnrichedSpeciesOptions
   * already returned (learnset order, or its own cached-usage sort) if the
   * live fetch comes back empty (e.g. the API has nothing for this species
   * yet, or the request fails).
   *
   * getEnrichedSpeciesOptions' move/ability `.name` is the raw lowercase-hyphenated
   * PokeAPI slug (e.g. "iron-head"), not display text - every other path into
   * showdownData.ability/moves (pasted Showdown text, ImportTeamModal) already carries
   * proper display casing ("Iron Head"), so it has to be converted here too or a
   * freshly-added Pokemon's defaults fail legality checks that compare against the
   * Title Case move/ability lists.
   */
  const buildSlot = useCallback(async (species: string): Promise<ImportedPokemonInfo> => {
    const gender = getFallbackGender(species);
    const [{ moves, abilities }, usage] = await Promise.all([
      getEnrichedSpeciesOptions(species, gender),
      getChampionsUsage(species),
    ]);

    if (usage) {
      const moveRank = new Map(usage.moves.map(m => [normalizeSlug(m.name), m.percentage]));
      const abilityRank = new Map(usage.abilities.map(a => [normalizeSlug(a.name), a.percentage]));
      moves.sort((a, b) => (moveRank.get(b.name) ?? -1) - (moveRank.get(a.name) ?? -1));
      abilities.sort((a, b) => (abilityRank.get(b.name) ?? -1) - (abilityRank.get(a.name) ?? -1));
    }

    const showdownData: ShowdownPokemon = {
      species,
      gender,
      item: undefined,
      ability: abilities[0] ? toReadableName(abilities[0].name) : undefined,
      level: 50,
      shiny: false,
      gigantamax: false,
      happiness: 255,
      evs: { ...ZERO_EVS },
      moves: moves.slice(0, 4).map(move => toReadableName(move.name)),
    };

    return enrichPokemonWithAPI(showdownData, getCachedEntry, setCacheEntry);
  }, [getEnrichedSpeciesOptions, getChampionsUsage, getCachedEntry, setCacheEntry]);

  const swapSlot = useCallback(async (team: Team, index: number, species: string): Promise<boolean> => {
    const newSlot = await buildSlot(species);
    const updatedPokemon = [...team.pokemon];
    updatedPokemon[index] = newSlot;
    return updateTeam(team.id, { pokemon: updatedPokemon });
  }, [updateTeam, buildSlot]);

  const addSlot = useCallback(async (team: Team, species: string): Promise<boolean> => {
    if (team.pokemon.length >= 6) return false;
    const newSlot = await buildSlot(species);
    return updateTeam(team.id, { pokemon: [...team.pokemon, newSlot] });
  }, [updateTeam, buildSlot]);

  // Removing an array element and keeping the rest already left-shifts every
  // subsequent slot - no index-shuffling logic needed beyond a plain filter.
  const removeSlot = useCallback(async (team: Team, index: number): Promise<boolean> => {
    const updatedPokemon = team.pokemon.filter((_, i) => i !== index);
    return updateTeam(team.id, { pokemon: updatedPokemon });
  }, [updateTeam]);

  const reorderSlot = useCallback(async (team: Team, fromIndex: number, toIndex: number): Promise<boolean> => {
    if (fromIndex === toIndex) return false;
    const updatedPokemon = [...team.pokemon];
    const [moved] = updatedPokemon.splice(fromIndex, 1);
    updatedPokemon.splice(toIndex, 0, moved);
    return updateTeam(team.id, { pokemon: updatedPokemon });
  }, [updateTeam]);

  return { swapSlot, addSlot, removeSlot, reorderSlot };
}
