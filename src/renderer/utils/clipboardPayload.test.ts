import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  copyPokemonToClipboard,
  copyTeamToClipboard,
  readPokemonFromClipboard,
  readTeamFromClipboard,
} from './clipboardPayload';
import type { ImportedPokemonInfo, ShowdownPokemon, Team } from '../types/pokemon';

const ZERO_EVS = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

function makePokemon(overrides: Partial<ShowdownPokemon> = {}): ImportedPokemonInfo {
  return {
    showdownData: {
      species: 'Gengar',
      level: 50,
      shiny: false,
      gigantamax: false,
      happiness: 255,
      evs: { ...ZERO_EVS },
      moves: ['Shadow Ball'],
      ...overrides,
    },
    pokedexNumber: 94,
    types: ['ghost', 'poison'],
    baseStats: { hp: 60, attack: 65, defense: 60, specialAttack: 130, specialDefense: 75, speed: 110 },
    spriteUrl: 'https://example.com/gengar.png',
    importedAt: Date.now(),
    id: 'mon-1',
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
    favorite: true,
  };
}

// navigator.clipboard isn't implemented in jsdom - stub the two methods
// these functions actually call, backed by an in-memory string so
// write->read round-trips through the same fake "clipboard" a real one
// would use.
let clipboardText = '';

beforeEach(() => {
  clipboardText = '';
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: vi.fn(async (text: string) => { clipboardText = text; }),
      readText: vi.fn(async () => clipboardText),
    },
    configurable: true,
  });
});

describe('Pokémon copy/paste', () => {
  it('round-trips every field losslessly', async () => {
    const mon = makePokemon({ item: 'Choice Scarf', ability: 'Cursed Body' });
    await copyPokemonToClipboard(mon);
    const pasted = await readPokemonFromClipboard();
    expect(pasted).toEqual(mon);
  });

  it('returns null when the clipboard holds a copied Team instead', async () => {
    await copyTeamToClipboard(makeTeam([makePokemon()]));
    expect(await readPokemonFromClipboard()).toBeNull();
  });
});

describe('Team copy/paste', () => {
  it('round-trips every field losslessly, including favorite', async () => {
    const team = makeTeam([makePokemon()]);
    await copyTeamToClipboard(team);
    const pasted = await readTeamFromClipboard();
    expect(pasted).toEqual(team);
    expect(pasted?.favorite).toBe(true);
  });

  it('returns null when the clipboard holds a copied Pokémon instead', async () => {
    await copyPokemonToClipboard(makePokemon());
    expect(await readTeamFromClipboard()).toBeNull();
  });
});

describe('foreign/unreadable clipboard content', () => {
  it('returns null for plain unrelated text', async () => {
    clipboardText = 'just some text a user copied from elsewhere';
    expect(await readPokemonFromClipboard()).toBeNull();
    expect(await readTeamFromClipboard()).toBeNull();
  });

  it('returns null for foreign JSON with no signature', async () => {
    clipboardText = JSON.stringify({ hello: 'world' });
    expect(await readPokemonFromClipboard()).toBeNull();
    expect(await readTeamFromClipboard()).toBeNull();
  });

  it('returns null when the clipboard is empty', async () => {
    expect(await readPokemonFromClipboard()).toBeNull();
    expect(await readTeamFromClipboard()).toBeNull();
  });

  it('returns null when clipboard.readText throws (e.g. permission denied)', async () => {
    vi.mocked(navigator.clipboard.readText).mockRejectedValueOnce(new Error('denied'));
    expect(await readPokemonFromClipboard()).toBeNull();
  });
});
