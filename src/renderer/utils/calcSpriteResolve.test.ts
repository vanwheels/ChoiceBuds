import { describe, expect, it, vi } from 'vitest';
import { resolveCalcPokemonSpriteUrl } from './calcSpriteResolve';
import type { SpeciesRosterEntry } from '../types/pokemon';

// Mirrors vgcPasteRowDisplay.test.ts's own mock - the Mega tier reads
// hooks/useMegaSprite.ts's shared module-level cache via getCachedMegaSprite,
// which only a mounted useMegaSpritePrefetch() (a real hook) can warm.
vi.mock('../hooks/useMegaSprite', () => ({
  getCachedMegaSprite: vi.fn((slug: string) =>
    slug === 'charizard-mega-x'
      ? { id: 10034, spriteUrl: 'mega-sprite', shinySpriteUrl: 'mega-sprite-shiny' }
      : null,
  ),
}));

const roster: SpeciesRosterEntry[] = [
  { name: 'Pikachu', id: 25, spriteUrl: 'pikachu-sprite', shinySpriteUrl: 'pikachu-shiny' },
  { name: 'Landorus-Therian', id: 645, spriteUrl: 'lando-t', shinySpriteUrl: 'lando-t-shiny' },
  {
    name: 'Aegislash-Shield',
    id: 681,
    spriteUrl: 'aegislash-shield',
    shinySpriteUrl: 'aegislash-shield-shiny',
  },
  {
    name: 'Basculegion-F',
    id: 902,
    spriteUrl: 'basculegion-f',
    shinySpriteUrl: 'basculegion-f-shiny',
  },
];

describe('resolveCalcPokemonSpriteUrl', () => {
  it('returns an empty string for no species', () => {
    expect(resolveCalcPokemonSpriteUrl('', 'M', roster)).toBe('');
  });

  it('resolves a direct roster match', () => {
    expect(resolveCalcPokemonSpriteUrl('Landorus-Therian', '', roster)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/645.png',
    );
  });

  it('resolves a bare default-forme name via normalizeSpeciesForAPI (Aegislash -> Shield)', () => {
    expect(resolveCalcPokemonSpriteUrl('Aegislash', '', roster)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/681.png',
    );
  });

  it('resolves an already-gendered species name directly (no folder trick needed)', () => {
    expect(resolveCalcPokemonSpriteUrl('Basculegion-F', '', roster)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/902.png',
    );
  });

  it('applies the cosmetic female sprite folder for species sharing one dex id', () => {
    expect(resolveCalcPokemonSpriteUrl('Pikachu', 'F', roster)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/25.png',
    );
    expect(resolveCalcPokemonSpriteUrl('Pikachu', 'M', roster)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
    );
  });

  it('resolves a Mega forme via the Mega-sprite cache, bypassing the roster entirely', () => {
    expect(resolveCalcPokemonSpriteUrl('Charizard-Mega-X', '', roster)).toBe('mega-sprite');
  });

  it('returns an empty string when nothing resolves', () => {
    expect(resolveCalcPokemonSpriteUrl('Not A Real Species', '', roster)).toBe('');
  });
});
