/**
 * useActiveEditor Hook - Temporary State Buffer Scratchpad
 * Serves as isolated draft state for Edit Mode on specific Pokémon member slots
 * All modifications write to scratchpad; only commits to main array on explicit save
 */

import { useState, useCallback } from 'react';
import type { ImportedPokemonInfo, EVSpread, IVSpread } from '../types/pokemon';

interface UseActiveEditorReturn {
  // Current edit state
  isEditing: boolean;
  editingPokemonIndex: number | null;
  draftPokemon: ImportedPokemonInfo | null;
  isDirty: boolean;
  
  // Edit mode control
  enterEditMode: (pokemon: ImportedPokemonInfo, index: number) => void;
  exitEditMode: () => void;
  
  // Draft modifications
  updateNickname: (nickname: string) => void;
  updateSpecies: (species: string) => void;
  updateGender: (gender: 'M' | 'F' | '') => void;
  updateItem: (item: string) => void;
  updateAbility: (ability: string) => void;
  updateLevel: (level: number) => void;
  updateShiny: (shiny: boolean) => void;
  updateGigantamax: (gigantamax: boolean) => void;
  updateHappiness: (happiness: number) => void;
  updateTeraType: (teraType: string) => void;
  updateNature: (nature: string) => void;
  updateEVs: (evs: Partial<EVSpread>) => void;
  updateIVs: (ivs: Partial<IVSpread>) => void;
  updateMoves: (moves: string[]) => void;
  updateMove: (index: number, move: string) => void;
  
  // Commit/discard
  getCommittableData: () => ImportedPokemonInfo | null;
  discardChanges: () => void;
  hasUnsavedChanges: () => boolean;
}

/**
 * Custom hook for managing temporary edit state buffer
 * Provides isolated scratchpad for Pokémon edits before committing to main state
 */
