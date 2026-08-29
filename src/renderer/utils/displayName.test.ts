import { describe, it, expect } from 'vitest';
import { toReadableName } from './displayName';

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
