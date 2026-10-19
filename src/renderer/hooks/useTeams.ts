/**
 * useTeams Hook - Team CRUD Operations Manager
 * Coordinates all macro CRUD actions for active team configurations data array
 * Handles insertion, updates, deletion via preload bridge, and UI expansion state
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { SyncTombstone, Team, TeamsDatabase } from '../types/pokemon';
import { getStorageAdapter } from '../services/storage';
import {
  TEAMS_SCHEMA_VERSION,
  computeNormalizationFixes,
  migrateTeamsDatabase,
  normalizeTeam,
} from '../utils/teamMigrations';
import { reconcileSyncedTeams } from '../utils/teamSyncReconciliation';

export interface UseTeamsReturn {
  teams: Team[];
  isLoading: boolean;
  error: string | null;
  expandedCardIds: Set<string>;

  // Pending deletes not yet confirmed synced (see TODO.md's Sync Data Model
  // leg) - included in the next sync push, then cleared by applySyncedState.
  tombstones: SyncTombstone[];

  // CRUD operations
  addTeam: (team: Team) => Promise<boolean>;
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<boolean>;
  deleteTeam: (teamId: string) => Promise<boolean>;
  /**
   * Overwrites the full stored team order to match `orderedIds` (Touch
   * Drag-and-Drop: Framer Motion Reorder Leg 1, see TODO.md) - called once
   * per completed drag by TeamsPage.tsx's framer-motion Reorder.Group, same
   * shape as useSavedPokemon.ts::setSavedPokemonOrder. Operates on the full
   * (unfiltered) `teams` array by ID, not by position in whatever filtered
   * view TeamsPage.tsx happens to be showing - dragging is gated off there
   * whenever a format filter is hiding any teams, so in practice `orderedIds`
   * always names every team; any id it doesn't name (shouldn't happen)
   * keeps its existing relative order, appended after the given ones.
   */
  setTeamOrder: (orderedIds: string[]) => Promise<boolean>;
  /**
   * Stamps an ascending `profileOrder` on exactly the teams named in
   * `orderedIds` (Drag-to-Rearrange Previewed Teams, see TODO.md) - called
   * once per completed drag on your own profile page (ProfilePage.tsx), same
   * shape as setTeamOrder above but deliberately not reusing its `sortOrder`
   * field or reordering this array's own element order: the private Teams
   * tab's order (sortTeams.ts) must stay untouched by a public-profile-only
   * reorder. `orderedIds` only ever names the teams currently shown on the
   * profile preview (closed/open visibility) - any other team is left
   * completely alone (no profileOrder/updatedAt stamp at all), unlike
   * setTeamOrder's leftover-appended handling, since there's no total order
   * to maintain over teams that never appear there.
   */
  setProfileTeamOrder: (orderedIds: string[]) => Promise<boolean>;

  // UI state management
  toggleCardExpansion: (teamId: string) => void;
  expandCard: (teamId: string) => void;
  collapseCard: (teamId: string) => void;
  collapseAllCards: () => void;

  // Utility
  refreshTeams: () => Promise<void>;
  getTeamById: (teamId: string) => Team | undefined;
  /**
   * Reconciles local state with the server-merged result from a sync
   * (useSync.ts::syncNow), via utils/teamSyncReconciliation.ts's
   * reconcileSyncedTeams - see that function's own doc comment for the
   * per-team/per-tombstone rules.
   */
  applySyncedState: (records: Team[], pushedTombstones: SyncTombstone[]) => Promise<boolean>;
}

/**
 * Custom hook for managing team configurations with persistent storage
 * All state changes flow through this hook - never mixed directly in UI markup
 */
