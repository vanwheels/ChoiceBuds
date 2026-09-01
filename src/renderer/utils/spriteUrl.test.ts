import { describe, it, expect } from 'vitest';
import { getPixelSpriteUrl, getAnimatedSpriteUrl } from './spriteUrl';

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

describe('getAnimatedSpriteUrl', () => {
  it('builds the default (non-shiny) ani/ URL for a plain species', () => {
    expect(getAnimatedSpriteUrl('Pikachu', 'M', false)).toBe(
      'https://play.pokemonshowdown.com/sprites/ani/pikachu.gif'
    );
  });

  it('uses the ani-shiny/ folder when shiny is true', () => {
    expect(getAnimatedSpriteUrl('Pikachu', 'M', true)).toBe(
      'https://play.pokemonshowdown.com/sprites/ani-shiny/pikachu.gif'
    );
  });

  it('mechanically strips hyphens for a regional/statistical form', () => {
    expect(getAnimatedSpriteUrl('Landorus-Therian', 'M', false)).toBe(
      'https://play.pokemonshowdown.com/sprites/ani/landorustherian.gif'
    );
  });

  it('mechanically strips punctuation (apostrophe)', () => {
    expect(getAnimatedSpriteUrl("Farfetch'd", 'M', false)).toBe(
      'https://play.pokemonshowdown.com/sprites/ani/farfetchd.gif'
    );
  });

  it('mechanically strips punctuation (period and space)', () => {
    expect(getAnimatedSpriteUrl('Mr. Mime', 'M', false)).toBe(
      'https://play.pokemonshowdown.com/sprites/ani/mrmime.gif'
    );
  });

  it('mechanically strips punctuation (colon and space)', () => {
    expect(getAnimatedSpriteUrl('Type: Null', 'M', false)).toBe(
      'https://play.pokemonshowdown.com/sprites/ani/typenull.gif'
    );
  });

  it('mechanically strips a trailing hyphen-letter suffix (Nidoran-F)', () => {
    expect(getAnimatedSpriteUrl('Nidoran-F', 'F', false)).toBe(
      'https://play.pokemonshowdown.com/sprites/ani/nidoranf.gif'
    );
  });

  it('mangles a Mega API slug the same mechanical way', () => {
    expect(getAnimatedSpriteUrl('charizard-mega-x', 'M', false)).toBe(
      'https://play.pokemonshowdown.com/sprites/ani/charizardmegax.gif'
    );
  });

  it('resolves the bare species to the un-suffixed (male) id for a gender-divergent species', () => {
    expect(getAnimatedSpriteUrl('Basculegion', 'M', false)).toBe(
      'https://play.pokemonshowdown.com/sprites/ani/basculegion.gif'
    );
  });

  it('appends only "f" (not the mechanical mangling) for a gender-divergent species via the gender param', () => {
    expect(getAnimatedSpriteUrl('Indeedee', 'F', false)).toBe(
      'https://play.pokemonshowdown.com/sprites/ani/indeedeef.gif'
    );
  });

  it('appends only "f" when the species string already carries a "-Female" suffix', () => {
    expect(getAnimatedSpriteUrl('Meowstic-Female', 'M', false)).toBe(
      'https://play.pokemonshowdown.com/sprites/ani/meowsticf.gif'
    );
  });

  it('appends only "f" when the species string already carries a "-F" suffix', () => {
    expect(getAnimatedSpriteUrl('Oinkologne-F', 'M', false)).toBe(
      'https://play.pokemonshowdown.com/sprites/ani/oinkolognef.gif'
    );
  });

  it('resolves an explicit "-Male" suffix to the un-suffixed id, not a mechanically-mangled one', () => {
    expect(getAnimatedSpriteUrl('Basculegion-Male', 'M', false)).toBe(
      'https://play.pokemonshowdown.com/sprites/ani/basculegion.gif'
    );
  });
});
