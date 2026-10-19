/**
 * Tests for publicTeamSynthesis.ts's client-side PublicTeam synthesis - the
 * optimistic stand-in ProfileCard.tsx shows for a team that has no real
 * `PublicTeam` from the Worker yet (Leg 6 fold-in into Profile Section
 * Remove-Team Control, see TODO.md). Mirrors worker/src/publicProfile.ts's
 * own `extractPublicTeam`/`extractPublicPokemon` test shape
 * (publicProfile.test.ts) since this is the client-side counterpart of the
 * same mapping.
 */

import { describe, expect, it } from 'vitest';
import { synthesizePublicTeam } from './publicTeamSynthesis';
import type { Team, ImportedPokemonInfo, ShowdownPokemon } from '../types/pokemon';

const ZERO_EVS = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 };

function makeShowdownPokemon(overrides: Partial<ShowdownPokemon> = {}): ShowdownPokemon {
  return {
    species: 'Incineroar',
    nickname: 'Big Cat',
    gender: 'M',
    item: 'Safety Goggles',
    ability: 'Intimidate',
    level: 50,
    shiny: true,
    gigantamax: false,
    happiness: 0,
    teraType: 'Grass',
    nature: 'Careful',
    evs: { ...ZERO_EVS, hp: 252, specialDefense: 252, attack: 4 },
    moves: ['Fake Out', 'Parting Shot', 'Flare Blitz', 'Knock Off'],
    ...overrides,
  };
}

function makePokemon(overrides: Partial<ShowdownPokemon> = {}): ImportedPokemonInfo {
  return {
    showdownData: makeShowdownPokemon(overrides),
    pokedexNumber: 727,
    types: ['fire', 'dark'],
    baseStats: {
      hp: 95,
      attack: 115,
      defense: 90,
      specialAttack: 80,
      specialDefense: 90,
      speed: 60,
    },
    spriteUrl: 'https://example.com/incineroar.png',
    importedAt: Date.now(),
    id: crypto.randomUUID(),
  };
}

function makeTeam(pokemon: ImportedPokemonInfo[]): Team {
  return {
    id: 'team-1',
    name: 'Trick Room',
    format: 'Reg M-B',
    pokemon,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

describe('synthesizePublicTeam', () => {
  it('includes the full competitive set for the open tier', () => {
    const team = makeTeam([makePokemon()]);
    const result = synthesizePublicTeam(team, 'open');

    expect(result.id).toBe('team-1');
    expect(result.name).toBe('Trick Room');
    expect(result.format).toBe('Reg M-B');
    expect(result.visibility).toBe('open');
    expect(result.pokemon).toHaveLength(1);
    expect(result.pokemon[0]).toMatchObject({
      species: 'Incineroar',
      nickname: 'Big Cat',
      item: 'Safety Goggles',
      ability: 'Intimidate',
      nature: 'Careful',
      teraType: 'Grass',
      shiny: true,
      gender: 'M',
      moves: ['Fake Out', 'Parting Shot', 'Flare Blitz', 'Knock Off'],
      evs: { ...ZERO_EVS, hp: 252, specialDefense: 252, attack: 4 },
    });
  });

  it('only carries species/nickname/spriteUrl for the closed tier', () => {
    const team = makeTeam([makePokemon()]);
    const result = synthesizePublicTeam(team, 'closed');

    expect(result.visibility).toBe('closed');
    expect(result.pokemon[0]).toEqual({
      species: 'Incineroar',
      nickname: 'Big Cat',
      spriteUrl: expect.stringContaining('727'),
    });
  });

  it('resolves the sprite from pokedexNumber/species/gender/shiny, not the stored spriteUrl', () => {
    const team = makeTeam([makePokemon()]);
    const result = synthesizePublicTeam(team, 'closed');

    // Stored spriteUrl is a stale 'https://example.com/...' placeholder -
    // the synthesized sprite must come from getPixelSpriteUrl's live
    // recompute instead (stored-snapshot-vs-live-recompute.md).
    expect(result.pokemon[0].spriteUrl).not.toBe('https://example.com/incineroar.png');
    expect(result.pokemon[0].spriteUrl).toContain('shiny/727.png');
  });
});
