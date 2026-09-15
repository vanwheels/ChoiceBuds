import { describe, expect, it, vi } from 'vitest';
import { findRosterEntry, formatEvs, resolveCatalogSpriteEntry } from './vgcPasteRowDisplay';
import type { EVSpread, SpeciesRosterEntry } from '../types/pokemon';

// resolveCatalogSpriteEntry's Mega tier reads hooks/useMegaSprite.ts's shared
// module-level cache via getCachedMegaSprite - mocked here so these tests
// don't depend on that cache actually being warmed by a mounted
// useMegaSpritePrefetch() (a real hook, not callable from a plain unit test).
vi.mock('../hooks/useMegaSprite', () => ({
  getCachedMegaSprite: vi.fn((slug: string) =>
    slug === 'absol-mega-z' || slug === 'floette-mega'
      ? { id: 1, spriteUrl: `mega:${slug}`, shinySpriteUrl: `mega-shiny:${slug}` }
      : null
  ),
}));

function makeEvs(overrides: Partial<EVSpread>): EVSpread {
  return { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0, ...overrides };
}

describe('formatEvs', () => {
  it('formats non-zero stats in HP/Atk/Def/SpA/SpD/Spe order', () => {
    const evs = makeEvs({ speed: 252, defense: 4, hp: 252 });
    expect(formatEvs(evs)).toBe('252 HP / 4 Def / 252 Spe');
  });

  it('omits zero-value stats', () => {
    const evs = makeEvs({ specialAttack: 252 });
    expect(formatEvs(evs)).toBe('252 SpA');
  });

  it('returns "No EVs" when every stat is zero', () => {
    expect(formatEvs(makeEvs({}))).toBe('No EVs');
  });
});

describe('findRosterEntry', () => {
  const roster: SpeciesRosterEntry[] = [
    { name: 'Landorus-Therian', id: 645, spriteUrl: 'a', shinySpriteUrl: 'a-shiny' },
    { name: 'Flutter Mane', id: 987, spriteUrl: 'b', shinySpriteUrl: 'b-shiny' },
  ];

  it('matches on an exact name', () => {
    expect(findRosterEntry('Landorus-Therian', roster)?.id).toBe(645);
  });

  it('matches case-insensitively and ignoring hyphen/space differences', () => {
    expect(findRosterEntry('landorus therian', roster)?.id).toBe(645);
    expect(findRosterEntry('FLUTTER-MANE', roster)?.id).toBe(987);
  });

  it('returns undefined when nothing matches', () => {
    expect(findRosterEntry('Not A Real Species', roster)).toBeUndefined();
  });
});

describe('resolveCatalogSpriteEntry', () => {
  const roster: SpeciesRosterEntry[] = [
    { name: 'Landorus-Therian', id: 645, spriteUrl: 'landorus-therian', shinySpriteUrl: 'landorus-therian-shiny' },
    { name: 'Aegislash-Shield', id: 681, spriteUrl: 'aegislash-shield', shinySpriteUrl: 'aegislash-shield-shiny' },
    { name: 'Basculegion-Male', id: 902, spriteUrl: 'basculegion-male', shinySpriteUrl: 'basculegion-male-shiny' },
    { name: 'Basculegion-Female', id: 902, spriteUrl: 'basculegion-female', shinySpriteUrl: 'basculegion-female-shiny' },
  ];

  it('uses a direct roster match first', () => {
    expect(resolveCatalogSpriteEntry('Landorus-Therian', roster)?.spriteUrl).toBe('landorus-therian');
  });

  it('falls back to normalizeSpeciesForAPI\'s slug for a species with no bare PokeAPI resource', () => {
    expect(resolveCatalogSpriteEntry('Aegislash', roster)?.spriteUrl).toBe('aegislash-shield');
  });

  it('resolves a gender-divergent species to its default (male) form', () => {
    expect(resolveCatalogSpriteEntry('Basculegion', roster)?.spriteUrl).toBe('basculegion-male');
  });

  it('resolves an explicit "-F" suffix to the female form', () => {
    expect(resolveCatalogSpriteEntry('Basculegion-F', roster)?.spriteUrl).toBe('basculegion-female');
  });

  it('resolves a curated Mega form from the Mega-sprite cache', () => {
    expect(resolveCatalogSpriteEntry('Absol-Mega-Z', roster)?.spriteUrl).toBe('mega:absol-mega-z');
  });

  it('maps both Floette Mega spellings to the one curated "floette-mega" slug', () => {
    expect(resolveCatalogSpriteEntry('Floette-Eternal-Mega', roster)?.spriteUrl).toBe('mega:floette-mega');
    expect(resolveCatalogSpriteEntry('Floette-Mega', roster)?.spriteUrl).toBe('mega:floette-mega');
  });

  it('returns null for a Mega-shaped string with no curated slug', () => {
    expect(resolveCatalogSpriteEntry('Pikachu-Mega', roster)).toBeNull();
  });

  it('returns null when nothing resolves', () => {
    expect(resolveCatalogSpriteEntry('Toxtricity', roster)).toBeNull();
  });
});
