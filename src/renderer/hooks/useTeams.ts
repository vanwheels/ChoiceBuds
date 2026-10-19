/**
 * useTeams Hook - Team CRUD Operations Manager
 * Coordinates all macro CRUD actions for active team configurations data array
 * Handles insertion, updates, deletion via preload bridge, and UI expansion state
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  ImportedPokemonInfo,
  SyncTombstone,
  Team,
  TeamsDatabase,
  TeamVisibility,
} from '../types/pokemon';
import { getStorageAdapter } from '../services/storage';
import { fixGenderSplitResourceSpeciesText } from '../config/pokemonRules';

/**
 * Leading "Reg M-A "/"Reg M-B "/"Reg M-C " prefix this app used to stamp
 * onto a team's display name. Nothing writes this prefix anymore, so a
 * team.name still carrying it is stale data from before the change - see
 * TODO.md's "Team Name Field Reg-Prefix Display" item. One-time migration:
 * stripped at the read boundary below, not tracked as an ongoing concern.
 */
const REG_PREFIX_PATTERN = /^Reg M-[ABC] /;

/** Current on-disk shape version for TeamsDatabase - see TeamsDatabase.schemaVersion. */
const TEAMS_SCHEMA_VERSION = 2;

/**
 * Migration hook point for TeamsDatabase - runs once per load, before
 * normalizeTeam's per-team backfills below. Only backfills the version
 * number itself; the actual schemaVersion-1-to-2 shape change (the old
 * binary `Team.isPublic` to the 3-tier `Team.visibility` - see
 * TeamVisibility's doc comment) happens per-team in normalizeTeam below,
 * same split as the gender-split-species fix already uses. A database
 * persisted before schemaVersion existed is treated as version 1.
 */
function migrateTeamsDatabase(database: TeamsDatabase): TeamsDatabase {
  return { ...database, schemaVersion: database.schemaVersion ?? TEAMS_SCHEMA_VERSION };
}

/**
 * Derives this team's TeamVisibility from a legacy on-disk `isPublic`
 * boolean (schemaVersion 1 and earlier never had `visibility` at all).
 * `isPublic: true` becomes `closed`, not `open` - today's pre-existing
 * exposure was always species+sprite-only, and silently widening an
 * already-public team to the new full-set tier on migration would expose
 * moves/items/EVs/nature the team's owner never agreed to show. A team that
 * was never public (`isPublic` false/missing) stays `undefined` rather than
 * being stamped `'private'` explicitly - same undefined-means-"off"
 * convention `visibility` otherwise follows, so a team nobody ever touched
 * isn't forced through a needless updatedAt bump/resync on its first load
 * after this migration ships.
 */
function migrateTeamVisibility(legacyIsPublic: unknown): TeamVisibility | undefined {
  return legacyIsPublic === true ? 'closed' : undefined;
}

/**
 * Backfills a per-Pokemon `id` for teams persisted before that field existed
 * (added for the roster drag-reorder animation, leg 4 - see TODO.md and
 * ImportedPokemonInfo's own doc comment), at the read boundary - same
 * pattern as useBattles.ts's normalizeBattle. Never written back to disk
 * proactively; a team just picks up real ids the next time it's saved
 * through any normal mutation (addTeam/updateTeam/setTeamOrder all persist
 * the full `teams` array state, which holds these backfilled ids).
 *
 * Also self-heals any Pokémon whose species was stored as PokeAPI's raw
 * "-Male"/"-Female" resource text (fixGenderSplitResourceSpeciesText, see
 * its own doc comment and TODO.md's Roster Picker leg) - same
 * read-boundary/never-eagerly-persisted treatment as the id backfill above.
 *
 * Also migrates a legacy on-disk `isPublic` into `visibility`
 * (migrateTeamVisibility) when `visibility` itself is missing, dropping the
 * old key from the object it returns - unlike the two backfills above, this
 * one DOES need a real, timestamp-bumping persist to survive a sync
 * round-trip (see computeNormalizationFixes/the flush effect below), since
 * the Worker's extractPublicTeam now reads `visibility`, not `isPublic`.
 */
function normalizeTeam(
  team: Team & { pokemon: (ImportedPokemonInfo & { id?: string })[]; isPublic?: boolean },
): Team {
  const { isPublic, ...rest } = team;
  return {
    ...rest,
    name: team.name.replace(REG_PREFIX_PATTERN, ''),
    visibility: team.visibility ?? migrateTeamVisibility(isPublic),
    pokemon: team.pokemon.map((p) => ({
      ...p,
      id: p.id ?? crypto.randomUUID(),
      showdownData: {
        ...p.showdownData,
        species: fixGenderSplitResourceSpeciesText(p.showdownData.species),
      },
    })),
  };
}

/**
 * Whether normalizeTeam actually changed something that matters for sync
 * (species text, visibility) between a raw team and its normalized result -
 * shared by computeNormalizationFixes (the load path) and applySyncedState
 * below (the sync-merge path), since both need to tell a sync-relevant fix
 * apart from a purely cosmetic one (e.g. the REG-prefix name strip, which
 * normalizeTeam also does but which never needs to survive a sync
 * round-trip).
 */
