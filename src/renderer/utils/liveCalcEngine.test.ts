/**
 * Test suite for the pure Live Calc inference engine, exercised directly
 * against a real Gen 9 data object (same `Generations.get(9)` call the
 * damage-calc engine's own tests use - see damageCalcEngine.test.ts's
 * header for why no mocking is needed here). Mostly asserts structural
 * properties (bounds stay within 0-32, narrowing only ever shrinks/keeps a
 * bound rather than growing it, physical/special stay independent, graceful
 * degradation on bad input) rather than hardcoded SP numbers, since the
 * exact values are a byproduct of `@smogon/calc`'s own floor/round-heavy
 * damage math and would make the suite brittle to library data updates.
 */

import { describe, expect, it } from 'vitest';
import { Generations } from '@smogon/calc';
import { defaultPokemonState, type CalcPokemonState } from './damageCalcEngine';
import { inferDefenderStats, NO_ITEM, type LiveCalcObservation } from './liveCalcEngine';

const gen = Generations.get(9);

function attackerState(overrides: Partial<CalcPokemonState> = {}): CalcPokemonState {
  return { ...defaultPokemonState(), level: 50, ...overrides };
}

const LANDO_EARTHQUAKE = attackerState({ species: 'Landorus-Therian' });
const GENGAR_SHADOW_BALL = attackerState({ species: 'Gengar' });
// Ferrothorn (Grass/Steel): Ground is neutral (resists Steel 0.5x, weak to
// nothing relevant here x2), Ghost is neutral too - deliberately not a type
// immune to either test move (Skarmory, tried first, is Flying-typed and
// flat-out immune to Ground - a reminder any defender fixture needs an
// actual damage-relevant matchup, not just "a bulky wall").
const DEFENDER = { species: 'Ferrothorn', level: 50 };

function obs(moveName: string, damagePercent: number, targetsHit: 1 | 2 = 2): LiveCalcObservation {
  return { moveName, damagePercent, targetsHit };
}

describe('inferDefenderStats - no/invalid input', () => {
  it('returns the full unconstrained default when there are no observations', () => {
    const result = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, []);
    expect(result.defBound).toEqual({ min: 0, max: 32 });
    expect(result.spdBound).toEqual({ min: 0, max: 32 });
    expect(result.physicalObservationCount).toBe(0);
    expect(result.specialObservationCount).toBe(0);
    expect(result.contradictions).toEqual([]);
    expect(result.natureCandidates.length).toBe(25);
    expect(result.itemCandidates).toContain(NO_ITEM);
    expect(result.itemCandidates.length).toBeGreaterThan(1);
  });

  it("seeds ability candidates from the defender species' own real ability pool", () => {
    const result = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, []);
    const realAbilities = Object.values(gen.species.get('ferrothorn' as never)?.abilities ?? {});
    expect(result.abilityCandidates.sort()).toEqual([...new Set(realAbilities)].sort());
  });

  it('returns the default, untouched inference when attacker or defender species is empty', () => {
    const noAttacker = inferDefenderStats(gen, attackerState({ species: '' }), DEFENDER, [obs('Earthquake', 50)]);
    expect(noAttacker.defBound).toEqual({ min: 0, max: 32 });
    const noDefender = inferDefenderStats(gen, LANDO_EARTHQUAKE, { species: '', level: 50 }, [obs('Earthquake', 50)]);
    expect(noDefender.defBound).toEqual({ min: 0, max: 32 });
  });
});

