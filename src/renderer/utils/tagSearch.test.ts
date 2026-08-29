import { describe, it, expect } from 'vitest';
import { parseTagFilter } from './tagSearch';

describe('parseTagFilter', () => {
  it('returns null for a plain search string with no # prefix', () => {
    expect(parseTagFilter('pikachu')).toBeNull();
  });

  it('returns null for an empty string', () => {
    expect(parseTagFilter('')).toBeNull();
  });

  it('extracts and lowercases the tag after #', () => {
    expect(parseTagFilter('#Fire')).toBe('fire');
  });

  it('trims leading/trailing whitespace around the search text first', () => {
    expect(parseTagFilter('  #fire  ')).toBe('fire');
  });

  it('trims whitespace between the # and the tag text', () => {
    expect(parseTagFilter('#  dragon')).toBe('dragon');
  });

  it('returns an empty string for a bare "#" with nothing after it', () => {
    expect(parseTagFilter('#')).toBe('');
  });

  it('does not treat a "#" appearing mid-string as a tag filter', () => {
    expect(parseTagFilter('foo#bar')).toBeNull();
  });
});
