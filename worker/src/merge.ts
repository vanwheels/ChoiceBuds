/**
 * Pure per-record merge logic for the sync Worker's PUT endpoint - split out
 * of index.ts so it's unit-testable without a KV/fetch harness (see
 * merge.test.ts), same pattern as crypto.ts.
 *
 * Replaces the old whole-blob-overwrite model: each collection (teams,
 * battles, savedPokemon) is merged record-by-record, last-write-wins by
 * `updatedAt`, with deletes tracked via a tombstone (see the renderer's
 * types/pokemon.ts::SyncTombstone) so a merge can tell "deleted on one
 * side" apart from "never seen on that side." Full CRDT-style merging is
 * overkill for this app's scale (docs/investigations/web-version-scope.md).
 */

export interface SyncTombstone {
  id: string;
  deletedAt: number;
}

interface HasIdAndUpdatedAt {
  id: string;
  updatedAt: number;
}

export interface MergeResult<T> {
  records: T[];
  tombstones: SyncTombstone[];
}

/**
 * Merges one collection's existing (server-stored) state against one side's
 * incoming push. For any id tombstoned on either side, the more recent of
 * its `deletedAt` vs. the record's `updatedAt` wins - an edit after a delete
 * resurrects the record (and drops it back out of the merged tombstone set),
 * matching plain last-write-wins semantics. For every other id, whichever
 * side's `updatedAt` is newer survives (or the only side that has it).
 */
export function mergeCollection<T extends HasIdAndUpdatedAt>(
  existingRecords: T[],
  existingTombstones: SyncTombstone[],
  incomingRecords: T[],
  incomingTombstones: SyncTombstone[]
): MergeResult<T> {
  const recordsById = new Map<string, T>();
  for (const record of existingRecords) recordsById.set(record.id, record);
  for (const record of incomingRecords) {
    const current = recordsById.get(record.id);
    if (!current || record.updatedAt > current.updatedAt) {
      recordsById.set(record.id, record);
    }
  }

  const tombstonesById = new Map<string, SyncTombstone>();
  for (const tombstone of existingTombstones) tombstonesById.set(tombstone.id, tombstone);
  for (const tombstone of incomingTombstones) {
    const current = tombstonesById.get(tombstone.id);
    if (!current || tombstone.deletedAt > current.deletedAt) {
      tombstonesById.set(tombstone.id, tombstone);
    }
  }

  for (const tombstone of tombstonesById.values()) {
    const record = recordsById.get(tombstone.id);
    if (!record) continue;
    if (record.updatedAt > tombstone.deletedAt) {
      // An edit after the delete resurrects the record - drop the stale tombstone.
      tombstonesById.delete(tombstone.id);
    } else {
      recordsById.delete(tombstone.id);
    }
  }

  return {
    records: Array.from(recordsById.values()),
    tombstones: Array.from(tombstonesById.values()),
  };
}
