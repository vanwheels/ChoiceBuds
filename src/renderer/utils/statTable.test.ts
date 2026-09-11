import { describe, it, expect } from 'vitest';
import { computeBST, nextStatTableSort, sortStatTableRows } from './statTable';
import type { PokemonStats } from '../types/pokemon';

const stats = (overrides: Partial<PokemonStats> = {}): PokemonStats => ({
  hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0,
  ...overrides,
});

describe('computeBST', () => {
  it('sums all six stats', () => {
    expect(computeBST(stats({ hp: 100, attack: 50, defense: 50, specialAttack: 50, specialDefense: 50, speed: 50 }))).toBe(350);
  });

  it('returns 0 for an all-zero spread', () => {
    expect(computeBST(stats())).toBe(0);
  });
});

describe('nextStatTableSort', () => {
  it('starts a fresh column descending', () => {
    expect(nextStatTableSort(null, 'speed')).toEqual({ key: 'speed', direction: 'desc' });
  });

  it('switching to a different column resets to descending', () => {
    const current = { key: 'hp' as const, direction: 'asc' as const };
    expect(nextStatTableSort(current, 'speed')).toEqual({ key: 'speed', direction: 'desc' });
  });

  it('clicking the active column flips direction', () => {
    const desc = { key: 'speed' as const, direction: 'desc' as const };
    expect(nextStatTableSort(desc, 'speed')).toEqual({ key: 'speed', direction: 'asc' });
    const asc = { key: 'speed' as const, direction: 'asc' as const };
    expect(nextStatTableSort(asc, 'speed')).toEqual({ key: 'speed', direction: 'desc' });
  });
});

describe('sortStatTableRows', () => {
  const rows = [
    { name: 'a', value: 50 },
    { name: 'b', value: 100 },
    { name: 'c', value: null as number | null },
    { name: 'd', value: 75 },
  ];
  const getValue = (row: typeof rows[number]) => row.value;

  it('sorts descending by resolved value', () => {
    const sorted = sortStatTableRows(rows, { key: 'bst', direction: 'desc' }, getValue);
    expect(sorted.map(r => r.name)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('sorts ascending by resolved value', () => {
    const sorted = sortStatTableRows(rows, { key: 'bst', direction: 'asc' }, getValue);
    expect(sorted.map(r => r.name)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('pushes rows with no cached value to the bottom regardless of direction', () => {
    const asc = sortStatTableRows(rows, { key: 'bst', direction: 'asc' }, getValue);
    const desc = sortStatTableRows(rows, { key: 'bst', direction: 'desc' }, getValue);
    expect(asc[asc.length - 1].name).toBe('c');
    expect(desc[desc.length - 1].name).toBe('c');
  });

  it('does not mutate the input array', () => {
    const original = [...rows];
    sortStatTableRows(rows, { key: 'bst', direction: 'desc' }, getValue);
    expect(rows).toEqual(original);
  });
});