describe('inferDefenderStats - category separation', () => {
  it('a physical-move observation narrows only defBound, leaving spdBound untouched', () => {
    const result = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 30)]);
    expect(result.physicalObservationCount).toBe(1);
    expect(result.specialObservationCount).toBe(0);
    expect(result.spdBound).toEqual({ min: 0, max: 32 });
    expect(result.defBound.min).toBeGreaterThanOrEqual(0);
    expect(result.defBound.max).toBeLessThanOrEqual(32);
    // A single mid-range hit is compatible with most defensive-item/ability/
    // nature candidates, so the SP bound itself can stay the full [0,32]
    // span at this stage (see the multi-observation tests below for actual
    // shrinking) - the count and cross-axis independence are what this test
    // is really checking.
  });

  it('a special-move observation narrows only spdBound, leaving defBound untouched', () => {
    const result = inferDefenderStats(gen, GENGAR_SHADOW_BALL, DEFENDER, [obs('Shadow Ball', 32)]);
    expect(result.physicalObservationCount).toBe(0);
    expect(result.specialObservationCount).toBe(1);
    expect(result.defBound).toEqual({ min: 0, max: 32 });
  });
});

describe('inferDefenderStats - multi-observation narrowing', () => {
  it('a second consistent observation only ever shrinks (or holds) the running bound, never grows it', () => {
    const one = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 30)]);
    const two = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 30), obs('Earthquake', 31)]);
    expect(two.defBound.min).toBeGreaterThanOrEqual(one.defBound.min);
    expect(two.defBound.max).toBeLessThanOrEqual(one.defBound.max);
    expect(two.physicalObservationCount).toBe(2);
  });

  it('candidate lists only ever shrink (or hold) as observations accumulate', () => {
    const one = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 30)]);
    const two = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 30), obs('Earthquake', 31)]);
    expect(two.natureCandidates.length).toBeLessThanOrEqual(one.natureCandidates.length);
    expect(two.itemCandidates.length).toBeLessThanOrEqual(one.itemCandidates.length);
    for (const n of two.natureCandidates) expect(one.natureCandidates).toContain(n);
  });
});

describe('inferDefenderStats - graceful degradation', () => {
  it('records a contradiction and leaves the bound unchanged for an impossible damage%', () => {
    const baseline = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 30)]);
    const withImpossible = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 30), obs('Earthquake', 99999)]);
    expect(withImpossible.defBound).toEqual(baseline.defBound);
    expect(withImpossible.contradictions.length).toBe(1);
  });

  it('skips a Status move observation with a recorded contradiction rather than crashing', () => {
    const result = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Swords Dance', 0)]);
    expect(result.physicalObservationCount).toBe(0);
    expect(result.specialObservationCount).toBe(0);
    expect(result.contradictions.length).toBe(1);
  });

  it('skips a multi-hit move observation with a recorded contradiction rather than modeling it', () => {
    const result = inferDefenderStats(gen, attackerState({ species: 'Cloyster' }), DEFENDER, [obs('Icicle Spear', 40)]);
    expect(result.physicalObservationCount).toBe(0);
    expect(result.contradictions.length).toBe(1);
  });

  it('skips an unrecognized move name with a recorded contradiction', () => {
    const result = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Not A Real Move', 40)]);
    expect(result.contradictions.length).toBe(1);
    expect(result.physicalObservationCount).toBe(0);
  });
});

describe('inferDefenderStats - Doubles spread-modifier targetsHit handling', () => {
  it('a spread move only actually hitting one target is scanned without the Doubles 0.75x reduction', () => {
    // Earthquake (target: allAdjacent) auto-applies @smogon/calc's 0.75x
    // Doubles spread reduction unless targetsHit===1 switches the scan to a
    // Singles field. 40% is above what Earthquake vs. this defender can ever
    // reach WITH the 0.75x reduction applied (targetsHit: 2) but within its
    // real, unreduced range (targetsHit: 1) - so the same observed percent
    // should be a contradiction under one reading and feasible under the
    // other, directly exercising the field-switch this models.
    const twoTargets = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 40, 2)]);
    expect(twoTargets.physicalObservationCount).toBe(0);
    expect(twoTargets.contradictions.length).toBe(1);

    const oneTarget = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 40, 1)]);
    expect(oneTarget.physicalObservationCount).toBe(1);
    expect(oneTarget.contradictions.length).toBe(0);
  });
});
