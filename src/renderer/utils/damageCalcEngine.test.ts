/**
 * Test suite for damageCalcEngine.ts. Currently scoped to the Champions
 * ability damage-math overrides (championsAbilityDamageEffects.ts) applied
 * in computeSideResults - the rest of this file's pure logic is still
 * covered only indirectly via useDamageCalc.test.ts (see TODO.md's
 * [Damage Calc Engine Test Coverage] backlog item for closing that gap).
 */

import { describe, expect, it } from 'vitest';
import { Generations } from '@smogon/calc';
import { computeSideResults, defaultPokemonState, defaultFieldState } from './damageCalcEngine';

const gen = Generations.get(9);
const field = defaultFieldState();

describe('computeSideResults - Champions ability damage effects', () => {
  it("scales Unseen Fist's through-Protect damage to 25%, not @smogon/calc's un-nerfed 100%", () => {
    const attacker = { ...defaultPokemonState(), species: 'Conkeldurr', ability: 'Unseen Fist' };
    attacker.moves[0] = { name: 'Close Combat', isCrit: false };
    const defender = { ...defaultPokemonState(), species: 'Registeel' };
    const defenderSide = { ...field.pokemon2Side, isProtected: true };

    const [entry] = computeSideResults(
      gen, attacker, defender, field.pokemon1Side, defenderSide,
      field.gameType, field.weather, field.terrain
    );

    // Unscaled mainline range for this matchup is [128, 152] (@smogon/calc's
    // own bundled Unseen Fist-through-Protect logic, confirmed live) - 25%
    // of that, floored per-element, is [32, 38].
    expect(entry.range).toEqual([32, 38]);
    expect(entry.possibleDamages).toEqual([32, 33, 34, 35, 36, 37, 38]);
    expect(entry.percent).toBe('20.6 - 24.5%');
    expect(entry.desc).toBe(
      "Conkeldurr's Close Combat hits through Registeel's Protect for 25% damage (Unseen Fist)"
    );
    expect(entry.kochanceText).toBe(null);
    expect(entry.errorMessage).toBe(null);
  });

  it('does not apply the through-Protect multiplier when the defender is not actually protected', () => {
    const attacker = { ...defaultPokemonState(), species: 'Conkeldurr', ability: 'Unseen Fist' };
    attacker.moves[0] = { name: 'Close Combat', isCrit: false };
    const defender = { ...defaultPokemonState(), species: 'Registeel' };

    const [entry] = computeSideResults(
      gen, attacker, defender, field.pokemon1Side, field.pokemon2Side,
      field.gameType, field.weather, field.terrain
    );

    expect(entry.range).toEqual([128, 152]);
    expect(entry.desc).not.toContain('Unseen Fist');
  });

  it("halves damage a contact move deals to a Aura Guard defender", () => {
    const attacker = { ...defaultPokemonState(), species: 'Lucario' };
    attacker.moves[0] = { name: 'Close Combat', isCrit: false };
    const defender = { ...defaultPokemonState(), species: 'Registeel', ability: 'Aura Guard' };

    const [entry] = computeSideResults(
      gen, attacker, defender, field.pokemon1Side, field.pokemon2Side,
      field.gameType, field.weather, field.terrain
    );

    // Unscaled range for this matchup is [104, 126] (@smogon/calc has no
    // idea Aura Guard exists, so it never reduces this on its own) - halved
    // and floored per-element is [52, 63].
    expect(entry.range).toEqual([52, 63]);
    expect(entry.possibleDamages).toEqual([52, 54, 55, 57, 58, 60, 61, 63]);
    expect(entry.percent).toBe('33.5 - 40.6%');
    expect(entry.desc).toBe("Registeel's Aura Guard reduces the damage from Close Combat to 50%");
    expect(entry.kochanceText).toBe(null);
    expect(entry.errorMessage).toBe(null);
  });

  it('does not apply the contact-damage-taken multiplier for a non-contact move', () => {
    const attacker = { ...defaultPokemonState(), species: 'Lucario' };
    attacker.moves[0] = { name: 'Aura Sphere', isCrit: false };
    const defender = { ...defaultPokemonState(), species: 'Registeel', ability: 'Aura Guard' };

    const [entry] = computeSideResults(
      gen, attacker, defender, field.pokemon1Side, field.pokemon2Side,
      field.gameType, field.weather, field.terrain
    );

    expect(entry.desc).not.toContain('Aura Guard');
  });
});
