import { describe, it, expect } from 'vitest';
import { realSetBundleToShowdownUpdates } from './teamRealSetImport';
import type { VgcRealSetBundle } from '../types/pokemon';

function makeBundle(overrides: Partial<VgcRealSetBundle> = {}): VgcRealSetBundle {
  return {
    item: 'Safety Goggles',
    ability: 'Intimidate',
    nature: 'Adamant',
    moves: ['Fake Out', 'Flare Blitz', 'Knock Off', 'U-turn'],
    evs: { hp: 4, attack: 252, defense: 0, specialAttack: 0, specialDefense: 0, speed: 252 },
    occurrences: 3,
    ...overrides,
  };
}

describe('realSetBundleToShowdownUpdates', () => {
  it('copies evs directly with no scale conversion', () => {
    const result = realSetBundleToShowdownUpdates(makeBundle());
    expect(result.evs).toEqual({ hp: 4, attack: 252, defense: 0, specialAttack: 0, specialDefense: 0, speed: 252 });
  });

  it('pads the move list to exactly 4 slots, filling missing ones with empty strings', () => {
    const result = realSetBundleToShowdownUpdates(makeBundle({ moves: ['Fake Out', 'Flare Blitz'] }));
    expect(result.moves).toEqual(['Fake Out', 'Flare Blitz', '', '']);
  });

  it('defaults nature to Hardy when unset', () => {
    const result = realSetBundleToShowdownUpdates(makeBundle({ nature: undefined }));
    expect(result.nature).toBe('Hardy');
  });

  it('defaults item/ability to empty string when unset', () => {
    const result = realSetBundleToShowdownUpdates(makeBundle({ item: undefined, ability: undefined }));
    expect(result.item).toBe('');
    expect(result.ability).toBe('');
  });

  it('does not touch species, gender, level, or nickname - a bundle carries none of those', () => {
    const result = realSetBundleToShowdownUpdates(makeBundle());
    expect(result.species).toBeUndefined();
    expect(result.gender).toBeUndefined();
    expect(result.level).toBeUndefined();
    expect(result.nickname).toBeUndefined();
  });
});