function normalizationChangedSyncRelevantFields(raw: Team, fixed: Team): boolean {
  const speciesChanged = raw.pokemon.some(
    (p, j) => p.showdownData.species !== fixed.pokemon[j]?.showdownData.species,
  );
  return speciesChanged || raw.visibility !== fixed.visibility;
}

/**
 * Diffs raw-vs-normalizeTeam'd teams to find which ones actually need a
 * normalization result persisted for real rather than left as a
 * read-boundary-only fix (see the ref/effect using this below) - both the
 * gender-split species fix and the legacy isPublic-to-visibility migration
 * need this, since a display-only fix never actually propagates through
 * sync (TODO.md's Roster Picker leg; this leg's own Worker-side
 * visibility read).
 */
function computeNormalizationFixes(
  rawTeams: Team[],
  correctedTeams: Team[],
): { id: string; updates: Partial<Team> }[] {
  const fixes: { id: string; updates: Partial<Team> }[] = [];
  for (let i = 0; i < rawTeams.length; i++) {
    const raw = rawTeams[i];
    const fixed = correctedTeams[i];
    if (!normalizationChangedSyncRelevantFields(raw, fixed)) continue;
    const updates: Partial<Team> = {};
    const speciesChanged = raw.pokemon.some(
      (p, j) => p.showdownData.species !== fixed.pokemon[j]?.showdownData.species,
    );
    if (speciesChanged) updates.pokemon = fixed.pokemon;
    if (raw.visibility !== fixed.visibility) updates.visibility = fixed.visibility;
    if (Object.keys(updates).length > 0) fixes.push({ id: fixed.id, updates });
  }
  return fixes;
}

/**
 * Runs a sync-merge-sourced team (applySyncedState's `records`, which can
 * originate from a device still running pre-migration code - see
 * `/leg-review`'s Teamsheet Open/Closed Visibility Tiers Leg 3 finding)
 * through the same normalizeTeam path the load path uses, so a legacy
 * `isPublic`-shaped record pulled down mid-sync reads correctly immediately
 * rather than only after this device's next full reload. Bumps `updatedAt`
 * to now only when normalization changed something sync-relevant (species/
 * visibility - normalizationChangedSyncRelevantFields), so the corrected
 * copy can out-rank the still-stale sender on this device's next push; a
 * purely cosmetic fix (e.g. the REG-prefix strip) keeps the incoming
 * `updatedAt` as-is.
 */
function normalizeIncomingSyncTeam(raw: Team): Team {
  const normalized = normalizeTeam(
    raw as Team & { pokemon: (ImportedPokemonInfo & { id?: string })[]; isPublic?: boolean },
  );
  return normalizationChangedSyncRelevantFields(raw, normalized)
    ? { ...normalized, updatedAt: Date.now() }
    : normalized;
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
   * (useSync.ts::syncNow). Per team, keeps whichever side has the newer
   * `updatedAt`, keeps any local-only team `records` doesn't know about yet,
   * and drops any `records` entry whose id has a pending local tombstone
   * (deleted locally after the push this response answers was already in
   * flight) rather than letting it resurrect. `pushedTombstones` is the
   * tombstone list that was actually included in that push - only those are
   * cleared from `tombstones`, since a tombstone added after the snapshot
   * was taken hasn't been confirmed synced yet and still needs to go out on
   * the next push.
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
   * Reconciles teams with a sync merge's result (see UseTeamsReturn's doc
   * comment for the per-team/per-tombstone rules).
   *
   * `records` is a snapshot from whenever useSync.ts's debounced push
   * captured `teamsState.teams` - by the time this resolves (a full
   * network round-trip later), a real local mutation (e.g. a notes-field
   * blur) can have already landed on `teamsRef.current` via this same
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
   * `reconciled`'s base order walks `teamsRef.current` (local order), not
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
   * before landing in `reconciled` whenever it's a `records` entry (never a
   * `local` one, already normalized on its own last load) -
   * `remote.updatedAt > local.updatedAt`/the unmatched-remote filter below
   * both still compare the *raw* incoming `updatedAt`, since normalizing
   * first would let a stale remote record win just by being newly
   * reshaped.
   */
  const applySyncedState = useCallback(
    (records: Team[], pushedTombstones: SyncTombstone[]): Promise<boolean> =>
      enqueueMutation(async () => {
        const rawRemoteById = new Map(records.map((t) => [t.id, t]));
        const localIds = new Set(teamsRef.current.map((t) => t.id));
        const tombstonedIds = new Set(tombstonesRef.current.map((t) => t.id));
        const reconciled = [
          ...teamsRef.current.map((local) => {
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
        const remainingTombstones = tombstonesRef.current.filter((t) => !pushedIds.has(t.id));

        const success = await persistTeamsToDisk(reconciled, remainingTombstones);
        if (success) {
          teamsRef.current = reconciled;
          tombstonesRef.current = remainingTombstones;
          setTeams(reconciled);
          setTombstones(remainingTombstones);
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
