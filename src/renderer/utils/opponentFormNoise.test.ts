import { describe, expect, it } from 'vitest';
import type { SpeciesRosterEntry } from '../types/gameData';
import { excludeOpponentPickerNoise } from './opponentFormNoise';

function entry(name: string): SpeciesRosterEntry {
  return { name, id: 1, spriteUrl: '', shinySpriteUrl: '' };
}

describe('excludeOpponentPickerNoise', () => {
  it('drops Aegislash-Blade but keeps Aegislash-Shield', () => {
    const roster = [entry('Aegislash-Shield'), entry('Aegislash-Blade')];
    expect(excludeOpponentPickerNoise(roster).map((e) => e.name)).toEqual(['Aegislash-Shield']);
  });

  it('drops Maushold-Family-Of-Three but keeps Maushold-Family-Of-Four', () => {
    const roster = [entry('Maushold-Family-Of-Four'), entry('Maushold-Family-Of-Three')];
    expect(excludeOpponentPickerNoise(roster).map((e) => e.name)).toEqual([
      'Maushold-Family-Of-Four',
    ]);
  });

  it('is case-insensitive and leaves unrelated species untouched', () => {
    const roster = [entry('AEGISLASH-BLADE'), entry('Pikachu'), entry('Charizard')];
    expect(excludeOpponentPickerNoise(roster).map((e) => e.name)).toEqual(['Pikachu', 'Charizard']);
  });
});
