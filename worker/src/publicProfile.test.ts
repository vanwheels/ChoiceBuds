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
    visibility: 'closed',
    name: 'Rain Team',
    format: 'Reg M-A',
    pokemon: [pokemon()],
    ...overrides,
  };
}

describe('extractPublicPokemon', () => {
  it('extracts species/nickname/spriteUrl from a real roster entry (closed tier)', () => {
    expect(extractPublicPokemon(pokemon(), false)).toEqual({
      species: 'Flutter Mane',
      nickname: 'Scream',
      spriteUrl: 'https://example.com/flutter-mane.png',
    });
  });

  it('omits the nickname when absent, falling back to undefined (not an empty string)', () => {
    expect(
      extractPublicPokemon(
        pokemon({ showdownData: { species: 'Flutter Mane', nickname: '' } }),
        false,
      ),
    ).toEqual({
      species: 'Flutter Mane',
      nickname: undefined,
      spriteUrl: 'https://example.com/flutter-mane.png',
    });
  });

  it('drops a flagged nickname but keeps the Pokemon (species/sprite)', () => {
    const result = extractPublicPokemon(
      pokemon({ showdownData: { species: 'Flutter Mane', nickname: 'fuck' } }),
      false,
    );
    expect(result).toEqual({
      species: 'Flutter Mane',
      nickname: undefined,
      spriteUrl: 'https://example.com/flutter-mane.png',
    });
  });

  it('returns null for malformed/missing data', () => {
    expect(extractPublicPokemon(null, false)).toBeNull();
    expect(extractPublicPokemon('not an object', false)).toBeNull();
    expect(extractPublicPokemon({}, false)).toBeNull();
    expect(extractPublicPokemon({ showdownData: {}, spriteUrl: 'x' }, false)).toBeNull(); // no species
    expect(extractPublicPokemon(pokemon({ spriteUrl: undefined }), false)).toBeNull(); // no spriteUrl
  });

  it('includes the full set when includeSetData is true (open tier)', () => {
    const result = extractPublicPokemon(
      pokemon({
        showdownData: {
          species: 'Flutter Mane',
          nickname: 'Scream',
          item: 'Choice Specs',
          ability: 'Protosynthesis',
          level: 50,
          shiny: true,
          gigantamax: false,
          happiness: 255,
          teraType: 'Fairy',
          nature: 'Timid',
          gender: 'N',
          evs: { hp: 4, attack: 0, defense: 0, specialAttack: 252, specialDefense: 0, speed: 252 },
          moves: ['Shadow Ball', 'Moonblast', 'Mystical Fire', 'Protect'],
        },
      }),
      true,
    );
    expect(result).toEqual({
      species: 'Flutter Mane',
      nickname: 'Scream',
      spriteUrl: 'https://example.com/flutter-mane.png',
      item: 'Choice Specs',
      ability: 'Protosynthesis',
      level: 50,
      shiny: true,
      gigantamax: false,
      happiness: 255,
      teraType: 'Fairy',
      nature: 'Timid',
      gender: 'N',
      evs: { hp: 4, attack: 0, defense: 0, specialAttack: 252, specialDefense: 0, speed: 252 },
      moves: ['Shadow Ball', 'Moonblast', 'Mystical Fire', 'Protect'],
    });
  });

  it('omits open-tier fields that are missing or malformed rather than guessing a value', () => {
    const result = extractPublicPokemon(
      pokemon({ showdownData: { species: 'Flutter Mane', evs: 'not an object', moves: 'nope' } }),
      true,
    );
    expect(result).toEqual({
      species: 'Flutter Mane',
      nickname: 'Scream',
      spriteUrl: 'https://example.com/flutter-mane.png',
      item: undefined,
      ability: undefined,
      level: undefined,
      shiny: undefined,
      gigantamax: undefined,
      happiness: undefined,
      teraType: undefined,
      nature: undefined,
      evs: undefined,
      moves: undefined,
      gender: undefined,
    });
  });
});

describe('extractPublicTeam', () => {
  it('extracts a closed team down to id/name/format/visibility/pokemon, without set data', () => {
    expect(extractPublicTeam(team())).toEqual({
      id: 't1',
      name: 'Rain Team',
      format: 'Reg M-A',
      visibility: 'closed',
      pokemon: [
        {
          species: 'Flutter Mane',
          nickname: 'Scream',
          spriteUrl: 'https://example.com/flutter-mane.png',
        },
      ],
    });
  });

  it('extracts an open team with the full set included per Pokemon', () => {
    const result = extractPublicTeam(
      team({
        visibility: 'open',
        pokemon: [
          pokemon({
            showdownData: { species: 'Flutter Mane', nickname: 'Scream', item: 'Choice Specs' },
          }),
        ],
      }),
    );
    expect(result?.visibility).toBe('open');
    expect(result?.pokemon[0].item).toBe('Choice Specs');
  });

  it('returns null for a private or unrecognized-visibility team', () => {
    expect(extractPublicTeam(team({ visibility: 'private' }))).toBeNull();
    expect(extractPublicTeam(team({ visibility: undefined }))).toBeNull();
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
