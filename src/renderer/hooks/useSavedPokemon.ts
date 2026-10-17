/**
 * useSavedPokemon Hook - Saved Individual Pokémon Set CRUD
 * A flat library of standalone Pokémon sets (savedPokemon.json), distinct
 * from useTeams.ts's fixed 6-slot Team roster - lets the Calc page save any
 * imported/configured Pokémon individually and reload it later by species.
 * Mirrors useTeams.ts's load/persist/CRUD shape exactly, same "every mutation
 * writes through to disk before updating in-memory state" convention.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  ImportedPokemonInfo,
  SavedPokemonEntry,
  SavedPokemonDatabase,
  SyncTombstone,
} from '../types/pokemon';
import { getStorageAdapter } from '../services/storage';
import { fixGenderSplitResourceSpeciesText } from '../config/pokemonRules';

/**
 * Self-heals any Box entry whose species was stored as PokeAPI's raw
 * "-Male"/"-Female" resource text (fixGenderSplitResourceSpeciesText, see
 * its own doc comment and TODO.md's Roster Picker leg), at the read
 * boundary - same never-eagerly-persisted treatment as useTeams.ts's own
 * normalizeTeam.
 */
function normalizeSavedPokemon(entries: SavedPokemonEntry[]): SavedPokemonEntry[] {
  return entries.map((entry) => ({
    ...entry,
    pokemon: {
      ...entry.pokemon,
      showdownData: {
        ...entry.pokemon.showdownData,
        species: fixGenderSplitResourceSpeciesText(entry.pokemon.showdownData.species),
      },
    },
  }));
}

/**
 * Bumps `updatedAt` on any entry normalizeSavedPokemon above actually
 * changed, by comparing against the RAW pre-normalize data - normalizeSavedPokemon's
 * read-boundary fix alone isn't enough: worker/src/merge.ts's mergeCollection
 * requires a push's `updatedAt` to be strictly greater than the Worker's own
 * stored copy to win a merge, so a same-timestamp corrected-but-never-
 * persisted entry can never actually overwrite the Worker's still-bad copy -
 * the very next auto-sync pull just hands the bad text straight back (see
 * TODO.md's Roster Picker leg for the full trail, including the same issue
 * on the Teams side). Entries that didn't need fixing keep their exact
 * object reference, so a caller can cheaply detect "did anything change" via
 * reference comparison against `normalizedEntries` rather than re-diffing.
 */
