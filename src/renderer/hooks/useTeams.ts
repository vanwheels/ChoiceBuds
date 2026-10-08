/**
 * useTeams Hook - Team CRUD Operations Manager
 * Coordinates all macro CRUD actions for active team configurations data array
 * Handles insertion, updates, deletion via preload bridge, and UI expansion state
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ImportedPokemonInfo, SyncTombstone, Team, TeamsDatabase } from '../types/pokemon';
import { getStorageAdapter } from '../services/storage';

/**
 * Leading "Reg M-A "/"Reg M-B "/"Reg M-C " prefix this app used to stamp
 * onto a team's display name. Nothing writes this prefix anymore, so a
 * team.name still carrying it is stale data from before the change - see
 * TODO.md's "Team Name Field Reg-Prefix Display" item. One-time migration:
 * stripped at the read boundary below, not tracked as an ongoing concern.
 */
const REG_PREFIX_PATTERN = /^Reg M-[ABC] /;

/**
 * Backfills a per-Pokemon `id` for teams persisted before that field existed
 * (added for the roster drag-reorder animation, leg 4 - see TODO.md and
 * ImportedPokemonInfo's own doc comment), at the read boundary - same
 * pattern as useBattles.ts's normalizeBattle. Never written back to disk
 * proactively; a team just picks up real ids the next time it's saved
 * through any normal mutation (addTeam/updateTeam/setTeamOrder all persist
 * the full `teams` array state, which holds these backfilled ids).
 */
