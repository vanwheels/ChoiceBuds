/**
 * Pure reconciliation algorithm behind useSavedPokemon.ts's applySyncedState,
 * split out so it can be unit tested without React (TODO.md's "Split
 * useSavedPokemon.ts" leg) - mirrors utils/teamSyncReconciliation.ts's
 * per-entry/per-tombstone rules (same race, same fix; see that file's own
 * doc comment for the full rationale, including the TeamCard Notes blur race
 * and the resurrect-after-delete fix).
 *
 * Unlike reconcileSyncedTeams, this does NOT run incoming `records` entries
 * through normalizeSavedPokemon/bumpUpdatedAtForFixedEntries before they can
 * win a merge or get appended - a remote entry from a pre-migration device
 * can still land (and get persisted) with stale/un-migrated data. This gap
 * pre-dates this split (the old inline applySyncedState had the same gap);
 * see .claude/rules/sync-merge-migration-parity.md and TODO.md's
 * Stored-Snapshot Audit leg for the open follow-up.
 */

import type { SavedPokemonEntry, SyncTombstone } from '../types/pokemon';

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
      return remote && remote.updatedAt > local.updatedAt ? remote : local;
    }),
    ...records.filter((remote) => !localIds.has(remote.id) && !tombstonedIds.has(remote.id)),
  ];
  const pushedIds = new Set(pushedTombstones.map((t) => t.id));
  const tombstones = localTombstones.filter((t) => !pushedIds.has(t.id));

  return { entries, tombstones };
}
