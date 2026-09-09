/**
 * TypeMatchupPage.tsx - Team Offensive/Defensive Type Coverage
 * Pick a saved team, see two tables: which types the team can hit hard
 * (Offensive Coverage, driven by each member's actual damaging moves) and
 * which types threaten the team (Defensive Coverage, driven by each
 * member's own typing). Modeled directly on vgcmulticalc.com's type-calc
 * tool per the user's request - replaced the earlier manual 1-2 type picker
 * version of this tab (see TODO.md/COMPLETED.md), since a team-driven view
 * is strictly more useful once teams exist to select from.
 *
 * Offensive Coverage accounts for type-changing abilities (Pixilate turning
 * Normal moves Fairy, etc.) via hooks/useTeamMoveTypes.ts - see
 * config/typeChangingAbilities.ts. Defensive Coverage (and the Team Gap
 * Analysis panel below it) accounts for type-immunity abilities (Levitate,
 * Water Absorb, etc.) the same way - see config/typeImmunityAbilities.ts,
 * consumed via utils/typeCoverage.ts's `getDefensiveMultiplier`.
 *
 * Team Gap Analysis (UsageThreatsList) is a third, additive panel below the
 * two coverage tables - real ranked-ladder-usage Pokemon (GameDataCache.usage,
 * kept warm in the background by hooks/useUsageSync.ts) the team has no
 * typing answer for at all, plus a second, separate section for threats only
 * one team slot resists/is immune to (a fragile single answer). See
 * utils/usageThreats.ts for both computations. A third UsageThreatsList
 * section, Likely Coverage Gaps, layers a threat's likely moveset (top-N
 * ranked-usage moves, resolved through its own top-ranked ability) on top of
 * the same resistance check - see utils/usageCoverageGaps.ts.
 */

import { useMemo, useState } from 'react';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseDatabaseReturn } from '../../hooks/useDatabase';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import { useTeamMoveTypes } from '../../hooks/useTeamMoveTypes';
import { computeOffensiveCoverage, computeDefensiveCoverage } from '../../utils/typeCoverage';
import { computeUsageThreats, computePartiallyCoveredUsageThreats, type UsageThreat } from '../../utils/usageThreats';
import {
  computeMovesetCoverageGaps,
  COVERAGE_GAP_MOVE_CUTOFF,
  type MovesetGapCandidate,
} from '../../utils/usageCoverageGaps';
import CoverageTable from './CoverageTable';
import UsageThreatsList from './UsageThreatsList';

interface TypeMatchupPageProps {
  teamsState: UseTeamsReturn;
  gameDataState: UseGameDataReturn;
  databaseState: UseDatabaseReturn;
  spriteCacheState: UseSpriteCacheReturn;
}

export default function TypeMatchupPage({ teamsState, gameDataState, databaseState, spriteCacheState }: TypeMatchupPageProps) {
  const { teams } = teamsState;
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  const { moveTypesByPokemon, isLoading } = useTeamMoveTypes(selectedTeam, gameDataState);
  const { cache: gameDataCache } = gameDataState;
  const { getCachedEntry } = databaseState;

  const defensiveSlots = useMemo(
    () => (selectedTeam?.pokemon ?? []).map(p => ({ types: p.types, ability: p.showdownData.ability })),
    [selectedTeam]
  );
  const offensiveRows = useMemo(() => computeOffensiveCoverage(moveTypesByPokemon), [moveTypesByPokemon]);
  const defensiveRows = useMemo(() => computeDefensiveCoverage(defensiveSlots), [defensiveSlots]);

  const usageCandidates = useMemo<UsageThreat[]>(() => {
    if (!gameDataCache) return [];
    return Object.values(gameDataCache.usage)
      .map((entry): UsageThreat | null => {
        const dbEntry = getCachedEntry(entry.species);
        if (!dbEntry) return null;
        return { species: entry.species, types: dbEntry.types, columnPosition: entry.columnPosition, spriteUrl: dbEntry.spriteUrl };
      })
      .filter((c): c is UsageThreat => c !== null);
  }, [gameDataCache, getCachedEntry]);
  const usageThreats = useMemo(
    () => computeUsageThreats(defensiveSlots, usageCandidates),
    [defensiveSlots, usageCandidates]
  );
  const partiallyCoveredUsageThreats = useMemo(
    () => computePartiallyCoveredUsageThreats(defensiveSlots, usageCandidates),
    [defensiveSlots, usageCandidates]
  );

  const movesetGapCandidates = useMemo<MovesetGapCandidate[]>(() => {
    if (!gameDataCache) return [];
    return Object.values(gameDataCache.usage)
      .map((entry): MovesetGapCandidate | null => {
        const dbEntry = getCachedEntry(entry.species);
        if (!dbEntry) return null;
        const topMoves = entry.moves
          .slice(0, COVERAGE_GAP_MOVE_CUTOFF)
          .map(m => {
            const moveData = gameDataCache.moves[m.name.toLowerCase()];
            return moveData ? { name: m.name, type: moveData.type } : null;
          })
          .filter((m): m is { name: string; type: string } => m !== null);
        return {
          species: entry.species,
          spriteUrl: dbEntry.spriteUrl,
          columnPosition: entry.columnPosition,
          topAbility: entry.abilities[0]?.name,
          topMoves,
        };
      })
      .filter((c): c is MovesetGapCandidate => c !== null);
  }, [gameDataCache, getCachedEntry]);
  const movesetCoverageGaps = useMemo(
    () => computeMovesetCoverageGaps(defensiveSlots, movesetGapCandidates),
    [defensiveSlots, movesetGapCandidates]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Type Matchup</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Select a team to see its offensive move coverage and defensive type weaknesses at a glance.
        </p>
      </div>

      <div className="flex flex-col gap-1.5 max-w-xs">
        <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Team</label>
        <select
          value={selectedTeamId}
          onChange={e => setSelectedTeamId(e.target.value)}
          className="px-3 py-2 text-sm bg-zinc-800 border border-zinc-600 rounded text-white outline-none focus:border-accent-gold"
        >
          <option value="">Select a team...</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedTeam ? (
        <p className="text-sm text-zinc-400">
          {teams.length === 0 ? 'Import or create a team first to see its type coverage.' : 'Pick a team above to see its type coverage.'}
        </p>
      ) : isLoading ? (
        <p className="text-sm text-zinc-400">Loading move data...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
            <CoverageTable
              title="Offensive Coverage"
              pokemon={selectedTeam.pokemon}
              rows={offensiveRows}
              favorableWhenAbove1
              unfavorableLabel="Not Very Effective"
              favorableLabel="Super Effective"
              spriteCacheState={spriteCacheState}
            />
            <CoverageTable
              title="Defensive Coverage"
              pokemon={selectedTeam.pokemon}
              rows={defensiveRows}
              favorableWhenAbove1={false}
              unfavorableLabel="Total Weak"
              favorableLabel="Total Resist"
              spriteCacheState={spriteCacheState}
            />
          </div>
          <UsageThreatsList
            threats={usageThreats}
            partiallyCoveredThreats={partiallyCoveredUsageThreats}
            movesetCoverageGaps={movesetCoverageGaps}
            spriteCacheState={spriteCacheState}
          />
        </>
      )}
    </div>
  );
}