function bumpUpdatedAtForFixedEntries(
  rawEntries: SavedPokemonEntry[],
  normalizedEntries: SavedPokemonEntry[],
): SavedPokemonEntry[] {
  const now = Date.now();
  return normalizedEntries.map((entry, i) => {
    const rawSpecies = rawEntries[i]?.pokemon.showdownData.species;
    return rawSpecies !== undefined && rawSpecies !== entry.pokemon.showdownData.species
      ? { ...entry, updatedAt: now }
      : entry;
  });
}

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
  addSavedPokemonBatch: (
    pokemonList: ImportedPokemonInfo[],
    labels?: string[],
    ids?: string[],
  ) => Promise<boolean>;
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
   * Overwrites the full stored order to match `orderedIds` (Box Tab:
   * Reorder, see TODO.md). Two callers: BoxPage.tsx's sort-mode toggle seeds
   * Custom mode's first-ever order from whatever the Alphabetical view was
   * showing at the moment of the switch (see AppSettings.boxCustomOrderSeeded)
   * so flipping modes doesn't visually jump the grid; BoxCard.tsx's
   * framer-motion Reorder.Group (Touch Drag-and-Drop: Framer Motion Reorder
   * Leg 1, see TODO.md) calls it once per completed drag with the grid's
   * full new visual order. Only meaningful when BoxPage.tsx's sort mode is
   * 'custom' - dragging while Alphabetical is selected is gated at the UI
   * layer (BoxCard.tsx/BoxPage.tsx), not here. Any id not present in
   * orderedIds (shouldn't happen in practice) keeps its existing relative
   * order, appended after the given ids, so nothing is silently dropped -
   * this is also why the drag-based caller only wires up when nothing's
   * hidden by an active search filter (see BoxPage.tsx), so "the given ids"
   * always means "every entry".
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
  /**
   * Bulk `nationalDexNumber` backfill for usePokedexNumberSelfHeal.ts (see
   * TODO.md's Pokedex Number Wrong For Forms leg) - one batched write for
   * every affected entry at once, not N individual updateSavedPokemon
   * calls (see its own doc comment for why that's still preferable).
   */
  applyPokedexNumberFixes: (fixes: { id: string; nationalDexNumber: number }[]) => Promise<boolean>;
  deleteSavedPokemon: (id: string) => Promise<boolean>;
  refreshSavedPokemon: () => Promise<void>;
  getSavedSetsForSpecies: (species: string) => SavedPokemonEntry[];

  // Pending deletes not yet confirmed synced (see TODO.md's Sync Data Model
  // leg) - included in the next sync push, then cleared by applySyncedState.
  tombstones: SyncTombstone[];
  /**
   * Reconciles local state with a sync merge's result - mirrors
   * useTeams.ts::applySyncedState exactly (same race, same fix; see its own
   * doc comment and docs/investigations/teamcard-notes-sync-race.md for the
   * full rationale). Per entry, keeps whichever side has the newer
   * `updatedAt`; keeps any local-only entry `records` doesn't know about
   * yet, preserving its local list position rather than appending it;
   * drops a `records` entry whose id still has a pending local tombstone
   * instead of letting a locally-deleted entry resurrect. `pushedTombstones`
   * is the tombstone list actually included in the push this response
   * answers - only those are cleared from `tombstones`.
   */
  applySyncedState: (
    records: SavedPokemonEntry[],
    pushedTombstones: SyncTombstone[],
  ) => Promise<boolean>;
}

/** Current on-disk shape version for SavedPokemonDatabase - see SavedPokemonDatabase.schemaVersion. */
const SAVED_POKEMON_SCHEMA_VERSION = 1;

/**
 * Migration hook point for SavedPokemonDatabase - runs once per load,
 * before normalizeSavedPokemon's per-entry backfills below. No migrations
 * exist yet (schemaVersion 1 is the first version); a future on-disk shape
 * change bumps SAVED_POKEMON_SCHEMA_VERSION and adds its upgrade step here,
 * keyed off database.schemaVersion. A database persisted before
 * schemaVersion existed is treated as version 1.
 */
