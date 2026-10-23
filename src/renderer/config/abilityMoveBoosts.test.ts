/**
 * Test suite for abilityMoveBoosts.ts. Covers each of the five rule kinds,
 * the Technician pre-boost-power nuance (must read MoveData.power raw, not
 * a value already run through Technician's own multiplier), the
 * retype-conversion kind's Aerilate-vs-already-Flying-type distinction
 * (see file header), and the Sheer Force move list.
 */

import { describe, expect, it } from 'vitest';
import { getAbilityMoveBoostMultiplier } from './abilityMoveBoosts';
import type { MoveData } from '../types/gameData';

function move(overrides: Partial<MoveData>): MoveData {
  return {
    name: 'tackle',
    type: 'normal',
    category: 'physical',
    power: 40,
    pp: 35,
    accuracy: 100,
    description: '',
    flags: [],
    target: 'selected-pokemon',
    cachedAt: 0,
    expiresAt: 0,
    ...overrides,
  };
}

describe('getAbilityMoveBoostMultiplier', () => {
  it('returns null for no ability', () => {
    expect(getAbilityMoveBoostMultiplier(undefined, move({}))).toBeNull();
  });

  it('returns null for an ability with no boost rule', () => {
    expect(getAbilityMoveBoostMultiplier('Levitate', move({}))).toBeNull();
  });

  describe('flag rule', () => {
    it('boosts a punch move under Iron Fist', () => {
      expect(
        getAbilityMoveBoostMultiplier('Iron Fist', move({ name: 'fire-punch', flags: ['punch'] })),
      ).toBe(1.2);
    });

    it('does not boost a non-punch move under Iron Fist', () => {
      expect(
        getAbilityMoveBoostMultiplier('Iron Fist', move({ name: 'close-combat', flags: [] })),
      ).toBeNull();
    });

    it('boosts a bite move under Strong Jaw', () => {
      expect(
        getAbilityMoveBoostMultiplier('Strong Jaw', move({ name: 'crunch', flags: ['bite'] })),
      ).toBe(1.5);
    });

    it('boosts a pulse move under Mega Launcher', () => {
      expect(
        getAbilityMoveBoostMultiplier(
          'Mega Launcher',
          move({ name: 'dark-pulse', flags: ['pulse'] }),
        ),
      ).toBe(1.5);
    });

    it('boosts a contact move under Tough Claws, including the display-hidden contact flag', () => {
      expect(
        getAbilityMoveBoostMultiplier('Tough Claws', move({ name: 'tackle', flags: ['contact'] })),
      ).toBe(1.3);
    });
  });

  describe('effective-type rule', () => {
    it('boosts a Steel-type move under Steely Spirit', () => {
      expect(
        getAbilityMoveBoostMultiplier('Steely Spirit', move({ name: 'iron-head', type: 'steel' })),
      ).toBe(1.5);
    });

    it('does not boost a non-Steel move under Steely Spirit', () => {
      expect(
        getAbilityMoveBoostMultiplier('Steely Spirit', move({ name: 'tackle', type: 'normal' })),
      ).toBeNull();
    });

    it('boosts an Electric-type move under Transistor', () => {
      expect(
        getAbilityMoveBoostMultiplier(
          'Transistor',
          move({ name: 'thunderbolt', type: 'electric' }),
        ),
      ).toBe(1.3);
    });

    it("boosts a Dragon-type move under Dragon's Maw", () => {
      expect(
        getAbilityMoveBoostMultiplier(
          "Dragon's Maw",
          move({ name: 'dragon-pulse', type: 'dragon' }),
        ),
      ).toBe(1.5);
    });
  });

  describe('retype-conversion rule', () => {
    it('boosts a Normal-type move converted to Flying under Aerilate', () => {
      expect(
        getAbilityMoveBoostMultiplier('Aerilate', move({ name: 'tackle', type: 'normal' })),
      ).toBe(1.2);
    });

    it('does not boost an already-Flying-type move under Aerilate (not a conversion)', () => {
      expect(
        getAbilityMoveBoostMultiplier('Aerilate', move({ name: 'hurricane', type: 'flying' })),
      ).toBeNull();
    });

    it('does not boost an already-Fairy-type move under Pixilate (not a conversion)', () => {
      expect(
        getAbilityMoveBoostMultiplier('Pixilate', move({ name: 'moonblast', type: 'fairy' })),
      ).toBeNull();
    });

    it('boosts every move under Normalize, including an already-Normal-type move', () => {
      expect(
        getAbilityMoveBoostMultiplier('Normalize', move({ name: 'tackle', type: 'normal' })),
      ).toBe(1.2);
      expect(
        getAbilityMoveBoostMultiplier('Normalize', move({ name: 'flamethrower', type: 'fire' })),
      ).toBe(1.2);
    });
  });

  describe('power-threshold rule (Technician)', () => {
    it('boosts a move at exactly the 60 power threshold', () => {
      expect(
        getAbilityMoveBoostMultiplier('Technician', move({ name: 'rock-smash', power: 60 })),
      ).toBe(1.5);
    });

    it('does not boost a move above the threshold', () => {
      expect(
        getAbilityMoveBoostMultiplier('Technician', move({ name: 'close-combat', power: 120 })),
      ).toBeNull();
    });

    it('does not boost a status move with null power', () => {
      expect(
        getAbilityMoveBoostMultiplier('Technician', move({ name: 'protect', power: null })),
      ).toBeNull();
    });

    it("reads the move's raw base power, not a value already run through Technician's own boost", () => {
      // A move whose raw power is 61 must fail the threshold even though
      // 61 * 1.5 was never actually computed here - this asserts the
      // lookup is against MoveData.power directly, never a pre-boosted
      // number a caller might otherwise pass in by mistake.
      expect(
        getAbilityMoveBoostMultiplier('Technician', move({ name: 'return', power: 61 })),
      ).toBeNull();
    });
  });

  describe('move-list rule (Sheer Force)', () => {
    it('boosts a move with a secondary effect on the curated list', () => {
      expect(getAbilityMoveBoostMultiplier('Sheer Force', move({ name: 'flamethrower' }))).toBe(
        1.3,
      );
    });

    it('does not boost a move with no secondary effect', () => {
      expect(getAbilityMoveBoostMultiplier('Sheer Force', move({ name: 'tackle' }))).toBeNull();
    });

    it('does not boost a move absent from Champions entirely (filtered out at curation time)', () => {
      // Secret Power/Nature Power are both on Serebii's Sheer Force list
      // but absent from Champions - see championsMovepoolChanges.ts's
      // GLOBALLY_REMOVED_MOVES and this file's header.
      expect(
        getAbilityMoveBoostMultiplier('Sheer Force', move({ name: 'secret-power' })),
      ).toBeNull();
      expect(
        getAbilityMoveBoostMultiplier('Sheer Force', move({ name: 'nature-power' })),
      ).toBeNull();
    });
  });
});
