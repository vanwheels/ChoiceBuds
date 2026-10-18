import { describe, it, expect } from 'vitest';
import {
  extractPublicPokemon,
  extractPublicTeam,
  extractPublicFavoritePokemon,
} from './publicProfile';

function pokemon(
  overrides: {
    showdownData?: Record<string, unknown>;
    spriteUrl?: string | undefined;
  } = {},
): Record<string, unknown> {
  const { showdownData, ...rest } = overrides;
  return {
    showdownData: { species: 'Flutter Mane', nickname: 'Scream', ...showdownData },
    spriteUrl: 'https://example.com/flutter-mane.png',
    ...rest,
  };
}

function team(overrides: Record<string, unknown> = {}): Record<string, unknown> & {
  id: string;
  updatedAt: number;
} {
  return {
    id: 't1',
    updatedAt: 1,
    isPublic: true,
    name: 'Rain Team',
    format: 'Reg M-A',
    pokemon: [pokemon()],
    ...overrides,
  };
}

describe('extractPublicPokemon', () => {
  it('extracts species/nickname/spriteUrl from a real roster entry', () => {
    expect(extractPublicPokemon(pokemon())).toEqual({
      species: 'Flutter Mane',
      nickname: 'Scream',
      spriteUrl: 'https://example.com/flutter-mane.png',
    });
  });

  it('omits the nickname when absent, falling back to undefined (not an empty string)', () => {
    expect(
      extractPublicPokemon(pokemon({ showdownData: { species: 'Flutter Mane', nickname: '' } })),
    ).toEqual({
      species: 'Flutter Mane',
      nickname: undefined,
      spriteUrl: 'https://example.com/flutter-mane.png',
    });
  });

  it('drops a flagged nickname but keeps the Pokemon (species/sprite)', () => {
    const result = extractPublicPokemon(
      pokemon({ showdownData: { species: 'Flutter Mane', nickname: 'fuck' } }),
    );
    expect(result).toEqual({
      species: 'Flutter Mane',
      nickname: undefined,
      spriteUrl: 'https://example.com/flutter-mane.png',
    });
  });

  it('returns null for malformed/missing data', () => {
    expect(extractPublicPokemon(null)).toBeNull();
    expect(extractPublicPokemon('not an object')).toBeNull();
    expect(extractPublicPokemon({})).toBeNull();
    expect(extractPublicPokemon({ showdownData: {}, spriteUrl: 'x' })).toBeNull(); // no species
    expect(extractPublicPokemon(pokemon({ spriteUrl: undefined }))).toBeNull(); // no spriteUrl
  });
});

describe('extractPublicTeam', () => {
  it('extracts a public team down to id/name/format/pokemon', () => {
    expect(extractPublicTeam(team())).toEqual({
      id: 't1',
      name: 'Rain Team',
      format: 'Reg M-A',
      pokemon: [
        {
          species: 'Flutter Mane',
          nickname: 'Scream',
          spriteUrl: 'https://example.com/flutter-mane.png',
        },
      ],
    });
  });

  it('returns null for a team not toggled public', () => {
    expect(extractPublicTeam(team({ isPublic: false }))).toBeNull();
    expect(extractPublicTeam(team({ isPublic: undefined }))).toBeNull();
  });

  it('excludes the whole team when its name fails the safety filter', () => {
    expect(extractPublicTeam(team({ name: 'fuck team' }))).toBeNull();
  });

  it('filters out malformed Pokemon entries while keeping valid ones', () => {
    const result = extractPublicTeam(team({ pokemon: [pokemon(), null, 'garbage'] }));
    expect(result?.pokemon).toHaveLength(1);
  });
});

describe('extractPublicFavoritePokemon', () => {
  it('extracts species + the non-shiny spriteUrl when not shiny', () => {
    expect(
      extractPublicFavoritePokemon({
        updatedAt: 1,
        isPublic: true,
        species: 'Flutter Mane',
        shiny: false,
        spriteUrl: 'https://example.com/base.png',
        shinySpriteUrl: 'https://example.com/shiny.png',
      }),
    ).toEqual({ species: 'Flutter Mane', spriteUrl: 'https://example.com/base.png' });
  });

  it('extracts the shiny spriteUrl when shiny is true', () => {
    expect(
      extractPublicFavoritePokemon({
        updatedAt: 1,
        isPublic: true,
        species: 'Flutter Mane',
        shiny: true,
        spriteUrl: 'https://example.com/base.png',
        shinySpriteUrl: 'https://example.com/shiny.png',
      }),
    ).toEqual({ species: 'Flutter Mane', spriteUrl: 'https://example.com/shiny.png' });
  });

  it('returns null when unset, not toggled public, or missing', () => {
    expect(extractPublicFavoritePokemon(undefined)).toBeNull();
    expect(
      extractPublicFavoritePokemon({
        updatedAt: 1,
        isPublic: false,
        species: 'Flutter Mane',
        shiny: false,
        spriteUrl: 'https://example.com/base.png',
        shinySpriteUrl: '',
      }),
    ).toBeNull();
    expect(
      extractPublicFavoritePokemon({ updatedAt: 1, isPublic: true, species: '', spriteUrl: '' }),
    ).toBeNull();
  });

  it('does not run the safety filter on species (not freeform user text)', () => {
    // A hypothetical malformed/tampered species string still isn't filtered -
    // this field only ever comes from the renderer's species-roster picker.
    expect(
      extractPublicFavoritePokemon({
        updatedAt: 1,
        isPublic: true,
        species: 'fuck',
        shiny: false,
        spriteUrl: 'https://example.com/base.png',
        shinySpriteUrl: '',
      }),
    ).toEqual({ species: 'fuck', spriteUrl: 'https://example.com/base.png' });
  });
});
