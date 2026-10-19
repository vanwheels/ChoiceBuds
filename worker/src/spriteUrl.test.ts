import { describe, it, expect } from 'vitest';
import { getPixelSpriteUrl } from './spriteUrl';

describe('getPixelSpriteUrl', () => {
  it('builds the base (non-shiny) sprite URL', () => {
    expect(getPixelSpriteUrl(987, 'Flutter Mane', 'N', false)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/987.png',
    );
  });

  it('builds the shiny sprite URL', () => {
    expect(getPixelSpriteUrl(987, 'Flutter Mane', 'N', true)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/987.png',
    );
  });

  it('routes a female cosmetic-gender-divergent species through the female/ folder', () => {
    expect(getPixelSpriteUrl(25, 'Pikachu', 'F', false)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/female/25.png',
    );
    expect(getPixelSpriteUrl(25, 'Pikachu', 'F', true)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/female/25.png',
    );
  });

  it('skips the female/ folder for a non-cosmetic gender-divergent species even when female', () => {
    expect(getPixelSpriteUrl(902, 'Basculegion-F', 'F', false)).toBe(
      'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/902.png',
    );
  });
});