function migrateSavedPokemonDatabase(database: SavedPokemonDatabase): SavedPokemonDatabase {
  return { ...database, schemaVersion: database.schemaVersion ?? SAVED_POKEMON_SCHEMA_VERSION };
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
  // its base instead of the `savedPokemon`/`tombstones` closure variables,
  // plus a queue serializing every mutation - same useTeams.ts-style
  // ref+queue fix for the lost-update race (see
  // docs/investigations/sibling-hooks-lost-update-audit.md): two mutations
  // fired before React re-renders used to both read the same stale
  // `savedPokemon` closure, each build their own "base + my one change"
  // snapshot, and persist independently, silently dropping whichever edit
  // lost the race. Updated synchronously the instant a mutation computes its
  // result, and only ever read/written by code running inside
  // enqueueMutation below.
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

  // Moved above loadSavedPokemonFromDisk/the mount effect below (both of
  // which now call it directly to persist the gender-split species fix for
  // real) - this project's lint config forbids referencing a same-scope
  // const before its declaration even from a deferred async closure.
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
   * Internal: Load saved Pokemon from disk via preload bridge. Only called
   * from refreshSavedPokemon() now - the mount path below inlines its own
   * copy of this logic (see that effect's comment for why).
   */
  const loadSavedPokemonFromDisk = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const raw = await getStorageAdapter().read<SavedPokemonDatabase>('saved-pokemon-database');
      const database = raw ? migrateSavedPokemonDatabase(raw) : null;

      if (database) {
        const normalized = normalizeSavedPokemon(database.savedPokemon);
        const fixed = bumpUpdatedAtForFixedEntries(database.savedPokemon, normalized);
        const loadedTombstones = database.tombstones ?? [];
        savedPokemonRef.current = fixed;
        tombstonesRef.current = loadedTombstones;
        setSavedPokemon(fixed);
        setTombstones(loadedTombstones);
        if (fixed.some((e, i) => e !== normalized[i])) {
          void persistSavedPokemonToDisk(fixed, loadedTombstones);
        }
      } else {
        savedPokemonRef.current = [];
        tombstonesRef.current = [];
        setSavedPokemon([]);
        setTombstones([]);
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
        const raw = await getStorageAdapter().read<SavedPokemonDatabase>('saved-pokemon-database');
        if (ignore) return;
        const database = raw ? migrateSavedPokemonDatabase(raw) : null;

        if (database) {
          const normalized = normalizeSavedPokemon(database.savedPokemon);
          const fixed = bumpUpdatedAtForFixedEntries(database.savedPokemon, normalized);
          const loadedTombstones = database.tombstones ?? [];
          savedPokemonRef.current = fixed;
          tombstonesRef.current = loadedTombstones;
          setSavedPokemon(fixed);
          setTombstones(loadedTombstones);
          if (fixed.some((e, i) => e !== normalized[i])) {
            void persistSavedPokemonToDisk(fixed, loadedTombstones);
          }
        } else {
          savedPokemonRef.current = [];
          tombstonesRef.current = [];
          setSavedPokemon([]);
          setTombstones([]);
        }
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
        const success = await persistSavedPokemonToDisk(updated, tombstonesRef.current);

        if (success) {
          savedPokemonRef.current = updated;
          setSavedPokemon(updated);
          setError(null);
        }

        return success;
      }),
    [enqueueMutation],
  );

  const renameSavedPokemon = useCallback(
    (id: string, label: string): Promise<boolean> =>
      enqueueMutation(async () => {
        const base = savedPokemonRef.current;
        const index = base.findIndex((e) => e.id === id);
        if (index === -1) {
          setError(`Saved Pokemon set with ID ${id} not found`);
          return false;
        }

        const updated = [...base];
        updated[index] = { ...updated[index], label, updatedAt: Date.now() };

        const success = await persistSavedPokemonToDisk(updated, tombstonesRef.current);

        if (success) {
          savedPokemonRef.current = updated;
          setSavedPokemon(updated);
          setError(null);
        }

        return success;
      }),
    [enqueueMutation],
  );

  const toggleSavedPokemonFavorite = useCallback(
    (id: string): Promise<boolean> =>
      enqueueMutation(async () => {
        const base = savedPokemonRef.current;
        const index = base.findIndex((e) => e.id === id);
        if (index === -1) {
          setError(`Saved Pokemon set with ID ${id} not found`);
          return false;
        }

        const updated = [...base];
        updated[index] = {
          ...updated[index],
          favorite: !updated[index].favorite,
          updatedAt: Date.now(),
        };

        const success = await persistSavedPokemonToDisk(updated, tombstonesRef.current);

        if (success) {
          savedPokemonRef.current = updated;
          setSavedPokemon(updated);
          setError(null);
        }

        return success;
      }),
    [enqueueMutation],
  );

  const updateSavedPokemon = useCallback(
    (id: string, updates: Partial<ImportedPokemonInfo>): Promise<boolean> =>
      enqueueMutation(async () => {
        const base = savedPokemonRef.current;
        const index = base.findIndex((e) => e.id === id);
        if (index === -1) {
          setError(`Saved Pokemon set with ID ${id} not found`);
          return false;
        }

        const updated = [...base];
        updated[index] = {
          ...updated[index],
          pokemon: { ...updated[index].pokemon, ...updates },
          updatedAt: Date.now(),
        };

        const success = await persistSavedPokemonToDisk(updated, tombstonesRef.current);

        if (success) {
          savedPokemonRef.current = updated;
          setSavedPokemon(updated);
          setError(null);
        }

        return success;
      }),
    [enqueueMutation],
  );

  /**
   * Bulk variant of updateSavedPokemon, for usePokedexNumberSelfHeal.ts's
   * dex-number self-heal (see its own doc comment and TODO.md's Pokedex
   * Number Wrong For Forms leg) - same "one batched call instead of N
   * sequential single calls" reasoning addSavedPokemonBatch's own doc
   * comment already covers: N individual updateSavedPokemon calls fired in
   * a loop would each be enqueued and serialized correctly now (see the
   * ref+queue comment above), but still round-trip through N separate disk
   * writes instead of one.
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

        const success = await persistSavedPokemonToDisk(updated, tombstonesRef.current);

        if (success) {
          savedPokemonRef.current = updated;
          setSavedPokemon(updated);
          setError(null);
        }

        return success;
      }),
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
        const success = await persistSavedPokemonToDisk(updated, tombstonesRef.current);

        if (success) {
          savedPokemonRef.current = updated;
          setSavedPokemon(updated);
          setError(null);
        }

        return success;
      }),
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

        const success = await persistSavedPokemonToDisk(updated, tombstonesRef.current);
        if (success) {
          savedPokemonRef.current = updated;
          setSavedPokemon(updated);
          setError(null);
        }
        return success;
      }),
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
   * Also records a tombstone (see TODO.md's Sync Data Model leg) so a future
   * sync merge knows this id was intentionally removed here - cleared once
   * confirmed synced (applySyncedState below).
   */
  const deleteSavedPokemon = useCallback(
    (id: string): Promise<boolean> =>
      enqueueMutation(async () => {
        const updated = savedPokemonRef.current.filter((e) => e.id !== id);
        const updatedTombstones = [...tombstonesRef.current, { id, deletedAt: Date.now() }];
        const success = await persistSavedPokemonToDisk(updated, updatedTombstones);

        if (success) {
          savedPokemonRef.current = updated;
          tombstonesRef.current = updatedTombstones;
          setSavedPokemon(updated);
          setTombstones(updatedTombstones);
          setError(null);
        }

        return success;
      }),
    [enqueueMutation],
  );

  /**
   * Queued behind any in-flight mutation (same enqueueMutation as the
   * mutators above) so it can't read the disk mid-write and then stomp
   * savedPokemonRef/state with a pre-write snapshot once that write actually
   * lands - mirrors useTeams.ts::refreshTeams.
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
        const remoteById = new Map(records.map((e) => [e.id, e]));
        const localIds = new Set(savedPokemonRef.current.map((e) => e.id));
        const tombstonedIds = new Set(tombstonesRef.current.map((t) => t.id));
        const reconciled = [
          ...savedPokemonRef.current.map((local) => {
            const remote = remoteById.get(local.id);
            return remote && remote.updatedAt > local.updatedAt ? remote : local;
          }),
          ...records.filter((remote) => !localIds.has(remote.id) && !tombstonedIds.has(remote.id)),
        ];
        const pushedIds = new Set(pushedTombstones.map((t) => t.id));
        const remainingTombstones = tombstonesRef.current.filter((t) => !pushedIds.has(t.id));

        const success = await persistSavedPokemonToDisk(reconciled, remainingTombstones);
        if (success) {
          savedPokemonRef.current = reconciled;
          tombstonesRef.current = remainingTombstones;
          setSavedPokemon(reconciled);
          setTombstones(remainingTombstones);
          setError(null);
        }
        return success;
      }),
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
