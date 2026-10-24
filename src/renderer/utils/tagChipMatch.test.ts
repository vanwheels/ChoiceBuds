/**
 * Test suite for tag-chip matching/dedupe/disambiguation logic
 */

import { describe, expect, it } from 'vitest';
import {
  addChip,
  buildChipOptions,
  chipsEqual,
  excludeSelectedOptions,
  normalizeChipText,
  removeChip,
} from './tagChipMatch';
import type { TagChipCandidates } from './tagChipMatch';
import type { TagChip } from '../types/tagChip';

const CANDIDATES: TagChipCandidates = {
  types: ['fire', 'psychic', 'dragon'],
  moves: ['fire-blast', 'psychic', 'dragon-dance'],
  abilities: ['flash-fire', 'levitate'],
};

describe('normalizeChipText', () => {
  it('treats concatenated, spaced, and hyphenated forms as equal', () => {
    expect(normalizeChipText('fireblast')).toBe(normalizeChipText('fire blast'));
    expect(normalizeChipText('fireblast')).toBe(normalizeChipText('fire-blast'));
  });

  it('is case-insensitive', () => {
    expect(normalizeChipText('Flash Fire')).toBe(normalizeChipText('flash-fire'));
  });
});

describe('chipsEqual', () => {
  it('matches same category + normalized value', () => {
    const a: TagChip = { category: 'move', value: 'fire-blast' };
    const b: TagChip = { category: 'move', value: 'fireblast' };
    expect(chipsEqual(a, b)).toBe(true);
  });

  it('does not match across categories even with the same value', () => {
    const type: TagChip = { category: 'type', value: 'psychic' };
    const move: TagChip = { category: 'move', value: 'psychic' };
    expect(chipsEqual(type, move)).toBe(false);
  });
});

describe('addChip / removeChip', () => {
  it('adds a new chip', () => {
    const result = addChip([], { category: 'type', value: 'fire' });
    expect(result).toEqual([{ category: 'type', value: 'fire' }]);
  });

  it('is a no-op when an equal chip already exists', () => {
    const existing: TagChip[] = [{ category: 'move', value: 'fire-blast' }];
    const result = addChip(existing, { category: 'move', value: 'fire blast' });
    expect(result).toEqual(existing);
    expect(result).toHaveLength(1);
  });

  it('allows the same value under a different category', () => {
    const existing: TagChip[] = [{ category: 'type', value: 'psychic' }];
    const result = addChip(existing, { category: 'move', value: 'psychic' });
    expect(result).toEqual([
      { category: 'type', value: 'psychic' },
      { category: 'move', value: 'psychic' },
    ]);
  });

  it('removes a matching chip regardless of separator style', () => {
    const existing: TagChip[] = [{ category: 'ability', value: 'flash-fire' }];
    expect(removeChip(existing, { category: 'ability', value: 'flashfire' })).toEqual([]);
  });
});

describe('buildChipOptions', () => {
  it('returns no options for an empty query', () => {
    expect(buildChipOptions('', CANDIDATES)).toEqual([]);
  });

  it('matches regardless of query separator style', () => {
    const bySpace = buildChipOptions('fire blast', CANDIDATES);
    const byHyphen = buildChipOptions('fire-blast', CANDIDATES);
    const concatenated = buildChipOptions('fireblast', CANDIDATES);
    expect(bySpace).toEqual(byHyphen);
    expect(bySpace).toEqual(concatenated);
    expect(bySpace).toEqual([{ category: 'move', value: 'fire-blast', label: 'Fire Blast' }]);
  });

  it('disambiguates a name that is both a type and a move as separate labeled options', () => {
    const options = buildChipOptions('psychic', CANDIDATES);
    expect(options).toEqual([
      { category: 'type', value: 'psychic', label: 'Psychic' },
      { category: 'move', value: 'psychic', label: 'Psychic' },
    ]);
  });

  it('matches a substring across all three categories independently', () => {
    const options = buildChipOptions('fire', CANDIDATES);
    expect(options).toEqual([
      { category: 'type', value: 'fire', label: 'Fire' },
      { category: 'move', value: 'fire-blast', label: 'Fire Blast' },
      { category: 'ability', value: 'flash-fire', label: 'Flash Fire' },
    ]);
  });
});

describe('excludeSelectedOptions', () => {
  it('drops options already present as a selected chip', () => {
    const options = buildChipOptions('fire', CANDIDATES);
    const chips: TagChip[] = [{ category: 'type', value: 'fire' }];
    expect(excludeSelectedOptions(options, chips)).toEqual([
      { category: 'move', value: 'fire-blast', label: 'Fire Blast' },
      { category: 'ability', value: 'flash-fire', label: 'Flash Fire' },
    ]);
  });
});
