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
 * Both tables also account for an active Mega toggle, but - unlike the Mega
 * Team Card Flip badge on the Team/Box cards - each table keeps its OWN
 * page-local toggle state (`megaFormsByTable`, keyed by table then by
 * `ImportedPokemonInfo.id`), not a read of the shared
 * `usePokemonFormToggle`/`useActiveFormsForIds` store those cards use
 * (Ability-Affects-Move Indicator & Type Matchup Mega Toggle Leg 3, see
 * TODO.md/COMPLETED.md). Flipping a Mega on here is a coverage-table-only
 * preview; it must never bleed into the other table or into what the
 * Team/Box card itself shows for that same Pokemon. `config/megaEvolution.ts`'s
 * `resolveActiveMegaSlug` + `utils/typeCoverage.ts`'s `resolveDefensiveSlot`
 * (shared with hooks/useTeamMoveTypes.ts's own Mega-aware ability
 * resolution, so the "is this slot's toggle pointing at its own held Mega
 * Stone" rule lives in one place) resolve a slot's typing/ability from
 * `@smogon/calc`'s species dex instead of the stored base form. Aegislash's
 * Blade/Shield toggle needs no equivalent handling here: per
 * EditablePokemonCore.tsx, that forme change never touches typing or
 * ability (Steel/Ghost and Stance Change either way), so the untouched
 * base-form read already covers it correctly.
 *
 * `resolveActiveMegaSlug` only resolves non-null when the toggled slug
 * matches the slot's actual held item - a toggle can never make a Pokemon
 * "more Mega" than its real set allows, same constraint the Team card's own
 * badge has. CoverageTable.tsx's split-form (Charizard/Raichu X/Y) picker
 * follows that same rule rather than letting either letter apply freely:
 * only the option matching the real held stone can ever light up, since
 * useTeamMoveTypes.ts's own held-item gate (out of scope to change this leg)
 * would otherwise silently ignore the other one - see CoverageTable.tsx's
 * own header comment for the full reasoning.
 *
 * The page used to carry a third panel below these two tables (Team Gap
 * Analysis, a ladder-usage-threat heuristic via GameDataCache.usage) -
 * removed outright in Type Matchup Rework (see COMPLETED.md) rather than
 * replaced. An objective per-type view was tried as a replacement first and
 * dropped same-leg: it just re-sorted Defensive Coverage's own
 * unfavorableCount/favorableCount, already visible in that table's own Weak/
 * Resist columns, so it added no information a second panel would justify.
 */

import { useCallback, useMemo, useState } from 'react';
import { Generations } from '@smogon/calc';
import type { UseTeamsReturn } from '../../hooks/useTeams';
import type { UseGameDataReturn } from '../../hooks/useGameData';
import type { UseSpriteCacheReturn } from '../../hooks/useSpriteCache';
import { useTeamMoveTypes } from '../../hooks/useTeamMoveTypes';
import {
  computeOffensiveCoverage,
  computeDefensiveCoverage,
  resolveDefensiveSlot,
} from '../../utils/typeCoverage';
import { resolveActiveMegaSlug } from '../../config/megaEvolution';
import { useMegaSpritePrefetch } from '../../hooks/useMegaSprite';
import TeamPickerDropdown from '../TeamPickerDropdown';
import CoverageTable from './CoverageTable';

const GEN_NUM = 9;

type CoverageTableKind = 'offensive' | 'defensive';

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

  // Warms useMegaSprite's shared id/URL cache for every curated Mega slug up
  // front (same pattern SpeedTiersPage's Mega rows use) - CoverageTable.tsx
  // reads it synchronously per column via getCachedMegaSprite rather than
  // calling useMegaSprite itself, since Rules of Hooks forbids calling that
  // hook inside its own per-pokemon .map(). Without this, a team visited
  // here before its own Team/Box card has ever rendered (which would
  // otherwise warm the same cache per-held-stone) would show the base sprite
  // even with the toggle active.
  useMegaSpritePrefetch();

  // Page-local, per-table Mega preview state - see this file's header
  // comment for why this can't just be another `useActiveFormsForIds` read
  // of the shared team-card store.
  const [megaFormsByTable, setMegaFormsByTable] = useState<
    Record<CoverageTableKind, Record<string, string | null>>
  >({ offensive: {}, defensive: {} });

  const toggleMegaForm = useCallback(
    (table: CoverageTableKind, pokemonId: string, slug: string) => {
      setMegaFormsByTable((prev) => {
        const current = prev[table][pokemonId] ?? null;
        return {
          ...prev,
          [table]: { ...prev[table], [pokemonId]: current === slug ? null : slug },
        };
      });
    },
    [],
  );

  const { moveTypesByPokemon, isLoading } = useTeamMoveTypes(
    selectedTeam,
    gameDataState,
    megaFormsByTable.offensive,
  );

  const defensiveSlots = useMemo(
    () =>
      (selectedTeam?.pokemon ?? []).map((p) => {
        const activeMegaSlug = resolveActiveMegaSlug(
          p.showdownData.item,
          p.showdownData.species,
          megaFormsByTable.defensive[p.id] ?? null,
        );
        return resolveDefensiveSlot(
          gen,
          { types: p.types, ability: p.showdownData.ability },
          activeMegaSlug,
        );
      }),
    [selectedTeam, megaFormsByTable.defensive, gen],
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
            activeForms={megaFormsByTable.offensive}
            onToggleMegaForm={(pokemonId, slug) => toggleMegaForm('offensive', pokemonId, slug)}
          />
          <CoverageTable
            title="Defensive Coverage"
            pokemon={selectedTeam.pokemon}
            rows={defensiveRows}
            favorableWhenAbove1={false}
            unfavorableLabel="Total Weak"
            favorableLabel="Total Resist"
            spriteCacheState={spriteCacheState}
            activeForms={megaFormsByTable.defensive}
            onToggleMegaForm={(pokemonId, slug) => toggleMegaForm('defensive', pokemonId, slug)}
          />
        </div>
      )}
    </div>
  );
}