export function useTeams(): UseTeamsReturn {
  const [teams, setTeams] = useState<Team[]>([]);
  const [tombstones, setTombstones] = useState<SyncTombstone[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set());

  // Holds whatever computeNormalizationFixes found on the most recent load,
  // for the effect below (declared after updateTeam, which it calls) to
  // flush once loading settles - see that effect's own comment for why this
  // two-step ref handoff exists instead of calling updateTeam directly from
  // the load functions above (updateTeam isn't declared yet at that point
  // in the file, and this project's lint config forbids referencing a
  // same-scope const before its declaration even from a deferred closure).
  const pendingNormalizationFixRef = useRef<{ id: string; updates: Partial<Team> }[]>([]);

  // Mirrors of `teams`/`tombstones` that every mutator below reads as its
  // base instead of the `teams`/`tombstones` closure variables, and a queue
  // serializing every mutation - together these fix the "double action"
  // bug (TODO.md's Team Edit Needs Double Action, and the same root cause
  // behind Export Shows Stale Data/Reverts on Refresh): two mutations fired
  // before React re-renders (StatsColumn's EV hold-to-repeat fires one per
  // interval tick; two quick field edits land the same way) used to both
  // read the *same* stale `teams` closure, each build their own "base +
  // my one change" snapshot, and persist independently - whichever
  // read/write pair happened to finish last won, silently dropping
  // whichever edit lost the race, regardless of which was issued last.
  // Updated synchronously the instant a mutation computes its result (not
  // only once React re-renders), and only ever read/written by code
  // running inside enqueueMutation below, so every mutation's base always
  // reflects every previously-issued one, and the underlying storage
  // writes land in strict issue order too.
  const teamsRef = useRef<Team[]>(teams);
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

  /**
   * Internal: Load teams database from disk via preload bridge. Only called
   * from refreshTeams() now - the mount path below inlines its own copy of
   * this logic (see that effect's comment for why).
   */
  const loadTeamsFromDisk = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const raw = await getStorageAdapter().read<TeamsDatabase>('teams-database');
      const database = raw ? migrateTeamsDatabase(raw) : null;

      const loadedTeams = database ? database.teams.map(normalizeTeam) : [];
      const loadedTombstones = database?.tombstones ?? [];
      teamsRef.current = loadedTeams;
      tombstonesRef.current = loadedTombstones;
      setTeams(loadedTeams);
      setTombstones(loadedTombstones);
      if (database)
        pendingNormalizationFixRef.current = computeNormalizationFixes(database.teams, loadedTeams);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load teams';
      setError(errorMessage);
      console.error('Error loading teams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load teams from disk on mount, inlined rather than calling
   * loadTeamsFromDisk by reference - see
   * docs/investigations/set-state-in-effect-lint-fix.md for why.
   */
  useEffect(() => {
    let ignore = false;

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const raw = await getStorageAdapter().read<TeamsDatabase>('teams-database');
        if (ignore) return;
        const database = raw ? migrateTeamsDatabase(raw) : null;

        const loadedTeams = database ? database.teams.map(normalizeTeam) : [];
        const loadedTombstones = database?.tombstones ?? [];
        teamsRef.current = loadedTeams;
        tombstonesRef.current = loadedTombstones;
        setTeams(loadedTeams);
        setTombstones(loadedTombstones);
        if (database)
          pendingNormalizationFixRef.current = computeNormalizationFixes(
            database.teams,
            loadedTeams,
          );
      } catch (err) {
        if (ignore) return;
        const errorMessage = err instanceof Error ? err.message : 'Failed to load teams';
        setError(errorMessage);
        console.error('Error loading teams:', err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, []);

  /**
   * Internal: Persist current teams + pending tombstones state to disk
   */
  const persistTeamsToDisk = async (
    updatedTeams: Team[],
    updatedTombstones: SyncTombstone[],
  ): Promise<boolean> => {
    try {
      const database: TeamsDatabase = {
        schemaVersion: TEAMS_SCHEMA_VERSION,
        teams: updatedTeams,
        tombstones: updatedTombstones,
        lastModified: Date.now(),
      };

      const success = await getStorageAdapter().write('teams-database', database);

      if (!success) {
        throw new Error('Failed to write teams database');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save teams';
      setError(errorMessage);
      console.error('Error persisting teams:', err);
      return false;
    }
  };

  /**
   * Add a newly parsed team block to the database
   */
  const addTeam = useCallback(
    (team: Team): Promise<boolean> =>
      enqueueMutation(async () => {
        const updatedTeams = [team, ...teamsRef.current];
        const success = await persistTeamsToDisk(updatedTeams, tombstonesRef.current);

        if (success) {
          teamsRef.current = updatedTeams;
          setTeams(updatedTeams);
          setError(null);
        }

        return success;
      }),
    [enqueueMutation],
  );

  /**
   * Update an existing team configuration
   */
  const updateTeam = useCallback(
    (teamId: string, updates: Partial<Team>): Promise<boolean> =>
      enqueueMutation(async () => {
        const base = teamsRef.current;
        const teamIndex = base.findIndex((t) => t.id === teamId);

        if (teamIndex === -1) {
          setError(`Team with ID ${teamId} not found`);
          return false;
        }

        const updatedTeams = [...base];
        updatedTeams[teamIndex] = {
          ...updatedTeams[teamIndex],
          ...updates,
          updatedAt: Date.now(),
        };

        const success = await persistTeamsToDisk(updatedTeams, tombstonesRef.current);

        if (success) {
          teamsRef.current = updatedTeams;
          setTeams(updatedTeams);
          setError(null);
        }

        return success;
      }),
    [enqueueMutation],
  );

  // Flushes computeNormalizationFixes' findings (stashed in
  // pendingNormalizationFixRef by whichever load path just ran) once
  // loading settles, routing each fix through the real updateTeam mutator
  // so it bumps updatedAt and persists to disk for real - see
  // pendingNormalizationFixRef's own comment and normalizeTeam's doc
  // comment for why a read-boundary-only fix isn't enough on its own
  // (TODO.md's Roster Picker leg has the full trail; this leg's own
  // isPublic-to-visibility migration needs the same treatment). Each
  // affected team is independently queued through updateTeam's own
  // enqueueMutation, so multiple fixes in one load don't race each other.
  useEffect(() => {
    if (isLoading) return;
    const pending = pendingNormalizationFixRef.current;
    if (pending.length === 0) return;
    pendingNormalizationFixRef.current = [];
    for (const fix of pending) void updateTeam(fix.id, fix.updates);
  }, [isLoading, updateTeam]);

  /**
   * Delete a targeted team configuration from disk storage. Also records a
   * tombstone (see TODO.md's Sync Data Model leg) so a future sync merge
   * knows this id was intentionally removed here, rather than just never
   * seen - cleared once that's confirmed synced (applySyncedState below).
   */
  const deleteTeam = useCallback(
    (teamId: string): Promise<boolean> =>
      enqueueMutation(async () => {
        const updatedTeams = teamsRef.current.filter((t) => t.id !== teamId);
        const updatedTombstones = [...tombstonesRef.current, { id: teamId, deletedAt: Date.now() }];
        const success = await persistTeamsToDisk(updatedTeams, updatedTombstones);

        if (success) {
          teamsRef.current = updatedTeams;
          tombstonesRef.current = updatedTombstones;
          setTeams(updatedTeams);
          setTombstones(updatedTombstones);
          setError(null);

          // Clean up expansion state for deleted team
          setExpandedCardIds((prev) => {
            const next = new Set(prev);
            next.delete(teamId);
            return next;
          });
        }

        return success;
      }),
    [enqueueMutation],
  );

  const setTeamOrder = useCallback(
    (orderedIds: string[]): Promise<boolean> =>
      enqueueMutation(async () => {
        const base = teamsRef.current;
        const byId = new Map(base.map((t) => [t.id, t]));
        const ordered = orderedIds
          .map((id) => byId.get(id))
          .filter((t): t is Team => t !== undefined);
        const orderedIdSet = new Set(ordered.map((t) => t.id));
        const leftover = base.filter((t) => !orderedIdSet.has(t.id));
        // sortOrder/updatedAt are stamped on every team here, not just the ones
        // that visually moved - see Team.sortOrder's doc comment for why this
        // needs to be its own last-write-wins record field at all: the Worker's
        // per-record merge has no concept of list position, so a reorder that
        // only lived in this array's element order would be silently discarded
        // by the next auto-sync round-trip.
        const now = Date.now();
        const updatedTeams = [...ordered, ...leftover].map((team, index) => ({
          ...team,
          sortOrder: index,
          updatedAt: now,
        }));

        const success = await persistTeamsToDisk(updatedTeams, tombstonesRef.current);
        if (success) {
          teamsRef.current = updatedTeams;
          setTeams(updatedTeams);
          setError(null);
        }
        return success;
      }),
    [enqueueMutation],
  );

  const setProfileTeamOrder = useCallback(
    (orderedIds: string[]): Promise<boolean> =>
      enqueueMutation(async () => {
        const orderById = new Map(orderedIds.map((id, index) => [id, index]));
        const now = Date.now();
        const updatedTeams = teamsRef.current.map((team) => {
          const index = orderById.get(team.id);
          if (index === undefined) return team;
          return { ...team, profileOrder: index, updatedAt: now };
        });

        const success = await persistTeamsToDisk(updatedTeams, tombstonesRef.current);
        if (success) {
          teamsRef.current = updatedTeams;
          setTeams(updatedTeams);
          setError(null);
        }
        return success;
      }),
    [enqueueMutation],
  );

  /**
   * Toggle expansion state for a specific team card
   */
  const toggleCardExpansion = useCallback((teamId: string): void => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }, []);

  /**
   * Expand a specific team card
   */
  const expandCard = useCallback((teamId: string): void => {
    setExpandedCardIds((prev) => new Set(prev).add(teamId));
  }, []);

  /**
   * Collapse a specific team card
   */
  const collapseCard = useCallback((teamId: string): void => {
    setExpandedCardIds((prev) => {
      const next = new Set(prev);
      next.delete(teamId);
      return next;
    });
  }, []);

  /**
   * Collapse all team cards
   */
  const collapseAllCards = useCallback((): void => {
    setExpandedCardIds(new Set());
  }, []);

  /**
   * Manually refresh teams from disk. Queued behind any in-flight mutation
   * (same enqueueMutation as the mutators above) so it can't read the disk
   * mid-write and then stomp teamsRef/state with a pre-write snapshot once
   * that write actually lands.
   */
  const refreshTeams = useCallback(
    (): Promise<void> => enqueueMutation(loadTeamsFromDisk),
    [enqueueMutation],
  );

  /**
   * Get a specific team by ID
   */
  const getTeamById = useCallback(
    (teamId: string): Team | undefined => {
      return teams.find((t) => t.id === teamId);
    },
    [teams],
  );

  /**
   * Reconciles teams with a sync merge's result via
   * utils/teamSyncReconciliation.ts's reconcileSyncedTeams (see
   * UseTeamsReturn's doc comment, and that function's own, for the
   * per-team/per-tombstone rules) and persists the result.
   */
  const applySyncedState = useCallback(
    (records: Team[], pushedTombstones: SyncTombstone[]): Promise<boolean> =>
      enqueueMutation(async () => {
        const reconciled = reconcileSyncedTeams(
          teamsRef.current,
          tombstonesRef.current,
          records,
          pushedTombstones,
        );

        const success = await persistTeamsToDisk(reconciled.teams, reconciled.tombstones);
        if (success) {
          teamsRef.current = reconciled.teams;
          tombstonesRef.current = reconciled.tombstones;
          setTeams(reconciled.teams);
          setTombstones(reconciled.tombstones);
          setError(null);
        }
        return success;
      }),
    [enqueueMutation],
  );

  return {
    teams,
    isLoading,
    error,
    expandedCardIds,
    tombstones,
    addTeam,
    updateTeam,
    deleteTeam,
    setTeamOrder,
    setProfileTeamOrder,
    toggleCardExpansion,
    expandCard,
    collapseCard,
    collapseAllCards,
    refreshTeams,
    getTeamById,
    applySyncedState,
  };
}
