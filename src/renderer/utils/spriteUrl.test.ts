import { describe, it, expect } from 'vitest';
import { getPixelSpriteUrl } from './spriteUrl';

describe('getPixelSpriteUrl', () => {
  it('builds the default (non-shiny, non-gendered-folder) URL', () => {
    expect(getPixelSpriteUrl(25, 'pikachu', 'M', false)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png'
    );
  });

  it('adds the shiny/ path segment when shiny is true', () => {
    expect(getPixelSpriteUrl(25, 'pikachu', 'M', true)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/25.png'
    );
  });

  it('uses the female/ folder for a cosmetic-gendered species when gender is F', () => {
    expect(getPixelSpriteUrl(25, 'pikachu', 'F', false)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/25.png'
    );
  });

  it('combines shiny/ and female/ for a shiny female cosmetic-gendered species', () => {
    expect(getPixelSpriteUrl(133, 'eevee', 'F', true)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/female/133.png'
    );
  });

  it('does not use the female/ folder for a species with no cosmetic female form', () => {
    expect(getPixelSpriteUrl(94, 'gengar', 'F', false)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/94.png'
    );
  });

  it('skips the female/ folder for Basculegion even when gender is F, since it has its own dex id already', () => {
    expect(getPixelSpriteUrl(902, 'basculegion-female', 'F', false)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/902.png'
    );
  });

  it('skips the female/ folder for Indeedee even when gender is F', () => {
    expect(getPixelSpriteUrl(876, 'indeedee-female', 'F', false)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/876.png'
    );
  });

  it('matches species names case-insensitively', () => {
    expect(getPixelSpriteUrl(25, 'PIKACHU', 'F', false)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/25.png'
    );
  });
});
