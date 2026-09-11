import { describe, it, expect } from 'vitest';
import { toReadableName, toTitleCase } from './displayName';

describe('toReadableName', () => {
  it('title-cases a single-word slug', () => {
    expect(toReadableName('thunderbolt')).toBe('Thunderbolt');
  });

  it('capitalizes each hyphen-separated word and joins with spaces', () => {
    expect(toReadableName('sucker-punch')).toBe('Sucker Punch');
  });

  it('handles slugs with more than two words', () => {
    expect(toReadableName('choice-specs-set')).toBe('Choice Specs Set');
  });

  it('returns an empty string unchanged', () => {
    expect(toReadableName('')).toBe('');
  });

  it('leaves an already-single uppercase letter word alone', () => {
    expect(toReadableName('u-turn')).toBe('U Turn');
  });
});

describe('toTitleCase', () => {
  it('title-cases a single-word identifier', () => {
    expect(toTitleCase('absolite')).toBe('Absolite');
  });

  it('capitalizes each space-separated word, matching vgcData.ts\'s Mega Stone casing', () => {
    expect(toTitleCase('charizardite x')).toBe('Charizardite X');
    expect(toTitleCase('absolite z')).toBe('Absolite Z');
  });
});
