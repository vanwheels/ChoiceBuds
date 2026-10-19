/**
 * useSavedPokemon Hook - Saved Individual Pokémon Set CRUD
 * A flat library of standalone Pokémon sets (savedPokemon.json), distinct
 * from useTeams.ts's fixed 6-slot Team roster - lets the Calc page save any
 * imported/configured Pokémon individually and reload it later by species.
 * Mirrors useTeams.ts's load/persist/CRUD shape ("every mutation writes
 * through to disk before updating in-memory state").
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  ImportedPokemonInfo,
  SavedPokemonEntry,
  SavedPokemonDatabase,
  SyncTombstone,
} from '../types/pokemon';
import { getStorageAdapter } from '../services/storage';
import {
  SAVED_POKEMON_SCHEMA_VERSION,
  loadSavedPokemonDatabase,
} from '../utils/savedPokemonMigrations';
import { reconcileSyncedSavedPokemon } from '../utils/savedPokemonSyncReconciliation';

export interface UseSavedPokemonReturn {
  savedPokemon: SavedPokemonEntry[];
  isLoading: boolean;
  error: string | null;

  // Box Tab's per-entry collapse/expand state - same Set<string>-of-ids +
  // toggle shape as useTeams.ts's own expandedCardIds/toggleCardExpansion.
  expandedCardIds: Set<string>;
  toggleCardExpansion: (id: string) => void;

  /**
   * Adds a whole batch in one persist+state-update rather than being called
   * once per Pokemon in a loop - a bulk-import loop of N sequential calls
   * would each read `savedPokemon` from the same stale render closure, so
   * every call but the last would silently overwrite the ones before it.
   * `labels`, when given, supplies a user-entered name per pokemonList index
   * (a blank/omitted entry falls back to nickname-or-species, still deduped
   * by nextAvailableLabel below). `ids`, when given, supplies the entry id
   * per pokemonList index instead of a freshly generated
   * `crypto.randomUUID()` - lets a caller (BoxPage.tsx's "+ New Build") know
   * the id its new entry will land under before the save resolves, so it can
   * auto-expand that exact entry the instant the save succeeds.
   */
  addSavedPokemonBatch: (
    pokemonList: ImportedPokemonInfo[],
    labels?: string[],
    ids?: string[],
  ) => Promise<boolean>;
  renameSavedPokemon: (id: string, label: string) => Promise<boolean>;
  /**
   * Toggles an entry's `favorite` field - same entry-level shape as
   * renameSavedPokemon, not updateSavedPokemon (which only touches the
   * nested `pokemon` object). Favorited entries sort to the top of the Box
   * grid via utils/savedPokemonSort.ts's sortSavedPokemonByFavorite.
   */
  toggleSavedPokemonFavorite: (id: string) => Promise<boolean>;
  /**
   * Clones an existing entry into a new one - fresh entry id AND a fresh
   * `pokemon.id` (same "never reuse a roster-slot id" convention
   * PokemonCard.tsx's handlePastePokemon follows), so the clone doesn't
   * collide with the source if both are ever rendered side-by-side. Label
   * reuses nextAvailableLabel's " (2)"/" (3)" suffix dedupe against the
   * source's own label.
   */
  duplicateSavedPokemon: (id: string) => Promise<boolean>;
  /**
   * Overwrites the full stored order to match `orderedIds` (Box Tab:
   * Reorder). Two callers: BoxPage.tsx's sort-mode toggle seeds Custom
   * mode's first-ever order from the Alphabetical view at the moment of the
   * switch; BoxCard.tsx's framer-motion Reorder.Group calls it once per
   * completed drag with the grid's full new visual order. Only meaningful
   * when sort mode is 'custom' - dragging while Alphabetical is selected is
   * gated at the UI layer, not here. Any id not present in orderedIds
   * (shouldn't happen in practice) keeps its existing relative order,
   * appended after the given ids.
   */
  setSavedPokemonOrder: (orderedIds: string[]) => Promise<boolean>;
  /**
   * Field-level update on a saved entry's stored `ImportedPokemonInfo` -
   * distinct from renameSavedPokemon above, which only touches `label`. What
   * EditablePokemonCore.tsx's `onUpdatePokemon` commits through for a Box
   * entry, same shape as PokemonCard.tsx's `updatePokemon` for a roster slot.
   */
  updateSavedPokemon: (id: string, updates: Partial<ImportedPokemonInfo>) => Promise<boolean>;
  /**
   * Bulk `nationalDexNumber` backfill for usePokedexNumberSelfHeal.ts - one
   * batched write for every affected entry, not N individual
   * updateSavedPokemon calls.
   */
  applyPokedexNumberFixes: (fixes: { id: string; nationalDexNumber: number }[]) => Promise<boolean>;
  deleteSavedPokemon: (id: string) => Promise<boolean>;
  refreshSavedPokemon: () => Promise<void>;
  getSavedSetsForSpecies: (species: string) => SavedPokemonEntry[];

  // Pending deletes not yet confirmed synced (see TODO.md's Sync Data Model
  // leg) - included in the next sync push, then cleared by applySyncedState.
  tombstones: SyncTombstone[];
  /**
   * Reconciles local state with a sync merge's result via
   * utils/savedPokemonSyncReconciliation.ts's reconcileSyncedSavedPokemon
   * (mirrors useTeams.ts::applySyncedState - see that function's own doc
   * comment for the per-entry/per-tombstone rules).
   */
  applySyncedState: (
    records: SavedPokemonEntry[],
    pushedTombstones: SyncTombstone[],
  ) => Promise<boolean>;
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
  const [tombstones, setTombstones] = useState<SyncTombstone[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());

  // Mirrors of `savedPokemon`/`tombstones` that every mutator below reads as
  // its base instead of the closure variables, plus a queue serializing
  // every mutation - same useTeams.ts-style ref+queue fix for the
  // lost-update race (see docs/investigations/sibling-hooks-lost-update-audit.md):
  // two mutations fired before React re-renders used to both read the same
  // stale closure, each persist independently, silently dropping whichever
  // edit lost the race. Updated synchronously the instant a mutation
  // computes its result, only ever touched inside enqueueMutation below.
  const savedPokemonRef = useRef<SavedPokemonEntry[]>(savedPokemon);
  const tombstonesRef = useRef<SyncTombstone[]>(tombstones);
  const writeQueueRef = useRef<Promise<unknown>>(Promise.resolve());

  const enqueueMutation = useCallback(<T>(job: () => Promise<T>): Promise<T> => {
    const run = writeQueueRef.current.then(job, job);
    writeQueueRef.current = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }, []);

  // Declared above the load paths below, which call it directly - lint
  // forbids referencing a same-scope const before its declaration even from
  // a deferred async closure.
  const persistSavedPokemonToDisk = async (
    updated: SavedPokemonEntry[],
    updatedTombstones: SyncTombstone[],
  ): Promise<boolean> => {
    try {
      const database: SavedPokemonDatabase = {
        schemaVersion: SAVED_POKEMON_SCHEMA_VERSION,
        savedPokemon: updated,
        tombstones: updatedTombstones,
        lastModified: Date.now(),
      };

      const success = await getStorageAdapter().write('saved-pokemon-database', database);

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

  /**
   * Shared tail end of every mutator below: persist, then on success rebase
   * both refs/state off the same written values. `updatedTombstones`
   * defaults to the current ref for a mutator that doesn't touch tombstones.
   */
  const commitSavedPokemon = async (
    updated: SavedPokemonEntry[],
    updatedTombstones: SyncTombstone[] = tombstonesRef.current,
  ): Promise<boolean> => {
    const success = await persistSavedPokemonToDisk(updated, updatedTombstones);
    if (success) {
      savedPokemonRef.current = updated;
      tombstonesRef.current = updatedTombstones;
      setSavedPokemon(updated);
      setTombstones(updatedTombstones);
      setError(null);
    }
    return success;
  };

  /**
   * Internal: Load saved Pokemon from disk via preload bridge. Only called
   * from refreshSavedPokemon() now - the mount path below inlines its own
   * copy of this logic (see that effect's comment for why).
   */
  const loadSavedPokemonFromDisk = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const raw = await getStorageAdapter().read<SavedPokemonDatabase>('saved-pokemon-database');
      const { entries, tombstones: loadedTombstones, needsPersist } = loadSavedPokemonDatabase(raw);
      savedPokemonRef.current = entries;
      tombstonesRef.current = loadedTombstones;
      setSavedPokemon(entries);
      setTombstones(loadedTombstones);
      if (needsPersist) void persistSavedPokemonToDisk(entries, loadedTombstones);
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
   * loadSavedPokemonFromDisk by reference) to match React's fetch-in-effect
   * idiom - see docs/investigations/set-state-in-effect-lint-fix.md for why.
   */
  useEffect(() => {
    let ignore = false;

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const raw = await getStorageAdapter().read<SavedPokemonDatabase>('saved-pokemon-database');
        if (ignore) return;
        const {
          entries,
          tombstones: loadedTombstones,
          needsPersist,
        } = loadSavedPokemonDatabase(raw);
        savedPokemonRef.current = entries;
        tombstonesRef.current = loadedTombstones;
        setSavedPokemon(entries);
        setTombstones(loadedTombstones);
        if (needsPersist) void persistSavedPokemonToDisk(entries, loadedTombstones);
      } catch (err) {
        if (ignore) return;
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load saved Pokemon sets';
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

  const addSavedPokemonBatch = useCallback(
    (pokemonList: ImportedPokemonInfo[], labels?: string[], ids?: string[]): Promise<boolean> =>
      enqueueMutation(async () => {
        const base = savedPokemonRef.current;
        const labelsSoFar = base.map((e) => e.label);
        const now = Date.now();

        const newEntries: SavedPokemonEntry[] = pokemonList.map((pokemon, i) => {
          const baseLabel =
            labels?.[i]?.trim() || pokemon.showdownData.nickname || pokemon.showdownData.species;
          const label = nextAvailableLabel(baseLabel, labelsSoFar);
          labelsSoFar.push(label); // dedupe against sets earlier in this same batch too, not just pre-existing ones
          return {
            id: ids?.[i] ?? crypto.randomUUID(),
            label,
            pokemon,
            savedAt: now,
            updatedAt: now,
          };
        });

        const updated = [...newEntries, ...base];
        return commitSavedPokemon(updated);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commitSavedPokemon is a plain local function, stable for this hook instance's lifetime (same as loadSavedPokemonFromDisk below).
    [enqueueMutation],
  );

  /**
   * Shared by renameSavedPokemon/toggleSavedPokemonFavorite/
   * updateSavedPokemon below: find the entry by id, apply `transform`, then
   * commit. Not itself returned from the hook.
   */
  const updateEntryById = useCallback(
    (id: string, transform: (entry: SavedPokemonEntry) => SavedPokemonEntry): Promise<boolean> =>
      enqueueMutation(async () => {
        const base = savedPokemonRef.current;
        const index = base.findIndex((e) => e.id === id);
        if (index === -1) {
          setError(`Saved Pokemon set with ID ${id} not found`);
          return false;
        }

        const updated = [...base];
        updated[index] = transform(updated[index]);
        return commitSavedPokemon(updated);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commitSavedPokemon is stable, see addSavedPokemonBatch above.
    [enqueueMutation],
  );

  const renameSavedPokemon = useCallback(
    (id: string, label: string): Promise<boolean> =>
      updateEntryById(id, (entry) => ({ ...entry, label, updatedAt: Date.now() })),
    [updateEntryById],
  );

  const toggleSavedPokemonFavorite = useCallback(
    (id: string): Promise<boolean> =>
      updateEntryById(id, (entry) => ({
        ...entry,
        favorite: !entry.favorite,
        updatedAt: Date.now(),
      })),
    [updateEntryById],
  );

  const updateSavedPokemon = useCallback(
    (id: string, updates: Partial<ImportedPokemonInfo>): Promise<boolean> =>
      updateEntryById(id, (entry) => ({
        ...entry,
        pokemon: { ...entry.pokemon, ...updates },
        updatedAt: Date.now(),
      })),
    [updateEntryById],
  );

  /**
   * Bulk variant of updateSavedPokemon, for usePokedexNumberSelfHeal.ts's
   * dex-number self-heal - one batched disk write for every affected entry,
   * not N sequential ones (same reasoning as addSavedPokemonBatch above).
   */
  const applyPokedexNumberFixes = useCallback(
    (fixes: { id: string; nationalDexNumber: number }[]): Promise<boolean> =>
      enqueueMutation(async () => {
        const fixById = new Map(fixes.map((f) => [f.id, f.nationalDexNumber]));
        const updated = savedPokemonRef.current.map((entry) => {
          const nationalDexNumber = fixById.get(entry.id);
          return nationalDexNumber === undefined
            ? entry
            : {
                ...entry,
                pokemon: { ...entry.pokemon, nationalDexNumber },
                updatedAt: Date.now(),
              };
        });

        return commitSavedPokemon(updated);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commitSavedPokemon is stable, see addSavedPokemonBatch above.
    [enqueueMutation],
  );

  const duplicateSavedPokemon = useCallback(
    (id: string): Promise<boolean> =>
      enqueueMutation(async () => {
        const base = savedPokemonRef.current;
        const source = base.find((e) => e.id === id);
        if (!source) {
          setError(`Saved Pokemon set with ID ${id} not found`);
          return false;
        }

        const now = Date.now();
        const newEntry: SavedPokemonEntry = {
          id: crypto.randomUUID(),
          label: nextAvailableLabel(
            source.label,
            base.map((e) => e.label),
          ),
          pokemon: { ...source.pokemon, id: crypto.randomUUID() },
          savedAt: now,
          updatedAt: now,
        };

        const updated = [newEntry, ...base];
        return commitSavedPokemon(updated);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commitSavedPokemon is stable, see addSavedPokemonBatch above.
    [enqueueMutation],
  );

  const setSavedPokemonOrder = useCallback(
    (orderedIds: string[]): Promise<boolean> =>
      enqueueMutation(async () => {
        const base = savedPokemonRef.current;
        const byId = new Map(base.map((e) => [e.id, e]));
        const ordered = orderedIds
          .map((id) => byId.get(id))
          .filter((e): e is SavedPokemonEntry => e !== undefined);
        const orderedIdSet = new Set(ordered.map((e) => e.id));
        const leftover = base.filter((e) => !orderedIdSet.has(e.id));
        const updated = [...ordered, ...leftover];
        return commitSavedPokemon(updated);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commitSavedPokemon is stable, see addSavedPokemonBatch above.
    [enqueueMutation],
  );

  const toggleCardExpansion = useCallback((id: string): void => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  /**
   * Also records a tombstone so a future sync merge knows this id was
   * intentionally removed - cleared once confirmed synced (applySyncedState).
   */
  const deleteSavedPokemon = useCallback(
    (id: string): Promise<boolean> =>
      enqueueMutation(async () => {
        const updated = savedPokemonRef.current.filter((e) => e.id !== id);
        const updatedTombstones = [...tombstonesRef.current, { id, deletedAt: Date.now() }];
        return commitSavedPokemon(updated, updatedTombstones);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commitSavedPokemon is stable, see addSavedPokemonBatch above.
    [enqueueMutation],
  );

  /**
   * Queued behind any in-flight mutation so it can't read the disk mid-write
   * and stomp state with a pre-write snapshot - mirrors useTeams.ts::refreshTeams.
   */
  const refreshSavedPokemon = useCallback(
    (): Promise<void> => enqueueMutation(loadSavedPokemonFromDisk),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enqueueMutation],
  );

  const getSavedSetsForSpecies = useCallback(
    (species: string): SavedPokemonEntry[] => {
      const normalized = species.toLowerCase().trim();
      return savedPokemon.filter(
        (e) => e.pokemon.showdownData.species.toLowerCase().trim() === normalized,
      );
    },
    [savedPokemon],
  );

  const applySyncedState = useCallback(
    (records: SavedPokemonEntry[], pushedTombstones: SyncTombstone[]): Promise<boolean> =>
      enqueueMutation(async () => {
        const reconciled = reconcileSyncedSavedPokemon(
          savedPokemonRef.current,
          tombstonesRef.current,
          records,
          pushedTombstones,
        );
        return commitSavedPokemon(reconciled.entries, reconciled.tombstones);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- commitSavedPokemon is stable, see addSavedPokemonBatch above.
    [enqueueMutation],
  );

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
    setSavedPokemonOrder,
    updateSavedPokemon,
    applyPokedexNumberFixes,
    deleteSavedPokemon,
    refreshSavedPokemon,
    getSavedSetsForSpecies,
    tombstones,
    applySyncedState,
  };
}
