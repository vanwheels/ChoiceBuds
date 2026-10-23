/**
 * useTeamMoveTypes.ts - Resolves a Team's Damaging-Move Types for Offensive
 * Coverage
 * Status moves are excluded - a move with no damage class can't land a
 * "hit" for offensive-coverage purposes, so including its type would
 * misrepresent what the team can actually threaten. Mirrors
 * EditOverlays.tsx's move-metadata-resolution effect (Promise.all over
 * getMoveData, cache-first, one live fetch per miss).
 *
 * Each move's type is passed through config/typeChangingAbilities.ts's
 * `getEffectiveMoveType` against the Pokemon's own equipped ability
 * (Pixilate/Aerilate/Refrigerate/Galvanize/Normalize/Liquid Voice) before
 * being returned, so Offensive Coverage reflects what the move actually
 * hits with rather than its unmodified listed type.
 *
 * `activeForms` (Type Matchup Rework Leg 3, see TODO.md) is the team's
 * per-slot Mega/Alt-Form toggle state (`usePokemonFormToggle`, read via
 * `useActiveFormsForIds` since Rules of Hooks forbids calling the
 * single-id hook itself inside this file's own `team.pokemon.map()`). A
 * slot whose active form matches its own held Mega Stone's slug
 * (`config/megaEvolution.ts`'s `resolveActiveMegaSlug`) resolves moves
 * against that Mega's guaranteed ability
 * (`config/megaAbilities.ts`'s `resolveActiveAbility`) instead of the
 * stored base ability - e.g. an active Aerilate Mega's Normal-type moves
 * report as Flying. Aegislash's Blade/Shield toggle never needs this: per
 * EditablePokemonCore.tsx, that forme change never touches the equipped
 * ability (Stance Change either way).
 *
 * `isLoading` is derived (whether the currently-selected team's id has been
 * resolved yet), not a separate state var set synchronously at the top of
 * the effect - same "avoid setState directly in the effect body" pattern as
 * useMegaSprite.ts, which the set-state-in-effect lint rule requires.
 */

import { useEffect, useState } from 'react';
import type { Team } from '../types/pokemon';
import type { UseGameDataReturn } from './useGameData';
import { getEffectiveMoveType } from '../config/typeChangingAbilities';
import { resolveActiveMegaSlug } from '../config/megaEvolution';
import { resolveActiveAbility } from '../config/megaAbilities';

export interface UseTeamMoveTypesReturn {
  /** One entry per team slot, parallel to team.pokemon - each slot's list of its damaging moves' types (deduped isn't necessary, computeOffensiveCoverage just takes the max). */
  moveTypesByPokemon: string[][];
  isLoading: boolean;
}

export function useTeamMoveTypes(
  team: Team | undefined,
  gameDataState: UseGameDataReturn,
  activeForms: Record<string, string | null> = {},
): UseTeamMoveTypesReturn {
  const { getMoveData } = gameDataState;
  const [moveTypesByPokemon, setMoveTypesByPokemon] = useState<string[][]>([]);
  const [resolvedForTeamId, setResolvedForTeamId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!team) return;
    let cancelled = false;
    Promise.all(
      team.pokemon.map((p) => {
        const activeMegaSlug = resolveActiveMegaSlug(
          p.showdownData.item,
          p.showdownData.species,
          activeForms[p.id] ?? null,
        );
        const effectiveAbility = resolveActiveAbility(activeMegaSlug, p.showdownData.ability);
        return Promise.all(p.showdownData.moves.map((name) => getMoveData(name))).then((results) =>
          results
            .filter((m): m is NonNullable<typeof m> => !!m && m.category !== 'status')
            .map((m) => getEffectiveMoveType(m.name, m.type, effectiveAbility)),
        );
      }),
    ).then((results) => {
      if (cancelled) return;
      setMoveTypesByPokemon(results);
      setResolvedForTeamId(team.id);
    });
    return () => {
      cancelled = true;
    };
  }, [team, getMoveData, activeForms]);

  if (!team) return { moveTypesByPokemon: [], isLoading: false };
  return { moveTypesByPokemon, isLoading: resolvedForTeamId !== team.id };
}
