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
 * Both tables also account for an active Mega toggle (Type Matchup Rework
 * Leg 3, see COMPLETED.md): `useActiveFormsForIds` reads every selected team
 * slot's `usePokemonFormToggle` state at once (Rules of Hooks forbids
 * calling that hook itself inside this file's own `team.pokemon.map()`
 * calls), and `config/megaEvolution.ts`'s `resolveActiveMegaSlug` +
 * `utils/typeCoverage.ts`'s `resolveDefensiveSlot` (shared with
 * hooks/useTeamMoveTypes.ts's own Mega-aware ability resolution, so the
 * "is this slot's toggle pointing at its own held Mega Stone" rule lives in
 * one place) resolve a slot's typing/ability from `@smogon/calc`'s species
 * dex instead of the stored base form. Aegislash's Blade/Shield toggle needs
 * no equivalent handling here: per EditablePokemonCore.tsx, that forme
 * change never touches typing or ability (Steel/Ghost and Stance Change
 * either way), so the untouched base-form read already covers it correctly.
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
import { Generations } from '@smogon/calc';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import { useTeamMoveTypes } from '../../hooks/useTeamMoveTypes';
import { useActiveFormsForIds } from '../../hooks/usePokemonFormToggle';
import {
  computeOffensiveCoverage,
  computeDefensiveCoverage,
  resolveDefensiveSlot,
} from '../../utils/typeCoverage';
import { resolveActiveMegaSlug } from '../../config/megaEvolution';
import TeamPickerDropdown from '../TeamPickerDropdown';
import CoverageTable from './CoverageTable';

const GEN_NUM = 9;

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
  const gen = useMemo(() => Generations.get(GEN_NUM), []);

  const pokemonIds = useMemo(() => (selectedTeam?.pokemon ?? []).map((p) => p.id), [selectedTeam]);
  const activeForms = useActiveFormsForIds(pokemonIds);

  const { moveTypesByPokemon, isLoading } = useTeamMoveTypes(
    selectedTeam,
    gameDataState,
    activeForms,
  );

  const defensiveSlots = useMemo(
    () =>
      (selectedTeam?.pokemon ?? []).map((p) => {
        const activeMegaSlug = resolveActiveMegaSlug(
          p.showdownData.item,
          p.showdownData.species,
          activeForms[p.id] ?? null,
        );
        return resolveDefensiveSlot(
          gen,
          { types: p.types, ability: p.showdownData.ability },
          activeMegaSlug,
        );
      }),
    [selectedTeam, activeForms, gen],
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
