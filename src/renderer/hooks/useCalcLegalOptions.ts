/**
 * useCalcLegalOptions - the species-legal slice of the Calc's move/ability pickers.
 * Resolves the species' real learnset/abilities via getEnrichedSpeciesOptions
 * (Champions overrides and movepool changes already applied there) and maps
 * them onto @smogon/calc's own names, since calculate() needs those exact
 * strings. Returned lists feed CalcAutocomplete's `priorityOptions`: the
 * pickers stay unrestricted sandboxes, these just sort first.
 */

import { useEffect, useMemo, useState } from 'react';
import type { UseGameDataReturn } from './useGameData';
import { normalizeMoveSlug, type CalcPokemonState } from '../utils/damageCalcEngine';

interface LegalSlugs {
  /** Species the slugs were resolved for - a mismatch means they're stale. */
  species: string;
  moves: Set<string>;
  abilities: Set<string>;
}

export interface CalcLegalOptions {
  moves: string[];
  abilities: string[];
}

export function useCalcLegalOptions(
  species: string,
  gender: CalcPokemonState['gender'],
  getEnrichedSpeciesOptions: UseGameDataReturn['getEnrichedSpeciesOptions'],
  allMoves: string[],
  allAbilities: string[],
): CalcLegalOptions {
  const [slugs, setSlugs] = useState<LegalSlugs | null>(null);

  useEffect(() => {
    if (!species) return;
    let cancelled = false;
    getEnrichedSpeciesOptions(species, gender || undefined)
      .then(({ moves, abilities }) => {
        if (cancelled) return;
        setSlugs({
          species,
          moves: new Set(moves.map((m) => normalizeMoveSlug(m.name))),
          abilities: new Set(abilities.map((a) => normalizeMoveSlug(a.name))),
        });
      })
      .catch(() => {
        if (!cancelled) setSlugs(null);
      });
    return () => {
      cancelled = true;
    };
  }, [species, gender, getEnrichedSpeciesOptions]);

  // Derived rather than cleared in an effect: a species change or empty
  // species simply ignores slugs resolved for a different one.
  const current = species && slugs?.species === species ? slugs : null;

  return useMemo(
    () => ({
      moves: current ? allMoves.filter((n) => current.moves.has(normalizeMoveSlug(n))) : [],
      abilities: current
        ? allAbilities.filter((n) => current.abilities.has(normalizeMoveSlug(n)))
        : [],
    }),
    [current, allMoves, allAbilities],
  );
}
