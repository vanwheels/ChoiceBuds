/**
 * usePokedexNumberSelfHeal Hook - One-Time nationalDexNumber Backfill
 *
 * Backfills `nationalDexNumber` for any team/Box Pokémon that doesn't have
 * it yet (saved before that field existed) AND whose `pokedexNumber` is a
 * non-default-form PokeAPI resource id (>= 10000 - e.g. Indeedee-Female's
 * real resource is id 10186, Rotom-Heat's is 10008), so EditablePokemonCore.tsx's
 * display text can show the real National Dex number (Indeedee #876, Rotom
 * #479) instead of falling back to that sprite-id. See TODO.md's Pokedex
 * Number Wrong For Forms leg for the full trail, including the live-
 * confirmed "Indeedee-Female #10186"/"Rotom-Heat #10008" report and the
 * earlier (reverted) attempt that overwrote `pokedexNumber` directly -
 * utils/spriteUrl.ts's getPixelSpriteUrl needs that exact value verbatim to
 * build a non-default form's correct sprite URL, so this only ever adds the
 * new field, never touches pokedexNumber itself.
 *
 * Skips any entry whose pokedexNumber is already < 10000 (a default-form
 * species, where pokedexNumber already equals the real dex number) - no
 * fetch needed, EditablePokemonCore.tsx's `nationalDexNumber ?? pokedexNumber`
 * fallback already displays correctly for those without this hook's help.
 *
 * Independent of useInitialSync.ts deliberately: that hook doesn't run on
 * the web build at all, and even where it does, it only ever looks at the
 * *current* legal roster - a team/Box entry can reference an older-
 * regulation or otherwise off-roster species useInitialSync would never
 * touch. This hook instead scans every actually-saved Pokémon directly.
 *
 * Runs once per app launch, after teams/savedPokemon/the PokeAPI cache have
 * all finished their own initial load. Fetches each *distinct* affected
 * species/gender combination at most once (a species duplicated across
 * several teams or Box entries shares one real network request), via the
 * same services/pokeapi.ts::fetchPokemonData path useDatabase.ts's own
 * cache-miss refetching already uses - so this also backfills the cache
 * entry for that species as a side effect (setCacheEntry), benefiting any
 * other already-correct Pokémon of the same species too.
 *
 * Persists through the real updateTeam mutator (useTeams.ts's own
 * enqueueMutation already serializes concurrent calls safely) and the
 * bulk applyPokedexNumberFixes mutator (useSavedPokemon.ts has no such
 * serialization yet, so N individual updateSavedPokemon calls in a loop
 * would race each other's stale closures for 2+ affected Box entries - see
 * that method's own doc comment) - both bump `updatedAt` for real, so the
 * fix can win a future sync merge, same reasoning as the gender-split
 * species-text self-heal in those same two hooks.
 */

import { useEffect, useRef } from 'react';
import type { UseTeamsReturn } from './useTeams';
import type { UseSavedPokemonReturn } from './useSavedPokemon';
import type { UseDatabaseReturn } from './useDatabase';
import type { Team } from '../types/pokemon';
import { fetchPokemonData, normalizeSpeciesForAPI } from '../services/pokeapi';
import { runWithConcurrency } from '../utils/concurrency';

/** A default-form species' pokedexNumber is always below this - see this file's own header comment. */
const NON_DEFAULT_FORM_ID_THRESHOLD = 10000;
const CONCURRENCY = 4;

interface AffectedSpecies {
  species: string;
  gender: 'M' | 'F' | 'N' | '' | undefined;
}

function needsBackfill(p: { pokedexNumber: number; nationalDexNumber?: number }): boolean {
  return p.nationalDexNumber === undefined && p.pokedexNumber >= NON_DEFAULT_FORM_ID_THRESHOLD;
}

export function usePokedexNumberSelfHeal(
  teamsState: UseTeamsReturn,
  savedPokemonState: UseSavedPokemonReturn,
  databaseState: UseDatabaseReturn
): void {
  const { teams, isLoading: teamsLoading, updateTeam } = teamsState;
  const { savedPokemon, isLoading: savedPokemonLoading, applyPokedexNumberFixes } = savedPokemonState;
  const { isInitialized: isDatabaseInitialized, setCacheEntry } = databaseState;

  const hasRunRef = useRef(false);

  useEffect(() => {
    if (hasRunRef.current) return;
    if (teamsLoading || savedPokemonLoading || !isDatabaseInitialized) return;

    const toFetch = new Map<string, AffectedSpecies>();
    for (const team of teams) {
      for (const p of team.pokemon) {
        if (!needsBackfill(p)) continue;
        const key = normalizeSpeciesForAPI(p.showdownData.species, p.showdownData.gender);
        if (!toFetch.has(key)) toFetch.set(key, { species: p.showdownData.species, gender: p.showdownData.gender });
      }
    }
    for (const entry of savedPokemon) {
      const p = entry.pokemon;
      if (!needsBackfill(p)) continue;
      const key = normalizeSpeciesForAPI(p.showdownData.species, p.showdownData.gender);
      if (!toFetch.has(key)) toFetch.set(key, { species: p.showdownData.species, gender: p.showdownData.gender });
    }

    if (toFetch.size === 0) {
      hasRunRef.current = true;
      return;
    }
    hasRunRef.current = true;

    (async () => {
      const correctedByKey = new Map<string, number>();
      await runWithConcurrency(
        [...toFetch.entries()],
        CONCURRENCY,
        () => {},
        async ([key, affected]) => {
          const apiData = await fetchPokemonData(affected.species, affected.gender);
          if (apiData.nationalDexNumber !== undefined) correctedByKey.set(key, apiData.nationalDexNumber);
          void setCacheEntry(key, apiData);
        }
      );

      if (correctedByKey.size === 0) return; // every fetch failed (offline/rate-limited) or had no species url - a future launch retries

      for (const team of teams) {
        const fixedPokemon: Team['pokemon'] = team.pokemon.map(p => {
          if (!needsBackfill(p)) return p;
          const key = normalizeSpeciesForAPI(p.showdownData.species, p.showdownData.gender);
          const nationalDexNumber = correctedByKey.get(key);
          return nationalDexNumber !== undefined ? { ...p, nationalDexNumber } : p;
        });
        if (fixedPokemon.some((p, i) => p !== team.pokemon[i])) {
          void updateTeam(team.id, { pokemon: fixedPokemon });
        }
      }

      const savedPokemonFixes: { id: string; nationalDexNumber: number }[] = [];
      for (const entry of savedPokemon) {
        const p = entry.pokemon;
        if (!needsBackfill(p)) continue;
        const key = normalizeSpeciesForAPI(p.showdownData.species, p.showdownData.gender);
        const nationalDexNumber = correctedByKey.get(key);
        if (nationalDexNumber !== undefined) savedPokemonFixes.push({ id: entry.id, nationalDexNumber });
      }
      if (savedPokemonFixes.length > 0) void applyPokedexNumberFixes(savedPokemonFixes);
    })();
  }, [teams, teamsLoading, savedPokemon, savedPokemonLoading, isDatabaseInitialized, updateTeam, applyPokedexNumberFixes, setCacheEntry]);
}
