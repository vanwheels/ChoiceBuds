/**
 * Pure load-path migration/normalization logic for SavedPokemonDatabase,
 * split out of useSavedPokemon.ts (TODO.md's "Split useSavedPokemon.ts" leg,
 * mirroring the same "Split useTeams.ts" leg before it) so it can be unit
 * tested without React - see rules/typescript.md's "pure logic lives outside
 * hooks" convention. Used by useSavedPokemon.ts's load path.
 */

import type { SavedPokemonDatabase, SavedPokemonEntry } from '../types/pokemon';
import { fixGenderSplitResourceSpeciesText } from '../config/pokemonRules';

/** Current on-disk shape version for SavedPokemonDatabase - see SavedPokemonDatabase.schemaVersion. */
export const SAVED_POKEMON_SCHEMA_VERSION = 1;

/**
 * Migration hook point for SavedPokemonDatabase - runs once per load,
 * before normalizeSavedPokemon's per-entry backfills below. No migrations
 * exist yet (schemaVersion 1 is the first version); a future on-disk shape
 * change bumps SAVED_POKEMON_SCHEMA_VERSION and adds its upgrade step here,
 * keyed off database.schemaVersion. A database persisted before
 * schemaVersion existed is treated as version 1.
 */
export function migrateSavedPokemonDatabase(database: SavedPokemonDatabase): SavedPokemonDatabase {
  return { ...database, schemaVersion: database.schemaVersion ?? SAVED_POKEMON_SCHEMA_VERSION };
}

/**
 * Self-heals a single Box entry whose species was stored as PokeAPI's raw
 * "-Male"/"-Female" resource text (fixGenderSplitResourceSpeciesText, see
 * its own doc comment and TODO.md's Roster Picker leg), at the read
 * boundary - same never-eagerly-persisted treatment as useTeams.ts's own
 * normalizeTeam. Split out (singular) so normalizeIncomingSyncSavedPokemonEntry
 * below can run the same fix on one sync-merge-sourced entry at a time,
 * mirroring teamMigrations.ts's normalizeTeam/normalizeIncomingSyncTeam split.
 */
function normalizeSavedPokemonEntry(entry: SavedPokemonEntry): SavedPokemonEntry {
  return {
    ...entry,
    pokemon: {
      ...entry.pokemon,
      showdownData: {
        ...entry.pokemon.showdownData,
        species: fixGenderSplitResourceSpeciesText(entry.pokemon.showdownData.species),
      },
    },
  };
}

/** Maps normalizeSavedPokemonEntry over the whole load-path collection. */
export function normalizeSavedPokemon(entries: SavedPokemonEntry[]): SavedPokemonEntry[] {
  return entries.map(normalizeSavedPokemonEntry);
}

/**
 * Whether normalizeSavedPokemonEntry actually changed something sync-relevant
 * (species text) between a raw entry and its normalized result - mirrors
 * teamMigrations.ts's normalizationChangedSyncRelevantFields, same reason:
 * telling a sync-relevant fix apart from a no-op normalize.
 */
function normalizationChangedSyncRelevantFields(
  raw: SavedPokemonEntry,
  fixed: SavedPokemonEntry,
): boolean {
  return raw.pokemon.showdownData.species !== fixed.pokemon.showdownData.species;
}

/**
 * Runs a sync-merge-sourced entry (savedPokemonSyncReconciliation.ts's
 * reconcileSyncedSavedPokemon `records`, which can originate from a device
 * still running pre-migration code) through the same normalizeSavedPokemonEntry
 * path the load path uses, so a legacy-shaped entry pulled down mid-sync
 * reads correctly immediately rather than only after this device's next full
 * reload - mirrors teamMigrations.ts's normalizeIncomingSyncTeam. Bumps
 * `updatedAt` to now only when normalization changed something sync-relevant,
 * so the corrected copy can out-rank the still-stale sender on this device's
 * next push.
 */
export function normalizeIncomingSyncSavedPokemonEntry(raw: SavedPokemonEntry): SavedPokemonEntry {
  const normalized = normalizeSavedPokemonEntry(raw);
  return normalizationChangedSyncRelevantFields(raw, normalized)
    ? { ...normalized, updatedAt: Date.now() }
    : normalized;
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
export function bumpUpdatedAtForFixedEntries(
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

export interface LoadedSavedPokemonDatabase {
  entries: SavedPokemonEntry[];
  tombstones: SavedPokemonDatabase['tombstones'];
  /** Whether `entries` differs from a plain re-normalize of the raw disk read, so the caller knows to persist it for real (see bumpUpdatedAtForFixedEntries's own doc comment). */
  needsPersist: boolean;
}

/**
 * Runs a raw disk read through migrateSavedPokemonDatabase/
 * normalizeSavedPokemon/bumpUpdatedAtForFixedEntries in one call - shared by
 * useSavedPokemon.ts's two load call sites (the mount effect and
 * refreshSavedPokemon's loadSavedPokemonFromDisk), which otherwise each
 * duplicated this same sequence inline.
 */
export function loadSavedPokemonDatabase(
  raw: SavedPokemonDatabase | null,
): LoadedSavedPokemonDatabase {
  const database = raw ? migrateSavedPokemonDatabase(raw) : null;
  if (!database) {
    return { entries: [], tombstones: [], needsPersist: false };
  }

  const normalized = normalizeSavedPokemon(database.savedPokemon);
  const fixed = bumpUpdatedAtForFixedEntries(database.savedPokemon, normalized);
  return {
    entries: fixed,
    tombstones: database.tombstones ?? [],
    needsPersist: fixed.some((e, i) => e !== normalized[i]),
  };
}
