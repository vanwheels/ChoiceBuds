import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTeamMoveTypes } from './useTeamMoveTypes';
import type { UseGameDataReturn } from './useGameData';
import type { Team, ImportedPokemonInfo, ShowdownPokemon, MoveData } from '../types/pokemon';

const ZERO_EVS = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

function makeShowdownPokemon(overrides: Partial<ShowdownPokemon> = {}): ShowdownPokemon {
  return {
    species: 'Gengar',
    level: 50,
    shiny: false,
    gigantamax: false,
    happiness: 255,
    evs: { ...ZERO_EVS },
    moves: ['Shadow Ball', 'Protect'],
    ...overrides,
  };
}

function makePokemon(overrides: Partial<ShowdownPokemon> = {}): ImportedPokemonInfo {
  return {
    showdownData: makeShowdownPokemon(overrides),
    pokedexNumber: 94,
    types: ['ghost', 'poison'],
    baseStats: {
      hp: 60,
      attack: 65,
      defense: 60,
      specialAttack: 130,
      specialDefense: 75,
      speed: 110,
    },
    spriteUrl: 'https://example.com/gengar.png',
    importedAt: Date.now(),
    id: crypto.randomUUID(),
  };
}

function makeTeam(pokemon: ImportedPokemonInfo[], overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    name: 'Test Team',
    format: 'Reg M-B',
    pokemon,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeMove(
  name: string,
  type: string,
  category: MoveData['category'] = 'special',
): MoveData {
  return {
    name,
    type,
    category,
    power: category === 'status' ? null : 90,
    accuracy: 100,
    pp: 15,
    description: '',
    flags: [],
    target: 'selected-pokemon',
    cachedAt: Date.now(),
    expiresAt: Date.now() + 100_000,
  };
}

function makeGameData(
  getMoveData: (moveName: string) => Promise<MoveData | null>,
): UseGameDataReturn {
  return { getMoveData } as unknown as UseGameDataReturn;
}

describe('useTeamMoveTypes', () => {
  it('returns an empty, non-loading result when there is no team', () => {
    const gameData = makeGameData(vi.fn());
    const { result } = renderHook(() => useTeamMoveTypes(undefined, gameData));
    expect(result.current).toEqual({ moveTypesByPokemon: [], isLoading: false });
  });

  it('is loading immediately after mount for a real team', () => {
    const gameData = makeGameData(vi.fn().mockResolvedValue(null));
    const team = makeTeam([makePokemon()]);
    const { result } = renderHook(() => useTeamMoveTypes(team, gameData));
    expect(result.current.isLoading).toBe(true);
  });

  it("resolves each Pokemon's damaging move types once move data loads, excluding status moves", async () => {
    const moves: Record<string, MoveData> = {
      'Shadow Ball': makeMove('Shadow Ball', 'ghost'),
      Protect: makeMove('Protect', 'normal', 'status'),
    };
    const getMoveData = vi.fn((name: string) => Promise.resolve(moves[name] ?? null));
    const gameData = makeGameData(getMoveData);
    const team = makeTeam([makePokemon()]);
    const { result } = renderHook(() => useTeamMoveTypes(team, gameData));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.moveTypesByPokemon).toEqual([['ghost']]);
  });

  it('applies an equipped type-changing ability to the reported move type', async () => {
    const getMoveData = vi.fn(() => Promise.resolve(makeMove('Tackle', 'normal', 'physical')));
    const gameData = makeGameData(getMoveData);
    const team = makeTeam([makePokemon({ moves: ['Tackle'], ability: 'Pixilate' })]);
    const { result } = renderHook(() => useTeamMoveTypes(team, gameData));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.moveTypesByPokemon).toEqual([['fairy']]);
  });

  it("drops a move entirely when its data can't be resolved", async () => {
    const getMoveData = vi.fn(() => Promise.resolve(null));
    const gameData = makeGameData(getMoveData);
    const team = makeTeam([makePokemon({ moves: ['Unknown Move'] })]);
    const { result } = renderHook(() => useTeamMoveTypes(team, gameData));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.moveTypesByPokemon).toEqual([[]]);
  });

  it('flips back to loading and re-resolves when the team id changes', async () => {
    const getMoveData = vi.fn(() => Promise.resolve(makeMove('Tackle', 'normal', 'physical')));
    const gameData = makeGameData(getMoveData);
    const teamA = makeTeam([makePokemon({ moves: ['Tackle'] })]);
    const { result, rerender } = renderHook(({ team }) => useTeamMoveTypes(team, gameData), {
      initialProps: { team: teamA as Team | undefined },
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const teamB = makeTeam([makePokemon({ moves: ['Tackle'] })], { id: 'team-2' });
    rerender({ team: teamB });
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.moveTypesByPokemon).toEqual([['normal']]);
  });

  it("resolves a move's type against the active Mega's guaranteed ability, not the base form's", async () => {
    const getMoveData = vi.fn(() => Promise.resolve(makeMove('Tackle', 'normal', 'physical')));
    const gameData = makeGameData(getMoveData);
    // Base Pinsir has no type-changing ability; its Mega form is guaranteed
    // Aerilate (config/megaAbilities.ts) - Tackle should only report as
    // Flying once that Mega form is the active toggle.
    const pinsir = makePokemon({ species: 'Pinsir', item: 'Pinsirite', moves: ['Tackle'] });
    const team = makeTeam([pinsir]);

    const { result } = renderHook(() =>
      useTeamMoveTypes(team, gameData, { [pinsir.id]: 'pinsir-mega' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.moveTypesByPokemon).toEqual([['flying']]);
  });

  it("ignores a toggle pointed at a form that is not this slot's own Mega", async () => {
    const getMoveData = vi.fn(() => Promise.resolve(makeMove('Tackle', 'normal', 'physical')));
    const gameData = makeGameData(getMoveData);
    const pinsir = makePokemon({ species: 'Pinsir', moves: ['Tackle'] }); // no Mega Stone held
    const team = makeTeam([pinsir]);

    const { result } = renderHook(() =>
      useTeamMoveTypes(team, gameData, { [pinsir.id]: 'pinsir-mega' }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.moveTypesByPokemon).toEqual([['normal']]);
  });
});