export function useActiveEditor(): UseActiveEditorReturn {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editingPokemonIndex, setEditingPokemonIndex] = useState<number | null>(null);
  const [draftPokemon, setDraftPokemon] = useState<ImportedPokemonInfo | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  /**
   * Enter edit mode for a specific Pokémon
   * Duplicates properties into temporary local draft state
   */
  const enterEditMode = useCallback((pokemon: ImportedPokemonInfo, index: number): void => {
    // Deep clone to prevent reference mutations
    const clonedPokemon: ImportedPokemonInfo = {
      showdownData: {
        nickname: pokemon.showdownData.nickname,
        species: pokemon.showdownData.species,
        gender: pokemon.showdownData.gender,
        item: pokemon.showdownData.item,
        ability: pokemon.showdownData.ability,
        level: pokemon.showdownData.level,
        shiny: pokemon.showdownData.shiny,
        gigantamax: pokemon.showdownData.gigantamax,
        happiness: pokemon.showdownData.happiness,
        teraType: pokemon.showdownData.teraType,
        nature: pokemon.showdownData.nature,
        evs: { ...pokemon.showdownData.evs },
        ivs: { ...pokemon.showdownData.ivs },
        moves: [...pokemon.showdownData.moves],
      },
      pokedexNumber: pokemon.pokedexNumber,
      types: [...pokemon.types],
      baseStats: { ...pokemon.baseStats },
      spriteUrl: pokemon.spriteUrl,
      calculatedStats: pokemon.calculatedStats ? { ...pokemon.calculatedStats } : undefined,
      importedAt: pokemon.importedAt,
    };
    
    setDraftPokemon(clonedPokemon);
    setEditingPokemonIndex(index);
    setIsEditing(true);
    setIsDirty(false);
  }, []);

  /**
   * Exit edit mode and clear scratchpad
   */
  const exitEditMode = useCallback((): void => {
    setIsEditing(false);
    setEditingPokemonIndex(null);
    setDraftPokemon(null);
    setIsDirty(false);
  }, []);

  /**
   * Internal: Update draft Pokémon and mark as dirty
   */
  const updateDraft = useCallback((updater: (draft: ImportedPokemonInfo) => ImportedPokemonInfo): void => {
    setDraftPokemon(prev => {
      if (!prev) return null;
      const updated = updater(prev);
      setIsDirty(true);
      return updated;
    });
  }, []);

  /**
   * Update nickname in draft
   */
  const updateNickname = useCallback((nickname: string): void => {
    updateDraft(draft => ({
      ...draft,
      showdownData: {
        ...draft.showdownData,
        nickname: nickname || undefined,
      },
    }));
  }, [updateDraft]);

  /**
   * Update species in draft
   */
  const updateSpecies = useCallback((species: string): void => {
    updateDraft(draft => ({
      ...draft,
      showdownData: {
        ...draft.showdownData,
        species,
      },
    }));
  }, [updateDraft]);

  /**
   * Update gender in draft
   */
  const updateGender = useCallback((gender: 'M' | 'F' | ''): void => {
    updateDraft(draft => ({
      ...draft,
      showdownData: {
        ...draft.showdownData,
        gender: gender || undefined,
      },
    }));
  }, [updateDraft]);

  /**
   * Update held item in draft
   */
  const updateItem = useCallback((item: string): void => {
    updateDraft(draft => ({
      ...draft,
      showdownData: {
        ...draft.showdownData,
        item: item || undefined,
      },
    }));
  }, [updateDraft]);

  /**
   * Update ability in draft
   */
  const updateAbility = useCallback((ability: string): void => {
    updateDraft(draft => ({
      ...draft,
      showdownData: {
        ...draft.showdownData,
        ability: ability || undefined,
      },
    }));
  }, [updateDraft]);

  /**
   * Update level in draft
   */
  const updateLevel = useCallback((level: number): void => {
    updateDraft(draft => ({
      ...draft,
      showdownData: {
        ...draft.showdownData,
        level: Math.max(1, Math.min(100, level)),
      },
    }));
  }, [updateDraft]);

  /**
   * Update shiny status in draft
   */
  const updateShiny = useCallback((shiny: boolean): void => {
    updateDraft(draft => ({
      ...draft,
      showdownData: {
        ...draft.showdownData,
        shiny,
      },
    }));
  }, [updateDraft]);

  /**
   * Update Gigantamax status in draft
   */
  const updateGigantamax = useCallback((gigantamax: boolean): void => {
    updateDraft(draft => ({
      ...draft,
      showdownData: {
        ...draft.showdownData,
        gigantamax,
      },
    }));
  }, [updateDraft]);

  /**
   * Update happiness in draft
   */
  const updateHappiness = useCallback((happiness: number): void => {
    updateDraft(draft => ({
      ...draft,
      showdownData: {
        ...draft.showdownData,
        happiness: Math.max(0, Math.min(255, happiness)),
      },
    }));
  }, [updateDraft]);

  /**
   * Update Tera Type in draft
   */
  const updateTeraType = useCallback((teraType: string): void => {
    updateDraft(draft => ({
      ...draft,
      showdownData: {
        ...draft.showdownData,
        teraType: teraType || undefined,
      },
    }));
  }, [updateDraft]);

  /**
   * Update nature in draft
   */
  const updateNature = useCallback((nature: string): void => {
    updateDraft(draft => ({
      ...draft,
      showdownData: {
        ...draft.showdownData,
        nature: nature || undefined,
      },
    }));
  }, [updateDraft]);

  /**
   * Update EVs in draft (partial update)
   */
  const updateEVs = useCallback((evs: Partial<EVSpread>): void => {
    updateDraft(draft => ({
      ...draft,
      showdownData: {
        ...draft.showdownData,
        evs: {
          ...draft.showdownData.evs,
          ...evs,
        },
      },
    }));
  }, [updateDraft]);

  /**
   * Update IVs in draft (partial update)
   */
  const updateIVs = useCallback((ivs: Partial<IVSpread>): void => {
    updateDraft(draft => ({
      ...draft,
      showdownData: {
        ...draft.showdownData,
        ivs: {
          ...draft.showdownData.ivs,
          ...ivs,
        },
      },
    }));
  }, [updateDraft]);

  /**
   * Update all moves in draft
   */
  const updateMoves = useCallback((moves: string[]): void => {
    updateDraft(draft => ({
      ...draft,
      showdownData: {
        ...draft.showdownData,
        moves: moves.slice(0, 4), // Max 4 moves
      },
    }));
  }, [updateDraft]);

  /**
   * Update a specific move by index in draft
   */
  const updateMove = useCallback((index: number, move: string): void => {
    updateDraft(draft => {
      const moves = [...draft.showdownData.moves];
      if (index >= 0 && index < 4) {
        moves[index] = move;
      }
      return {
        ...draft,
        showdownData: {
          ...draft.showdownData,
          moves,
        },
      };
    });
  }, [updateDraft]);

  /**
   * Get committable data for saving to main state
   * Returns null if not in edit mode
   */
  const getCommittableData = useCallback((): ImportedPokemonInfo | null => {
    if (!isEditing || !draftPokemon) return null;
    return draftPokemon;
  }, [isEditing, draftPokemon]);

  /**
   * Discard all changes and exit edit mode
   */
  const discardChanges = useCallback((): void => {
    exitEditMode();
  }, [exitEditMode]);

  /**
   * Check if there are unsaved changes
   */
  const hasUnsavedChanges = useCallback((): boolean => {
    return isDirty;
  }, [isDirty]);

  return {
    isEditing,
    editingPokemonIndex,
    draftPokemon,
    isDirty,
    enterEditMode,
    exitEditMode,
    updateNickname,
    updateSpecies,
    updateGender,
    updateItem,
    updateAbility,
    updateLevel,
    updateShiny,
    updateGigantamax,
    updateHappiness,
    updateTeraType,
    updateNature,
    updateEVs,
    updateIVs,
    updateMoves,
    updateMove,
    getCommittableData,
    discardChanges,
    hasUnsavedChanges,
  };
}
