/**
 * Pure reconciliation algorithm behind useTeams.ts's applySyncedState, split
 * out so it can be unit tested without React (TODO.md's "Split useTeams.ts"
 * leg) - see rules/typescript.md's "pure logic lives outside hooks"
 * convention.
 */

import type { SyncTombstone, Team } from '../types/pokemon';
import { normalizeIncomingSyncTeam } from './teamMigrations';

export interface ReconciledSyncState {
  teams: Team[];
  tombstones: SyncTombstone[];
}

/**
 * Reconciles local teams/tombstones with a sync merge's result
 * (useSync.ts::syncNow, via useTeams.ts's applySyncedState).
 *
 * `records` is a snapshot from whenever useSync.ts's debounced push
 * captured `teamsState.teams` - by the time this resolves (a full
 * network round-trip later), a real local mutation (e.g. a notes-field
 * blur) can have already landed on `localTeams` via useTeams.ts's
 * enqueueMutation queue, ahead of this call. Blindly overwriting with
 * `records` would silently discard that newer local edit even though the
 * queue ran it first - this was TODO.md's "TeamCard Notes: Data Loss on
 * First Blur After Expand" (see
 * docs/investigations/teamcard-notes-sync-race.md): typing notes right
 * after some other roster edit (which schedules the debounced sync)
 * landed inside that sync's in-flight window often enough to be a real,
 * reproducible bug, not just a hypothetical one.
 *
 * Fix: per team, keep whichever side has the newer `updatedAt` - the
 * sync's merge wins for everything nothing raced locally, and a team
 * that got a genuinely newer local write during the round-trip keeps
 * that write until the *next* sync cycle (debounced off the resulting
 * `teams` reference change) pushes it for real. Also keeps any local-only
 * team `records` doesn't know about yet (e.g. `addTeam` mid-flight) -
 * same overwrite flaw, one `records.map` away from silently dropping a
 * brand-new team instead of just a field.
 *
 * `/leg-review` on that fix found the same race applies to deletes: a
 * `records` entry whose id is missing from `localById` also matches a
 * team that was deleted locally (via `deleteTeam`) after the push
 * snapshot was taken but before this response landed - the old
 * `local ?? remote` fallback would resurrect it. Those ids are now
 * dropped instead of falling back to `remote` whenever they still have a
 * pending tombstone. And since that fresh tombstone was never part of
 * the push this response answers, only the tombstones named in
 * `pushedTombstones` get cleared here - an unconditional clear would
 * discard the very tombstone that needs to tell the server about the
 * deletion on the next sync.
 *
 * The reconciled teams' base order walks `localTeams` (local order), not
 * `records` (remote order), specifically so a team this device added but
 * hasn't round-tripped back as a `records` entry yet keeps its local
 * position instead of landing at the end. This was TODO.md's
 * "applySyncedState Reconciliation Loses Local-Only Team's List
 * Position", confirmed live as the real cause of the Paste Team
 * card-jump bug: a freshly pasted/imported team has no `sortOrder` yet
 * (see teamPaste.ts::buildPastedTeam), so `teamSort.ts`'s tiebreaker
 * falls straight through to this array's own element order to decide
 * where it sits - and the very next auto-sync round-trip was rewriting
 * that order out from under it, shoving it to the bottom the moment this
 * ran. Only records this device has no local copy of at all (added on
 * another device) fall back to being appended at the end, since there's
 * no local position to preserve for those.
 *
 * Whichever side the merge picks runs through normalizeIncomingSyncTeam
 * before landing in the result whenever it's a `records` entry (never a
 * local one, already normalized on its own last load) -
 * `remote.updatedAt > local.updatedAt`/the unmatched-remote filter below
 * both still compare the *raw* incoming `updatedAt`, since normalizing
 * first would let a stale remote record win just by being newly
 * reshaped.
 */
export function reconcileSyncedTeams(
  localTeams: Team[],
  localTombstones: SyncTombstone[],
  records: Team[],
  pushedTombstones: SyncTombstone[],
): ReconciledSyncState {
  const rawRemoteById = new Map(records.map((t) => [t.id, t]));
  const localIds = new Set(localTeams.map((t) => t.id));
  const tombstonedIds = new Set(localTombstones.map((t) => t.id));
  const teams = [
    ...localTeams.map((local) => {
      const rawRemote = rawRemoteById.get(local.id);
      return rawRemote && rawRemote.updatedAt > local.updatedAt
        ? normalizeIncomingSyncTeam(rawRemote)
        : local;
    }),
    ...records
      .filter((remote) => !localIds.has(remote.id) && !tombstonedIds.has(remote.id))
      .map(normalizeIncomingSyncTeam),
  ];
  const pushedIds = new Set(pushedTombstones.map((t) => t.id));
  const tombstones = localTombstones.filter((t) => !pushedIds.has(t.id));

  return { teams, tombstones };
}
