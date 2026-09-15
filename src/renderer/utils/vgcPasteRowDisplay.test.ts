import { describe, expect, it } from 'vitest';
import { findRosterEntry, formatEvs } from './vgcPasteRowDisplay';
import type { EVSpread, SpeciesRosterEntry } from '../types/pokemon';

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
