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

  // Box Tab's per-entry collapse/expand state (Box Tab Leg 1, see TODO.md) -
  // same Set<string>-of-ids + toggle shape as useTeams.ts's own
  // expandedCardIds/toggleCardExpansion, just scoped to savedPokemon entries
  // instead of teams.
  expandedCardIds: Set<string>;
  toggleCardExpansion: (id: string) => void;

  /**
   * Adds a whole batch in one persist+state-update, rather than being called
   * once per Pokemon in a loop - a bulk-import loop of N sequential single-add
   * calls would each read `savedPokemon` from the same stale render closure
   * (the caller's event handler doesn't get a fresh hook reference between
   * awaits), so every call but the last would silently overwrite the ones
   * before it. A single batched call sidesteps that entirely.
   *
   * `labels`, when given, supplies a user-entered name per pokemonList index
   * (Save-to-Library Name Prompt Leg 1, see TODO.md) - a blank/omitted entry
   * falls back to nickname-or-species same as before. Either way,
   * nextAvailableLabel below still dedupes the result against existing
   * labels; a typed name isn't exempt from that.
   *
   * `ids`, when given, supplies the entry id per pokemonList index instead of
   * a freshly generated `crypto.randomUUID()` (Box Tab Leg 2, see TODO.md) -
   * lets a caller (BoxPage.tsx's "+ New Build") know the id its new entry
   * will land under *before* the save resolves, so it can auto-expand that
   * exact entry (`expandedCardIds` above) the instant the save succeeds
   * instead of having to guess which of the (possibly still-stale) returned
   * entries is the new one.
   */
  addSavedPokemonBatch: (pokemonList: ImportedPokemonInfo[], labels?: string[], ids?: string[]) => Promise<boolean>;
  renameSavedPokemon: (id: string, label: string) => Promise<boolean>;
  /**
   * Toggles an entry's `favorite` field (Box Tab: Favoriting, see TODO.md) -
   * same entry-level-field shape as renameSavedPokemon above, not
   * updateSavedPokemon (which only ever touches the nested `pokemon`
   * object). Favorited entries sort to the top of the Box grid via
   * utils/savedPokemonSort.ts's sortSavedPokemonByFavorite.
   */
  toggleSavedPokemonFavorite: (id: string) => Promise<boolean>;
  /**
   * Clones an existing entry into a new one (Box Tab Leg 3, see TODO.md) -
   * fresh entry id AND a fresh `pokemon.id` (same "never reuse a roster-slot
   * id" convention PokemonCard.tsx's handlePastePokemon follows), so the
   * clone doesn't collide with the source if both are ever rendered
   * side-by-side (e.g. a Framer Motion `layout` key clash). Label reuses
   * nextAvailableLabel's existing " (2)"/" (3)" suffix dedupe against the
   * source's own label, rather than a dedicated "Copy of ..." scheme.
   */
  duplicateSavedPokemon: (id: string) => Promise<boolean>;
  /**
   * Reorder Box entries by dragging one onto another (Box Tab: Reorder, see
   * TODO.md) - same insert-before-target semantics as
   * useTeams.ts::reorderTeam, operating directly on savedPokemon's own array
   * order since Custom mode's persisted order *is* that array order (no
   * dedicated order field, mirroring TeamsDatabase.teams). Only meaningful
   * when BoxPage.tsx's sort mode is 'custom' - dragging while Alphabetical is
   * selected is gated at the UI layer (BoxCard.tsx), not here.
   */
  reorderSavedPokemon: (draggedId: string, targetId: string) => Promise<boolean>;
  /**
   * Overwrites the full stored order to match `orderedIds` (Box Tab:
   * Reorder, see TODO.md) - used once, by BoxPage.tsx's sort-mode toggle, to
   * seed Custom mode's first-ever order from whatever the Alphabetical view
   * was showing at the moment of the switch (see
   * AppSettings.boxCustomOrderSeeded) so flipping modes doesn't visually
   * jump the grid. Any id not present in orderedIds (shouldn't happen in
   * practice) keeps its existing relative order, appended after the given
   * ids, so nothing is silently dropped.
   */
  setSavedPokemonOrder: (orderedIds: string[]) => Promise<boolean>;
  /**
   * Field-level update on a saved entry's stored `ImportedPokemonInfo` (Box
   * Tab Leg 1, see TODO.md) - distinct from renameSavedPokemon above, which
   * only ever touches the entry's `label`. Box cards are editable in place,
   * so this is what EditablePokemonCore.tsx's `onUpdatePokemon` callback
   * commits through for a Box entry, same shape as PokemonCard.tsx's own
   * `updatePokemon` for a roster slot.
   */
  updateSavedPokemon: (id: string, updates: Partial<ImportedPokemonInfo>) => Promise<boolean>;
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
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());

  /**
   * Internal: Load saved Pokemon from disk via preload bridge. Only called
   * from refreshSavedPokemon() now - the mount path below inlines its own
   * copy of this logic (see that effect's comment for why).
   */
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

  /**
   * Load saved Pokemon from disk on mount. Inlined (rather than calling
   * loadSavedPokemonFromDisk by reference) to match React's own recognized
   * fetch-in-effect idiom - see docs/investigations/set-state-in-effect-lint-fix.md
   * for why the outer-scope function trips react-hooks/set-state-in-effect
   * even though its behavior here is identical.
   */
  useEffect(() => {
    let ignore = false;

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const database = await window.electron.readSavedPokemonDatabase();
        if (ignore) return;

        if (database) {
          setSavedPokemon(database.savedPokemon);
        } else {
          setSavedPokemon([]);
        }
      } catch (err) {
        if (ignore) return;
        const errorMessage = err instanceof Error ? err.message : 'Failed to load saved Pokemon sets';
        setError(errorMessage);
        console.error('Error loading saved Pokemon sets:', err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
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

  const addSavedPokemonBatch = useCallback(async (pokemonList: ImportedPokemonInfo[], labels?: string[], ids?: string[]): Promise<boolean> => {
    const labelsSoFar = savedPokemon.map(e => e.label);
    const now = Date.now();

    const newEntries: SavedPokemonEntry[] = pokemonList.map((pokemon, i) => {
      const base = labels?.[i]?.trim() || pokemon.showdownData.nickname || pokemon.showdownData.species;
      const label = nextAvailableLabel(base, labelsSoFar);
      labelsSoFar.push(label); // dedupe against sets earlier in this same batch too, not just pre-existing ones
      return { id: ids?.[i] ?? crypto.randomUUID(), label, pokemon, savedAt: now, updatedAt: now };
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

  const toggleSavedPokemonFavorite = useCallback(async (id: string): Promise<boolean> => {
    const index = savedPokemon.findIndex(e => e.id === id);
    if (index === -1) {
      setError(`Saved Pokemon set with ID ${id} not found`);
      return false;
    }

    const updated = [...savedPokemon];
    updated[index] = { ...updated[index], favorite: !updated[index].favorite, updatedAt: Date.now() };

    const success = await persistSavedPokemonToDisk(updated);

    if (success) {
      setSavedPokemon(updated);
      setError(null);
    }

    return success;
  }, [savedPokemon]);

  const updateSavedPokemon = useCallback(async (id: string, updates: Partial<ImportedPokemonInfo>): Promise<boolean> => {
    const index = savedPokemon.findIndex(e => e.id === id);
    if (index === -1) {
      setError(`Saved Pokemon set with ID ${id} not found`);
      return false;
    }

    const updated = [...savedPokemon];
    updated[index] = { ...updated[index], pokemon: { ...updated[index].pokemon, ...updates }, updatedAt: Date.now() };

    const success = await persistSavedPokemonToDisk(updated);

    if (success) {
      setSavedPokemon(updated);
      setError(null);
    }

    return success;
  }, [savedPokemon]);

  const duplicateSavedPokemon = useCallback(async (id: string): Promise<boolean> => {
    const source = savedPokemon.find(e => e.id === id);
    if (!source) {
      setError(`Saved Pokemon set with ID ${id} not found`);
      return false;
    }

    const now = Date.now();
    const newEntry: SavedPokemonEntry = {
      id: crypto.randomUUID(),
      label: nextAvailableLabel(source.label, savedPokemon.map(e => e.label)),
      pokemon: { ...source.pokemon, id: crypto.randomUUID() },
      savedAt: now,
      updatedAt: now,
    };

    const updated = [newEntry, ...savedPokemon];
    const success = await persistSavedPokemonToDisk(updated);

    if (success) {
      setSavedPokemon(updated);
      setError(null);
    }

    return success;
  }, [savedPokemon]);

  const reorderSavedPokemon = useCallback(async (draggedId: string, targetId: string): Promise<boolean> => {
    if (draggedId === targetId) return false;
    const dragged = savedPokemon.find(e => e.id === draggedId);
    if (!dragged) return false;

    const withoutDragged = savedPokemon.filter(e => e.id !== draggedId);
    const targetIndex = withoutDragged.findIndex(e => e.id === targetId);
    if (targetIndex === -1) return false;

    const updated = [...withoutDragged];
    updated.splice(targetIndex, 0, dragged);

    const success = await persistSavedPokemonToDisk(updated);
    if (success) {
      setSavedPokemon(updated);
      setError(null);
    }
    return success;
  }, [savedPokemon]);

  const setSavedPokemonOrder = useCallback(async (orderedIds: string[]): Promise<boolean> => {
    const byId = new Map(savedPokemon.map(e => [e.id, e]));
    const ordered = orderedIds.map(id => byId.get(id)).filter((e): e is SavedPokemonEntry => e !== undefined);
    const orderedIdSet = new Set(ordered.map(e => e.id));
    const leftover = savedPokemon.filter(e => !orderedIdSet.has(e.id));
    const updated = [...ordered, ...leftover];

    const success = await persistSavedPokemonToDisk(updated);
    if (success) {
      setSavedPokemon(updated);
      setError(null);
    }
    return success;
  }, [savedPokemon]);

  const toggleCardExpansion = useCallback((id: string): void => {
    setExpandedCardIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

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
    expandedCardIds,
    toggleCardExpansion,
    addSavedPokemonBatch,
    renameSavedPokemon,
    toggleSavedPokemonFavorite,
    duplicateSavedPokemon,
    reorderSavedPokemon,
    setSavedPokemonOrder,
    updateSavedPokemon,
    deleteSavedPokemon,
    refreshSavedPokemon,
    getSavedSetsForSpecies,
  };
}
