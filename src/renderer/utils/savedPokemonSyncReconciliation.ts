/**
 * Pure reconciliation algorithm behind useSavedPokemon.ts's applySyncedState,
 * split out so it can be unit tested without React (TODO.md's "Split
 * useSavedPokemon.ts" leg) - mirrors utils/teamSyncReconciliation.ts's
 * per-entry/per-tombstone rules (same race, same fix; see that file's own
 * doc comment for the full rationale, including the TeamCard Notes blur race
 * and the resurrect-after-delete fix).
 *
 * Whichever side the merge picks runs through
 * normalizeIncomingSyncSavedPokemonEntry before landing in the result
 * whenever it's a `records` entry (never a local one, already normalized on
 * its own last load) - mirrors reconcileSyncedTeams's own
 * normalizeIncomingSyncTeam call; see
 * .claude/rules/sync-merge-migration-parity.md for why a load-path migration
 * needs this sync-merge-path mirror too. `remote.updatedAt > local.updatedAt`/
 * the unmatched-remote filter below both still compare the *raw* incoming
 * `updatedAt`, since normalizing first would let a stale remote record win
 * just by being newly reshaped.
 */

import type { SavedPokemonEntry, SyncTombstone } from '../types/pokemon';
import { normalizeIncomingSyncSavedPokemonEntry } from './savedPokemonMigrations';

export interface ReconciledSavedPokemonSyncState {
  entries: SavedPokemonEntry[];
  tombstones: SyncTombstone[];
}

/**
 * Reconciles local savedPokemon/tombstones with a sync merge's result
 * (useSync.ts::syncNow, via useSavedPokemon.ts's applySyncedState). Per
 * entry, keeps whichever side has the newer `updatedAt`; keeps any
 * local-only entry `records` doesn't know about yet, preserving its local
 * list position rather than appending it; drops a `records` entry whose id
 * still has a pending local tombstone instead of letting a locally-deleted
 * entry resurrect. Only tombstones named in `pushedTombstones` (the ones
 * this push actually answers) get cleared from `localTombstones`.
 */
export function reconcileSyncedSavedPokemon(
  localEntries: SavedPokemonEntry[],
  localTombstones: SyncTombstone[],
  records: SavedPokemonEntry[],
  pushedTombstones: SyncTombstone[],
): ReconciledSavedPokemonSyncState {
  const remoteById = new Map(records.map((e) => [e.id, e]));
  const localIds = new Set(localEntries.map((e) => e.id));
  const tombstonedIds = new Set(localTombstones.map((t) => t.id));
  const entries = [
    ...localEntries.map((local) => {
      const remote = remoteById.get(local.id);
      return remote && remote.updatedAt > local.updatedAt
        ? normalizeIncomingSyncSavedPokemonEntry(remote)
        : local;
    }),
    ...records
      .filter((remote) => !localIds.has(remote.id) && !tombstonedIds.has(remote.id))
      .map(normalizeIncomingSyncSavedPokemonEntry),
  ];
  const pushedIds = new Set(pushedTombstones.map((t) => t.id));
  const tombstones = localTombstones.filter((t) => !pushedIds.has(t.id));

  return { entries, tombstones };
}
