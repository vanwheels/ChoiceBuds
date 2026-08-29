import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRosterActions } from './useRosterActions';
import type { UseGameDataReturn } from './useGameData';
import type { ImportedPokemonInfo, PokeAPICacheEntry, ShowdownPokemon, Team } from '../types/pokemon';

const ZERO_EVS = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

function makeShowdownPokemon(overrides: Partial<ShowdownPokemon> = {}): ShowdownPokemon {
  return {
    species: 'Gengar',
    level: 50,
    shiny: false,
    gigantamax: false,
    happiness: 255,
    evs: { ...ZERO_EVS },
    moves: ['Shadow Ball'],
    ...overrides,
  };
}

function makePokemon(overrides: Partial<ShowdownPokemon> = {}): ImportedPokemonInfo {
  return {
    showdownData: makeShowdownPokemon(overrides),
    pokedexNumber: 94,
    types: ['ghost', 'poison'],
    baseStats: { hp: 60, attack: 65, defense: 60, specialAttack: 130, specialDefense: 75, speed: 110 },
    spriteUrl: 'https://example.com/gengar.png',
    importedAt: Date.now(),
  };
}

function makeTeam(pokemon: ImportedPokemonInfo[]): Team {
  return {
    id: 'team-1',
    name: 'Test Team',
    format: 'Reg M-B',
    pokemon,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

const CACHE_ENTRY: PokeAPICacheEntry = {
  species: 'gengar',
  pokedexNumber: 94,
  types: ['ghost', 'poison'],
  baseStats: { hp: 60, attack: 65, defense: 60, specialAttack: 130, specialDefense: 75, speed: 110 },
  spriteUrl: 'https://example.com/gengar.png',
  abilities: ['cursed-body'],
  cachedAt: Date.now(),
  expiresAt: Date.now() + 100_000,
};

function setup(overrides: { getEnrichedSpeciesOptions?: UseGameDataReturn['getEnrichedSpeciesOptions']; getChampionsUsage?: UseGameDataReturn['getChampionsUsage'] } = {}) {
  const updateTeam = vi.fn().mockResolvedValue(true);
  const getCachedEntry = vi.fn().mockReturnValue(CACHE_ENTRY); // always a cache hit - no real fetch needed
  const setCacheEntry = vi.fn().mockResolvedValue(true);
  const getEnrichedSpeciesOptions = overrides.getEnrichedSpeciesOptions ?? vi.fn().mockResolvedValue({
    moves: [{ name: 'shadow-ball' }, { name: 'sludge-bomb' }, { name: 'protect' }, { name: 'nasty-plot' }],
    abilities: [{ name: 'cursed-body' }],
  });
  const getChampionsUsage = overrides.getChampionsUsage ?? vi.fn().mockResolvedValue(null);

  const { result } = renderHook(() => useRosterActions(updateTeam, getCachedEntry, setCacheEntry, getEnrichedSpeciesOptions, getChampionsUsage));
  return { result, updateTeam, getCachedEntry, setCacheEntry, getEnrichedSpeciesOptions, getChampionsUsage };
}

describe('useRosterActions', () => {
  it('swapSlot builds a fresh slot from the species learnset and replaces the pokemon at that index', async () => {
    const team = makeTeam([makePokemon(), makePokemon({ species: 'Rillaboom' })]);
    const { result, updateTeam } = setup();

    const success = await result.current.swapSlot(team, 1, 'Gengar');

    expect(success).toBe(true);
    expect(updateTeam).toHaveBeenCalledTimes(1);
    const [teamId, updates] = updateTeam.mock.calls[0];
    expect(teamId).toBe('team-1');
    expect(updates.pokemon).toHaveLength(2);
    expect(updates.pokemon[0]).toBe(team.pokemon[0]); // untouched slot preserved by reference
    expect(updates.pokemon[1].showdownData.species).toBe('Gengar');
    expect(updates.pokemon[1].showdownData.moves).toEqual(['Shadow Ball', 'Sludge Bomb', 'Protect', 'Nasty Plot']);
    expect(updates.pokemon[1].showdownData.ability).toBe('Cursed Body');
  });

  it('sorts moves/abilities by live Champions usage percentage when available, overriding learnset order', async () => {
    const getChampionsUsage = vi.fn().mockResolvedValue({
      moves: [{ name: 'shadow-ball', percentage: 10 }, { name: 'protect', percentage: 90 }],
      abilities: [{ name: 'cursed-body', percentage: 100 }],
    });
    const getEnrichedSpeciesOptions = vi.fn().mockResolvedValue({
      moves: [{ name: 'shadow-ball' }, { name: 'protect' }], // learnset order puts Shadow Ball first
      abilities: [{ name: 'cursed-body' }],
    });
    const team = makeTeam([makePokemon()]);
    const { result, updateTeam } = setup({ getChampionsUsage, getEnrichedSpeciesOptions });

    await result.current.swapSlot(team, 0, 'Gengar');

    const [, updates] = updateTeam.mock.calls[0];
    // usage ranks Protect (90%) above Shadow Ball (10%) despite learnset order
    expect(updates.pokemon[0].showdownData.moves).toEqual(['Protect', 'Shadow Ball']);
  });

  it('addSlot appends a new slot when the team has room', async () => {
    const team = makeTeam([makePokemon()]);
    const { result, updateTeam } = setup();

    const success = await result.current.addSlot(team, 'Rillaboom');

    expect(success).toBe(true);
    const [, updates] = updateTeam.mock.calls[0];
    expect(updates.pokemon).toHaveLength(2);
    expect(updates.pokemon[1].showdownData.species).toBe('Rillaboom');
  });

  it('addSlot refuses a full 6-Pokemon team without calling updateTeam', async () => {
    const team = makeTeam(Array.from({ length: 6 }, () => makePokemon()));
    const { result, updateTeam } = setup();

    const success = await result.current.addSlot(team, 'Rillaboom');

    expect(success).toBe(false);
    expect(updateTeam).not.toHaveBeenCalled();
  });

  it('removeSlot filters out the target index and left-shifts the rest', async () => {
    const team = makeTeam([makePokemon({ species: 'A' }), makePokemon({ species: 'B' }), makePokemon({ species: 'C' })]);
    const { result, updateTeam } = setup();

    await result.current.removeSlot(team, 1);

    const [, updates] = updateTeam.mock.calls[0];
    expect(updates.pokemon.map((p: ImportedPokemonInfo) => p.showdownData.species)).toEqual(['A', 'C']);
  });

  it('reorderSlot is a no-op when the indices are the same', async () => {
    const team = makeTeam([makePokemon(), makePokemon()]);
    const { result, updateTeam } = setup();

    const success = await result.current.reorderSlot(team, 0, 0);

    expect(success).toBe(false);
    expect(updateTeam).not.toHaveBeenCalled();
  });

  it('reorderSlot moves the Pokemon at fromIndex to toIndex', async () => {
    const team = makeTeam([makePokemon({ species: 'A' }), makePokemon({ species: 'B' }), makePokemon({ species: 'C' })]);
    const { result, updateTeam } = setup();

    await result.current.reorderSlot(team, 0, 2);

    const [, updates] = updateTeam.mock.calls[0];
    expect(updates.pokemon.map((p: ImportedPokemonInfo) => p.showdownData.species)).toEqual(['B', 'C', 'A']);
  });
});
