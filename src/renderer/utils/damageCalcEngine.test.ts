/**
 * Test suite for the pure damage-calc engine - the Champions Damage
 * Calculator's state factories, boost/stat-multiplier math, and the actual
 * @smogon/calc invocation, exercised directly rather than through
 * useDamageCalc.ts's React state. Generations.get(9) (same call the hook
 * makes) gives a real Gen 9 data object synchronously in a plain Vitest
 * test - no mocking needed since this module is already pure and
 * side-effect-free (see damageCalcEngine.ts's header). Private helpers
 * (buildPokemon, boostMultiplier, weatherSpeedMultiplier, etc.) are covered
 * indirectly through the exported entry points below rather than exported
 * just for testing.
 */

import { describe, expect, it } from 'vitest';
import { Generations } from '@smogon/calc';
import {
  normalizeMoveSlug,
  getNatureStatEffect,
  defaultPokemonState,
  defaultFieldState,
  computeBoostedStats,
  computeEffectiveSpeed,
  computeSideResults,
  type CalcPokemonState,
  type CalcMoveSlot,
} from './damageCalcEngine';

const gen = Generations.get(9);
const field = defaultFieldState();
const ZERO_STATS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

function pokemonState(overrides: Partial<CalcPokemonState> = {}): CalcPokemonState {
  return { ...defaultPokemonState(), ...overrides };
}

function pokemonWithMove(species: string, moveName: string, moveOverrides: Partial<CalcMoveSlot> = {}): CalcPokemonState {
  return pokemonState({
    species,
    moves: [{ name: moveName, isCrit: false, ...moveOverrides }, { name: '', isCrit: false }, { name: '', isCrit: false }, { name: '', isCrit: false }],
  });
}

describe('normalizeMoveSlug', () => {
  it('lowercases and hyphenates punctuation/whitespace, trimming leading/trailing dashes', () => {
    expect(normalizeMoveSlug('Flare Blitz')).toBe('flare-blitz');
    expect(normalizeMoveSlug("King's Shield")).toBe('king-s-shield');
    expect(normalizeMoveSlug('-Flare Blitz-')).toBe('flare-blitz');
    expect(normalizeMoveSlug('U-turn')).toBe('u-turn');
  });
});

describe('getNatureStatEffect', () => {
  it('returns the real plus/minus for a boosting nature', () => {
    expect(getNatureStatEffect(gen, 'Timid')).toEqual({ plus: 'spe', minus: 'atk' });
  });

  it('returns empty for a genuinely neutral nature (plus===minus filtered out)', () => {
    expect(getNatureStatEffect(gen, 'Hardy')).toEqual({});
  });
});

describe('computeBoostedStats / computeEffectiveSpeed', () => {
  it('returns null when no species is set', () => {
    const state = pokemonState();
    expect(computeBoostedStats(gen, state, '')).toBe(null);
    expect(computeEffectiveSpeed(gen, state, '')).toBe(null);
  });

  it('computes base+SPs+nature with no boosts/weather/status applied', () => {
    const state = pokemonState({ species: 'Gengar' });
    expect(computeBoostedStats(gen, state, '')?.spe).toBe(130);
    expect(computeEffectiveSpeed(gen, state, '')).toBe(130);
  });

  it('applies a stat-stage boost multiplier, floored', () => {
    const boostedUp = pokemonState({ species: 'Gengar', boosts: { ...ZERO_STATS, atk: 2 } });
    const boostedDown = pokemonState({ species: 'Gengar', boosts: { ...ZERO_STATS, atk: -2 } });
    expect(computeBoostedStats(gen, boostedUp, '')?.atk).toBe(170); // floor(85 * 2)
    expect(computeBoostedStats(gen, boostedDown, '')?.atk).toBe(42); // floor(85 * 0.5)
  });

  it('doubles Speed for a weather-boosting ability that matches the active weather, not otherwise', () => {
    const state = pokemonState({ species: 'Gengar', ability: 'Swift Swim' });
    expect(computeEffectiveSpeed(gen, state, 'Rain')).toBe(260); // floor(130 * 2)
    expect(computeEffectiveSpeed(gen, state, 'Sun')).toBe(130);
  });

  it('halves Speed for paralysis, applied after any weather boost', () => {
    const paralyzed = pokemonState({ species: 'Gengar', status: 'par' });
    expect(computeEffectiveSpeed(gen, paralyzed, '')).toBe(65); // floor(130 / 2)

    const paralyzedAndBoosted = pokemonState({ species: 'Gengar', status: 'par', ability: 'Swift Swim' });
    expect(computeEffectiveSpeed(gen, paralyzedAndBoosted, 'Rain')).toBe(130); // floor(floor(130 * 2) / 2)
  });
});

describe('computeSideResults', () => {
  const noSide = field.pokemon1Side;

  it('computes a real damage result for a normal move', () => {
    const attacker = pokemonWithMove('Gengar', 'Shadow Ball');
    const defender = pokemonState({ species: 'Garchomp' });

    const [entry] = computeSideResults(gen, attacker, defender, noSide, noSide, 'Doubles', '', '');

    expect(entry.errorMessage).toBe(null);
    expect(entry.range).toEqual([66, 78]);
    expect(entry.percent).toBe('36.1 - 42.6%');
    expect(entry.kochanceText).toBe('guaranteed 3HKO');
    expect(entry.possibleDamages).toEqual([66, 67, 69, 70, 72, 73, 75, 76, 78]);
    expect(entry.multihitRange).toBe(null);
  });

  it('produces a clean blocked entry (not an error) when the defender is fully immune via an ability', () => {
    const attacker = pokemonWithMove('Garchomp', 'Earthquake');
    const defender = pokemonState({ species: 'Rotom-Wash', ability: 'Levitate' });

    const [entry] = computeSideResults(gen, attacker, defender, noSide, noSide, 'Doubles', '', '');

    expect(entry.errorMessage).toBe(null);
    expect(entry.range).toEqual([0, 0]);
    expect(entry.percent).toBe('0.0 - 0.0%');
    expect(entry.desc).toContain('Levitate');
    expect(entry.possibleDamages).toEqual([0]);
    expect(entry.kochanceText).toBe(null);
  });

  it("exposes a multi-hit move's selectable hit-count range and flattens per-hit damage", () => {
    const defender = pokemonState({ species: 'Garchomp' });

    const [entry] = computeSideResults(
      gen, pokemonWithMove('Gengar', 'Bullet Seed'), defender, noSide, noSide, 'Doubles', '', ''
    );
    expect(entry.multihitRange).toEqual([2, 5]);
    expect(entry.effectiveHits).toBeGreaterThanOrEqual(2);
    expect(entry.effectiveHits).toBeLessThanOrEqual(5);
    expect(entry.possibleDamages.length).toBeGreaterThan(0);

    const [explicitHits] = computeSideResults(
      gen, pokemonWithMove('Gengar', 'Bullet Seed', { hits: 3 }), defender, noSide, noSide, 'Doubles', '', ''
    );
    expect(explicitHits.effectiveHits).toBe(3);
  });
});

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
