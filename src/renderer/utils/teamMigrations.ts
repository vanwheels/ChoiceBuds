/**
 * Pure load-path migration/normalization logic for TeamsDatabase, split out
 * of useTeams.ts (TODO.md's "Split useTeams.ts" leg) so it can be unit
 * tested without React - see rules/typescript.md's "pure logic lives
 * outside hooks" convention. Used by useTeams.ts's load path and, via
 * normalizeIncomingSyncTeam, by utils/teamSyncReconciliation.ts's sync-merge
 * path.
 */

import type { ImportedPokemonInfo, Team, TeamsDatabase, TeamVisibility } from '../types/pokemon';
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
export const TEAMS_SCHEMA_VERSION = 2;

/**
 * Migration hook point for TeamsDatabase - runs once per load, before
 * normalizeTeam's per-team backfills below. Only backfills the version
 * number itself; the actual schemaVersion-1-to-2 shape change (the old
 * binary `Team.isPublic` to the 3-tier `Team.visibility` - see
 * TeamVisibility's doc comment) happens per-team in normalizeTeam below,
 * same split as the gender-split-species fix already uses. A database
 * persisted before schemaVersion existed is treated as version 1.
 */
export function migrateTeamsDatabase(database: TeamsDatabase): TeamsDatabase {
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
 * round-trip (see useTeams.ts's computeNormalizationFixes/flush effect),
 * since the Worker's extractPublicTeam now reads `visibility`, not
 * `isPublic`.
 */
export function normalizeTeam(
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
 * shared by computeNormalizationFixes (the load path) and
 * utils/teamSyncReconciliation.ts's reconcileSyncedTeams (the sync-merge
 * path), since both need to tell a sync-relevant fix apart from a purely
 * cosmetic one (e.g. the REG-prefix name strip, which normalizeTeam also
 * does but which never needs to survive a sync round-trip).
 */
export function normalizationChangedSyncRelevantFields(raw: Team, fixed: Team): boolean {
  const speciesChanged = raw.pokemon.some(
    (p, j) => p.showdownData.species !== fixed.pokemon[j]?.showdownData.species,
  );
  return speciesChanged || raw.visibility !== fixed.visibility;
}

/**
 * Diffs raw-vs-normalizeTeam'd teams to find which ones actually need a
 * normalization result persisted for real rather than left as a
 * read-boundary-only fix (see useTeams.ts's pendingNormalizationFixRef/
 * flush effect) - both the gender-split species fix and the legacy
 * isPublic-to-visibility migration need this, since a display-only fix
 * never actually propagates through sync (TODO.md's Roster Picker leg;
 * this leg's own Worker-side visibility read).
 */
export function computeNormalizationFixes(
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
 * Runs a sync-merge-sourced team (teamSyncReconciliation.ts's
 * reconcileSyncedTeams `records`, which can originate from a device still
 * running pre-migration code - see `/leg-review`'s Teamsheet Open/Closed
 * Visibility Tiers Leg 3 finding) through the same normalizeTeam path the
 * load path uses, so a legacy `isPublic`-shaped record pulled down mid-sync
 * reads correctly immediately rather than only after this device's next
 * full reload. Bumps `updatedAt` to now only when normalization changed
 * something sync-relevant (species/visibility -
 * normalizationChangedSyncRelevantFields), so the corrected copy can
 * out-rank the still-stale sender on this device's next push; a purely
 * cosmetic fix (e.g. the REG-prefix strip) keeps the incoming `updatedAt`
 * as-is.
 */
export function normalizeIncomingSyncTeam(raw: Team): Team {
  const normalized = normalizeTeam(
    raw as Team & { pokemon: (ImportedPokemonInfo & { id?: string })[]; isPublic?: boolean },
  );
  return normalizationChangedSyncRelevantFields(raw, normalized)
    ? { ...normalized, updatedAt: Date.now() }
    : normalized;
}
