import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { usePokedexNumberSelfHeal } from './usePokedexNumberSelfHeal';
import type { UseTeamsReturn } from './useTeams';
import type { UseSavedPokemonReturn } from './useSavedPokemon';
import type { UseDatabaseReturn } from './useDatabase';
import type { ImportedPokemonInfo, PokeAPICacheEntry, Team } from '../types/pokemon';

vi.mock('../services/pokeapi', async () => {
  const actual = await vi.importActual<typeof import('../services/pokeapi')>('../services/pokeapi');
  return { ...actual, fetchPokemonData: vi.fn() };
});

import { fetchPokemonData } from '../services/pokeapi';
const mockedFetch = vi.mocked(fetchPokemonData);

const ZERO_EVS = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

function makePokemon(overrides: Partial<ImportedPokemonInfo> & { species: string; gender?: 'M' | 'F' | 'N' | '' }): ImportedPokemonInfo {
  const { species, gender, ...rest } = overrides;
  return {
    showdownData: { species, gender, level: 50, shiny: false, gigantamax: false, happiness: 255, evs: ZERO_EVS, moves: [] },
    pokedexNumber: 10186, // a non-default-form resource id (Indeedee-Female) - the "needs backfill" case
    types: [], baseStats: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    spriteUrl: '', importedAt: 0, id: crypto.randomUUID(),
    ...rest,
  };
}

function makeTeam(pokemon: ImportedPokemonInfo[], id = 'team-1'): Team {
  return { id, name: 'Team', format: 'Reg M-B', pokemon, createdAt: 0, updatedAt: 0 };
}

function teamsState(teams: Team[], overrides: Partial<UseTeamsReturn> = {}): UseTeamsReturn {
  return {
    teams, isLoading: false, error: null, expandedCardIds: new Set(), tombstones: [],
    addTeam: vi.fn(), updateTeam: vi.fn().mockResolvedValue(true), deleteTeam: vi.fn(), setTeamOrder: vi.fn(),
    toggleCardExpansion: vi.fn(), expandCard: vi.fn(), collapseCard: vi.fn(), collapseAllCards: vi.fn(),
    refreshTeams: vi.fn(), getTeamById: vi.fn(), applySyncedState: vi.fn(),
    ...overrides,
  };
}

function savedPokemonState(entries: UseSavedPokemonReturn['savedPokemon'], overrides: Partial<UseSavedPokemonReturn> = {}): UseSavedPokemonReturn {
  return {
    savedPokemon: entries, isLoading: false, error: null, expandedCardIds: new Set(), toggleCardExpansion: vi.fn(),
    addSavedPokemonBatch: vi.fn(), renameSavedPokemon: vi.fn(), toggleSavedPokemonFavorite: vi.fn(),
    duplicateSavedPokemon: vi.fn(), setSavedPokemonOrder: vi.fn(), updateSavedPokemon: vi.fn(),
    applyPokedexNumberFixes: vi.fn().mockResolvedValue(true), deleteSavedPokemon: vi.fn(),
    refreshSavedPokemon: vi.fn(), getSavedSetsForSpecies: vi.fn(), tombstones: [], applySyncedState: vi.fn(),
    ...overrides,
  };
}

function databaseState(overrides: Partial<UseDatabaseReturn> = {}): UseDatabaseReturn {
  return {
    cache: null, isInitialized: true, isRevalidating: false, error: null,
    getCachedEntry: vi.fn(), setCacheEntry: vi.fn().mockResolvedValue(true),
    isCacheEntryValid: vi.fn(), cleanExpiredEntries: vi.fn(), clearCache: vi.fn(), refreshCache: vi.fn(),
    ...overrides,
  };
}

function apiEntry(nationalDexNumber: number | undefined): PokeAPICacheEntry {
  return { species: 'indeedee', pokedexNumber: 10186, nationalDexNumber, types: ['psychic'], baseStats: ZERO_EVS, spriteUrl: '', abilities: [], cachedAt: 0, expiresAt: 0 };
}