function normalizeTeam(team: Team & { pokemon: (ImportedPokemonInfo & { id?: string })[] }): Team {
  return {
    ...team,
    name: team.name.replace(REG_PREFIX_PATTERN, ''),
    pokemon: team.pokemon.map(p => ({ ...p, id: p.id ?? crypto.randomUUID() })),
  };
}

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

  // UI state management
  toggleCardExpansion: (teamId: string) => void;
  expandCard: (teamId: string) => void;
  collapseCard: (teamId: string) => void;
  collapseAllCards: () => void;

  // Utility
  refreshTeams: () => Promise<void>;
  getTeamById: (teamId: string) => Team | undefined;
  /**
   * Overwrites the full local team list with the server-merged result from a
   * sync (useSync.ts::syncNow) - the given records are stored exactly as
   * given (no updatedAt/createdAt rewriting, since they're already the
   * authoritative merged values) and tombstones is cleared, since the Worker
   * has now durably recorded whatever was pending.
   */
  applySyncedState: (records: Team[]) => Promise<boolean>;
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

  const enqueueMutation = useCallback(<T,>(job: () => Promise<T>): Promise<T> => {
    const run = writeQueueRef.current.then(job, job);
    writeQueueRef.current = run.then(() => undefined, () => undefined);
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
      const database = await getStorageAdapter().read<TeamsDatabase>('teams-database');

      const loadedTeams = database ? database.teams.map(normalizeTeam) : [];
      const loadedTombstones = database?.tombstones ?? [];
      teamsRef.current = loadedTeams;
      tombstonesRef.current = loadedTombstones;
      setTeams(loadedTeams);
      setTombstones(loadedTombstones);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load teams';
      setError(errorMessage);
      console.error('Error loading teams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load teams from disk on mount. Inlined (rather than calling
   * loadTeamsFromDisk by reference) to match React's own recognized
   * fetch-in-effect idiom - see docs/investigations/set-state-in-effect-lint-fix.md
   * for why the outer-scope function trips react-hooks/set-state-in-effect
   * even though its behavior here is identical. loadTeamsFromDisk itself is
   * kept as the refreshTeams-only path below.
   */
  useEffect(() => {
    let ignore = false;

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const database = await getStorageAdapter().read<TeamsDatabase>('teams-database');
        if (ignore) return;

        const loadedTeams = database ? database.teams.map(normalizeTeam) : [];
        const loadedTombstones = database?.tombstones ?? [];
        teamsRef.current = loadedTeams;
        tombstonesRef.current = loadedTombstones;
        setTeams(loadedTeams);
        setTombstones(loadedTombstones);
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
  const persistTeamsToDisk = async (updatedTeams: Team[], updatedTombstones: SyncTombstone[]): Promise<boolean> => {
    try {
      const database: TeamsDatabase = {
        version: 1,
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
  const addTeam = useCallback((team: Team): Promise<boolean> => enqueueMutation(async () => {
    const updatedTeams = [team, ...teamsRef.current];
    const success = await persistTeamsToDisk(updatedTeams, tombstonesRef.current);

    if (success) {
      teamsRef.current = updatedTeams;
      setTeams(updatedTeams);
      setError(null);
    }

    return success;
  }), [enqueueMutation]);

  /**
   * Update an existing team configuration
   */
  const updateTeam = useCallback((
    teamId: string,
    updates: Partial<Team>
  ): Promise<boolean> => enqueueMutation(async () => {
    const base = teamsRef.current;
    const teamIndex = base.findIndex(t => t.id === teamId);

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
  }), [enqueueMutation]);

  /**
   * Delete a targeted team configuration from disk storage. Also records a
   * tombstone (see TODO.md's Sync Data Model leg) so a future sync merge
   * knows this id was intentionally removed here, rather than just never
   * seen - cleared once that's confirmed synced (applySyncedState below).
   */
  const deleteTeam = useCallback((teamId: string): Promise<boolean> => enqueueMutation(async () => {
    const updatedTeams = teamsRef.current.filter(t => t.id !== teamId);
    const updatedTombstones = [...tombstonesRef.current, { id: teamId, deletedAt: Date.now() }];
    const success = await persistTeamsToDisk(updatedTeams, updatedTombstones);

    if (success) {
      teamsRef.current = updatedTeams;
      tombstonesRef.current = updatedTombstones;
      setTeams(updatedTeams);
      setTombstones(updatedTombstones);
      setError(null);

      // Clean up expansion state for deleted team
      setExpandedCardIds(prev => {
        const next = new Set(prev);
        next.delete(teamId);
        return next;
      });
    }

    return success;
  }), [enqueueMutation]);

  const setTeamOrder = useCallback((orderedIds: string[]): Promise<boolean> => enqueueMutation(async () => {
    const base = teamsRef.current;
    const byId = new Map(base.map(t => [t.id, t]));
    const ordered = orderedIds.map(id => byId.get(id)).filter((t): t is Team => t !== undefined);
    const orderedIdSet = new Set(ordered.map(t => t.id));
    const leftover = base.filter(t => !orderedIdSet.has(t.id));
    const updatedTeams = [...ordered, ...leftover];

    const success = await persistTeamsToDisk(updatedTeams, tombstonesRef.current);
    if (success) {
      teamsRef.current = updatedTeams;
      setTeams(updatedTeams);
      setError(null);
    }
    return success;
  }), [enqueueMutation]);

  /**
   * Toggle expansion state for a specific team card
   */
  const toggleCardExpansion = useCallback((teamId: string): void => {
    setExpandedCardIds(prev => {
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
    setExpandedCardIds(prev => new Set(prev).add(teamId));
  }, []);

  /**
   * Collapse a specific team card
   */
  const collapseCard = useCallback((teamId: string): void => {
    setExpandedCardIds(prev => {
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
  const refreshTeams = useCallback((): Promise<void> => enqueueMutation(loadTeamsFromDisk), [enqueueMutation]);

  /**
   * Get a specific team by ID
   */
  const getTeamById = useCallback((teamId: string): Team | undefined => {
    return teams.find(t => t.id === teamId);
  }, [teams]);

  /**
   * Overwrites teams with a sync merge's authoritative result and clears
   * pendingtombstones (see UseTeamsReturn's doc comment).
   */
  const applySyncedState = useCallback((records: Team[]): Promise<boolean> => enqueueMutation(async () => {
    const success = await persistTeamsToDisk(records, []);
    if (success) {
      teamsRef.current = records;
      tombstonesRef.current = [];
      setTeams(records);
      setTombstones([]);
      setError(null);
    }
    return success;
  }), [enqueueMutation]);

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
    toggleCardExpansion,
    expandCard,
    collapseCard,
    collapseAllCards,
    refreshTeams,
    getTeamById,
    applySyncedState,
  };
}
