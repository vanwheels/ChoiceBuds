import { describe, it, expect } from 'vitest';
import { parseTagFilter, parseTagFilters } from './tagSearch';

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

describe('parseTagFilters', () => {
  it('returns an empty array for a plain search string with no # prefix', () => {
    expect(parseTagFilters('pikachu')).toEqual([]);
  });

  it('returns an empty array for an empty string', () => {
    expect(parseTagFilters('')).toEqual([]);
  });

  it('extracts a single tag the same way parseTagFilter does', () => {
    expect(parseTagFilters('#Fire')).toEqual(['fire']);
  });

  it('splits multiple space-separated single-word tags on the # delimiter', () => {
    expect(parseTagFilters('#fire #shadowclaw #shadowsneak')).toEqual(['fire', 'shadowclaw', 'shadowsneak']);
  });

  it('keeps a multi-word tag intact when it is the only tag', () => {
    expect(parseTagFilters('#dragon dance')).toEqual(['dragon dance']);
  });

  it('keeps spaces within a tag but still splits on the next #', () => {
    expect(parseTagFilters('#dragon dance #flash fire')).toEqual(['dragon dance', 'flash fire']);
  });

  it('trims whitespace around and after each #', () => {
    expect(parseTagFilters('#  fire   #  dragon  ')).toEqual(['fire', 'dragon']);
  });

  it('returns [""] for a bare "#" with nothing after it', () => {
    expect(parseTagFilters('#')).toEqual(['']);
  });

  it('does not treat a "#" appearing mid-string as a tag filter', () => {
    expect(parseTagFilters('foo#bar')).toEqual([]);
  });
});