describe('usePokedexNumberSelfHeal', () => {
  beforeEach(() => mockedFetch.mockReset());

  it('backfills nationalDexNumber on a team Pokemon, leaving pokedexNumber (the sprite-id) untouched', async () => {
    const bad = makePokemon({ species: 'Indeedee-F', gender: 'F' });
    const team = makeTeam([bad]);
    const teams = teamsState([team]);
    mockedFetch.mockResolvedValue(apiEntry(876));

    renderHook(() => usePokedexNumberSelfHeal(teams, savedPokemonState([]), databaseState()));

    await waitFor(() => expect(teams.updateTeam).toHaveBeenCalledTimes(1));
    expect(teams.updateTeam).toHaveBeenCalledWith('team-1', { pokemon: [{ ...bad, nationalDexNumber: 876 }] });
  });

  it('backfills a Box entry via the bulk applyPokedexNumberFixes mutator, not individual calls', async () => {
    const bad = makePokemon({ species: 'Indeedee-F', gender: 'F' });
    const entry = { id: 'box-1', label: 'Indeedee', pokemon: bad, savedAt: 0, updatedAt: 0 };
    const savedState = savedPokemonState([entry]);
    mockedFetch.mockResolvedValue(apiEntry(876));

    renderHook(() => usePokedexNumberSelfHeal(teamsState([]), savedState, databaseState()));

    await waitFor(() => expect(savedState.applyPokedexNumberFixes).toHaveBeenCalledTimes(1));
    expect(savedState.applyPokedexNumberFixes).toHaveBeenCalledWith([{ id: 'box-1', nationalDexNumber: 876 }]);
    expect(savedState.updateSavedPokemon).not.toHaveBeenCalled();
  });

  it('only fetches once for a species repeated across multiple teams', async () => {
    const teamA = makeTeam([makePokemon({ species: 'Indeedee-F', gender: 'F' })], 'a');
    const teamB = makeTeam([makePokemon({ species: 'Indeedee-F', gender: 'F' })], 'b');
    mockedFetch.mockResolvedValue(apiEntry(876));

    renderHook(() => usePokedexNumberSelfHeal(teamsState([teamA, teamB]), savedPokemonState([]), databaseState()));

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
  });

  it('does nothing for a default-form species (pokedexNumber already below the threshold)', () => {
    const fine = makePokemon({ species: 'Pikachu', pokedexNumber: 25 });
    const teams = teamsState([makeTeam([fine])]);

    renderHook(() => usePokedexNumberSelfHeal(teams, savedPokemonState([]), databaseState()));

    expect(mockedFetch).not.toHaveBeenCalled();
    expect(teams.updateTeam).not.toHaveBeenCalled();
  });

  it('does nothing for an entry that already has nationalDexNumber', () => {
    const already = makePokemon({ species: 'Indeedee-F', gender: 'F', nationalDexNumber: 876 });
    const teams = teamsState([makeTeam([already])]);

    renderHook(() => usePokedexNumberSelfHeal(teams, savedPokemonState([]), databaseState()));

    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('waits for teams/savedPokemon/the database to finish loading before running', () => {
    const bad = makePokemon({ species: 'Indeedee-F', gender: 'F' });
    const teams = teamsState([makeTeam([bad])], { isLoading: true });

    renderHook(() => usePokedexNumberSelfHeal(teams, savedPokemonState([]), databaseState()));

    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('runs only once per session even as teams keep changing', async () => {
    const bad = makePokemon({ species: 'Indeedee-F', gender: 'F' });
    mockedFetch.mockResolvedValue(apiEntry(876));

    const { rerender } = renderHook(
      ({ teams }) => usePokedexNumberSelfHeal(teams, savedPokemonState([]), databaseState()),
      { initialProps: { teams: teamsState([makeTeam([bad])]) } }
    );
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));

    rerender({ teams: teamsState([makeTeam([bad], 'team-2')]) });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
  });
});
