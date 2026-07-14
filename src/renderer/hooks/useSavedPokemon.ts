/**
 * useSavedPokemon Hook - Saved Individual Pokémon Set CRUD
 * A flat library of standalone Pokémon sets (savedPokemon.json), distinct
 * from useTeams.ts's fixed 6-slot Team roster - lets the Calc page save any
 * imported/configured Pokémon individually and reload it later by species.
 * Mirrors useTeams.ts's load/persist/CRUD shape exactly, same "every mutation
 * writes through to disk before updating in-memory state" convention.
 */

import { useState, useCallback, useEffect } from 'react';
import type { ImportedPokemonInfo, SavedPokemonEntry, SavedPokemonDatabase } from '../types/pokemon';

export interface UseSavedPokemonReturn {
  savedPokemon: SavedPokemonEntry[];
  isLoading: boolean;
  error: string | null;

  /**
   * Adds a whole batch in one persist+state-update, rather than being called
   * once per Pokemon in a loop - a bulk-import loop of N sequential single-add
   * calls would each read `savedPokemon` from the same stale render closure
   * (the caller's event handler doesn't get a fresh hook reference between
   * awaits), so every call but the last would silently overwrite the ones
   * before it. A single batched call sidesteps that entirely.
   */
  addSavedPokemonBatch: (pokemonList: ImportedPokemonInfo[]) => Promise<boolean>;
  renameSavedPokemon: (id: string, label: string) => Promise<boolean>;
  deleteSavedPokemon: (id: string) => Promise<boolean>;
  refreshSavedPokemon: () => Promise<void>;
  getSavedSetsForSpecies: (species: string) => SavedPokemonEntry[];
}

/** "Dracovish" -> "Dracovish (2)" -> "Dracovish (3)"... - same smallest-unused-suffix pattern as ImportTeamModal.tsx::nextGenericTeamName. */
function nextAvailableLabel(base: string, existingLabels: string[]): string {
  const taken = new Set(existingLabels);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base} (${n})`)) n++;
  return `${base} (${n})`;
}

export function useSavedPokemon(): UseSavedPokemonReturn {
  const [savedPokemon, setSavedPokemon] = useState<SavedPokemonEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSavedPokemonFromDisk = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const database = await window.electron.readSavedPokemonDatabase();

      if (database) {
        setSavedPokemon(database.savedPokemon);
      } else {
        setSavedPokemon([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load saved Pokemon sets';
      setError(errorMessage);
      console.error('Error loading saved Pokemon sets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSavedPokemonFromDisk();
  }, []);

  const persistSavedPokemonToDisk = async (updated: SavedPokemonEntry[]): Promise<boolean> => {
    try {
      const database: SavedPokemonDatabase = {
        version: 1,
        savedPokemon: updated,
        lastModified: Date.now(),
      };

      const success = await window.electron.writeSavedPokemonDatabase(database);

      if (!success) {
        throw new Error('Failed to write saved-Pokemon database');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save Pokemon set';
      setError(errorMessage);
      console.error('Error persisting saved Pokemon sets:', err);
      return false;
    }
  };

  const addSavedPokemonBatch = useCallback(async (pokemonList: ImportedPokemonInfo[]): Promise<boolean> => {
    const labelsSoFar = savedPokemon.map(e => e.label);
    const now = Date.now();

    const newEntries: SavedPokemonEntry[] = pokemonList.map(pokemon => {
      const base = pokemon.showdownData.nickname || pokemon.showdownData.species;
      const label = nextAvailableLabel(base, labelsSoFar);
      labelsSoFar.push(label); // dedupe against sets earlier in this same batch too, not just pre-existing ones
      return { id: crypto.randomUUID(), label, pokemon, savedAt: now, updatedAt: now };
    });

    const updated = [...newEntries, ...savedPokemon];
    const success = await persistSavedPokemonToDisk(updated);

    if (success) {
      setSavedPokemon(updated);
      setError(null);
    }

    return success;
  }, [savedPokemon]);

  const renameSavedPokemon = useCallback(async (id: string, label: string): Promise<boolean> => {
    const index = savedPokemon.findIndex(e => e.id === id);
    if (index === -1) {
      setError(`Saved Pokemon set with ID ${id} not found`);
      return false;
    }

    const updated = [...savedPokemon];
    updated[index] = { ...updated[index], label, updatedAt: Date.now() };

    const success = await persistSavedPokemonToDisk(updated);

    if (success) {
      setSavedPokemon(updated);
      setError(null);
    }

    return success;
  }, [savedPokemon]);

  const deleteSavedPokemon = useCallback(async (id: string): Promise<boolean> => {
    const updated = savedPokemon.filter(e => e.id !== id);
    const success = await persistSavedPokemonToDisk(updated);

    if (success) {
      setSavedPokemon(updated);
      setError(null);
    }

    return success;
  }, [savedPokemon]);

  const refreshSavedPokemon = useCallback(async (): Promise<void> => {
    await loadSavedPokemonFromDisk();
  }, []);

  const getSavedSetsForSpecies = useCallback((species: string): SavedPokemonEntry[] => {
    const normalized = species.toLowerCase().trim();
    return savedPokemon.filter(e => e.pokemon.showdownData.species.toLowerCase().trim() === normalized);
  }, [savedPokemon]);

  return {
    savedPokemon,
    isLoading,
    error,
    addSavedPokemonBatch,
    renameSavedPokemon,
    deleteSavedPokemon,
    refreshSavedPokemon,
    getSavedSetsForSpecies,
  };
}
