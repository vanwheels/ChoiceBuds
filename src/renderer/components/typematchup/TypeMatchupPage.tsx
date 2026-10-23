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
 * config/typeChangingAbilities.ts. Defensive Coverage accounts for
 * type-immunity abilities (Levitate, Water Absorb, etc.) the same way - see
 * config/typeImmunityAbilities.ts, consumed via utils/typeCoverage.ts's
 * `getDefensiveMultiplier`.
 *
 * The page used to carry a third panel below these two tables (Team Gap
 * Analysis, a ladder-usage-threat heuristic via GameDataCache.usage) -
 * removed outright in Type Matchup Rework (see COMPLETED.md) rather than
 * replaced. An objective per-type view was tried as a replacement first and
 * dropped same-leg: it just re-sorted Defensive Coverage's own
 * unfavorableCount/favorableCount, already visible in that table's own Weak/
 * Resist columns, so it added no information a second panel would justify.
 */

import { useMemo, useState } from 'react';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import { useTeamMoveTypes } from '../../hooks/useTeamMoveTypes';
import { computeOffensiveCoverage, computeDefensiveCoverage } from '../../utils/typeCoverage';
import TeamPickerDropdown from '../TeamPickerDropdown';
import CoverageTable from './CoverageTable';

interface TypeMatchupPageProps {
  teamsState: UseTeamsReturn;
  gameDataState: UseGameDataReturn;
  spriteCacheState: UseSpriteCacheReturn;
}

export default function TypeMatchupPage({
  teamsState,
  gameDataState,
  spriteCacheState,
}: TypeMatchupPageProps) {
  const { teams } = teamsState;
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  const { moveTypesByPokemon, isLoading } = useTeamMoveTypes(selectedTeam, gameDataState);

  const defensiveSlots = useMemo(
    () =>
      (selectedTeam?.pokemon ?? []).map((p) => ({
        types: p.types,
        ability: p.showdownData.ability,
      })),
    [selectedTeam],
  );
  const offensiveRows = useMemo(
    () => computeOffensiveCoverage(moveTypesByPokemon),
    [moveTypesByPokemon],
  );
  const defensiveRows = useMemo(() => computeDefensiveCoverage(defensiveSlots), [defensiveSlots]);

  return (
    <div className="flex flex-col gap-6 px-4 md:px-0">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Type Matchup</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Select a team to see its offensive move coverage and defensive type weaknesses at a
          glance.
        </p>
      </div>

      <div className="flex flex-col gap-1.5 max-w-xs">
        <label className="text-[10px] text-zinc-400 uppercase tracking-wide">Team</label>
        <TeamPickerDropdown
          teams={teams}
          selectedTeamId={selectedTeamId}
          onSelect={setSelectedTeamId}
          resolveSprite={spriteCacheState.resolveSprite}
        />
      </div>

      {!selectedTeam ? (
        <p className="text-sm text-zinc-400">
          {teams.length === 0
            ? 'Import or create a team first to see its type coverage.'
            : 'Pick a team above to see its type coverage.'}
        </p>
      ) : isLoading ? (
        <p className="text-sm text-zinc-400">Loading move data...</p>
      ) : (
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
      )}
    </div>
  );
}
