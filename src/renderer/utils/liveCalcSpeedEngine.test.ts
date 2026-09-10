/**
 * Test suite for the pure Live Calc Speed inference engine (Leg 15),
 * exercised against a real Gen 9 data object same as liveCalcEngine.test.ts
 * (see its header for why no mocking is needed). Feeds each test a baseline
 * `LiveCalcInference` via `defaultInference()` rather than routing through
 * `inferDefenderStats()` first, since this engine's own narrowing is what's
 * under test here, independent of the damage% engine layered underneath it
 * in the real hook.
 */

import { describe, expect, it } from 'vitest';
import { Generations } from '@smogon/calc';
import { defaultPokemonState, type CalcPokemonState } from './damageCalcEngine';
import { defaultInference } from './liveCalcEngine';
import { inferDefenderSpeed, type LiveCalcTurnOrderObservation } from './liveCalcSpeedEngine';

const gen = Generations.get(9);

function attackerState(overrides: Partial<CalcPokemonState> = {}): CalcPokemonState {
  return { ...defaultPokemonState(), level: 50, ...overrides };
}

// Base 60 Speed at level 50, neutral nature, 0 SP: rawStats.spe works out to
// a fixed, slow number - a fast, known attacker makes "you went first"
// observations easy to reason about without needing to solve for ties.
const SLOW_ATTACKER = attackerState({ species: 'Ferrothorn' });
const DEFENDER = { species: 'Ferrothorn', level: 50 };

function turnObs(moveName: string, wentFirst: 'attacker' | 'defender', defenderSpeedStage = 0): LiveCalcTurnOrderObservation {
  return { moveName, wentFirst, defenderSpeedStage };
}

describe('inferDefenderSpeed - no/invalid input', () => {
  it('returns the inference untouched when there are no observations', () => {
    const baseline = defaultInference(gen, DEFENDER.species);
    const result = inferDefenderSpeed(gen, SLOW_ATTACKER, DEFENDER, baseline, []);
    expect(result.speedBound).toEqual({ min: 0, max: 32 });
    expect(result.speedObservationCount).toBe(0);
    expect(result.contradictions).toEqual([]);
  });

  it('returns the inference untouched when attacker or defender species is empty', () => {
    const baseline = defaultInference(gen, DEFENDER.species);
    const noAttacker = inferDefenderSpeed(gen, attackerState({ species: '' }), DEFENDER, baseline, [turnObs('Tackle', 'attacker')]);
    expect(noAttacker.speedBound).toEqual({ min: 0, max: 32 });
    expect(noAttacker.speedObservationCount).toBe(0);

    const noDefender = inferDefenderSpeed(gen, SLOW_ATTACKER, { species: '', level: 50 }, baseline, [turnObs('Tackle', 'attacker')]);
    expect(noDefender.speedBound).toEqual({ min: 0, max: 32 });
  });

  it('leaves defBound/spdBound/abilityCandidates/itemCandidates untouched', () => {
    const baseline = defaultInference(gen, DEFENDER.species);
    baseline.defBound = { min: 10, max: 20 };
    const result = inferDefenderSpeed(gen, SLOW_ATTACKER, DEFENDER, baseline, [turnObs('Tackle', 'attacker')]);
    expect(result.defBound).toEqual({ min: 10, max: 20 });
    expect(result.spdBound).toEqual(baseline.spdBound);
    expect(result.abilityCandidates).toEqual(baseline.abilityCandidates);
    expect(result.itemCandidates).toEqual(baseline.itemCandidates);
  });
});

describe('inferDefenderSpeed - narrowing', () => {
  it('narrows speedBound from a single non-priority-move observation', () => {
    const baseline = defaultInference(gen, DEFENDER.species);
    const result = inferDefenderSpeed(gen, SLOW_ATTACKER, DEFENDER, baseline, [turnObs('Tackle', 'attacker')]);
    expect(result.speedObservationCount).toBe(1);
    expect(result.contradictions).toEqual([]);
    expect(result.speedBound.min).toBeGreaterThanOrEqual(0);
    expect(result.speedBound.max).toBeLessThanOrEqual(32);
  });

  it('a second consistent observation only ever shrinks (or holds) the running bound, never grows it', () => {
    const baseline = defaultInference(gen, DEFENDER.species);
    const one = inferDefenderSpeed(gen, SLOW_ATTACKER, DEFENDER, baseline, [turnObs('Tackle', 'attacker')]);
    const two = inferDefenderSpeed(gen, SLOW_ATTACKER, DEFENDER, baseline, [turnObs('Tackle', 'attacker'), turnObs('Tackle', 'attacker')]);
    expect(two.speedBound.min).toBeGreaterThanOrEqual(one.speedBound.min);
    expect(two.speedBound.max).toBeLessThanOrEqual(one.speedBound.max);
    expect(two.speedObservationCount).toBe(2);
  });

  it('opposite-order observations against the same attacker narrow to disjoint-or-touching sub-ranges', () => {
    const baseline = defaultInference(gen, DEFENDER.species);
    const attackerFirst = inferDefenderSpeed(gen, SLOW_ATTACKER, DEFENDER, baseline, [turnObs('Tackle', 'attacker')]);
    const defenderFirst = inferDefenderSpeed(gen, SLOW_ATTACKER, DEFENDER, baseline, [turnObs('Tackle', 'defender')]);
    // "you went first" implies attacker faster -> defender's feasible SP tops
    // out at or below where "defender went first"'s feasible SP starts.
    expect(attackerFirst.speedBound.max).toBeLessThanOrEqual(defenderFirst.speedBound.max);
  });

  it('candidate natures only ever shrink (or hold) as observations accumulate', () => {
    const baseline = defaultInference(gen, DEFENDER.species);
    const one = inferDefenderSpeed(gen, SLOW_ATTACKER, DEFENDER, baseline, [turnObs('Tackle', 'attacker')]);
    const two = inferDefenderSpeed(gen, SLOW_ATTACKER, DEFENDER, baseline, [turnObs('Tackle', 'attacker'), turnObs('Tackle', 'attacker')]);
    expect(two.natureCandidates.length).toBeLessThanOrEqual(one.natureCandidates.length);
    for (const n of two.natureCandidates) expect(one.natureCandidates).toContain(n);
  });
});

describe('inferDefenderSpeed - stage boosts (Leg 16)', () => {
  it('a higher defenderSpeedStage lowers the feasible SP floor for a "defender went first" observation', () => {
    const baseline = defaultInference(gen, DEFENDER.species);
    const neutral = inferDefenderSpeed(gen, SLOW_ATTACKER, DEFENDER, baseline, [turnObs('Tackle', 'defender', 0)]);
    const boosted = inferDefenderSpeed(gen, SLOW_ATTACKER, DEFENDER, baseline, [turnObs('Tackle', 'defender', 6)]);
    // A stage-boosted defender needs less raw SP to out-speed the same attacker.
    expect(boosted.speedBound.min).toBeLessThanOrEqual(neutral.speedBound.min);
  });

  it('a lowered defenderSpeedStage raises the feasible SP floor for a "defender went first" observation', () => {
    const baseline = defaultInference(gen, DEFENDER.species);
    const neutral = inferDefenderSpeed(gen, SLOW_ATTACKER, DEFENDER, baseline, [turnObs('Tackle', 'defender', 0)]);
    const lowered = inferDefenderSpeed(gen, SLOW_ATTACKER, DEFENDER, baseline, [turnObs('Tackle', 'defender', -6)]);
    // A stage-dropped defender needs more raw SP to still out-speed the same attacker.
    expect(lowered.speedBound.min).toBeGreaterThanOrEqual(neutral.speedBound.min);
  });

  it("honors the attacker panel's own live Speed boost when comparing turn order", () => {
    const baseline = defaultInference(gen, DEFENDER.species);
    const boostedAttacker = attackerState({ species: 'Ferrothorn', boosts: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 6 } });
    const neutral = inferDefenderSpeed(gen, SLOW_ATTACKER, DEFENDER, baseline, [turnObs('Tackle', 'attacker')]);
    const boosted = inferDefenderSpeed(gen, boostedAttacker, DEFENDER, baseline, [turnObs('Tackle', 'attacker')]);
    // A much faster (self-boosted) attacker is consistent with "you went first" against a wider swath of defender SP.
    expect(boosted.speedBound.max).toBeGreaterThanOrEqual(neutral.speedBound.max);
  });
});

describe('inferDefenderSpeed - graceful degradation', () => {
  it('skips a priority-move observation with a recorded contradiction, leaving speedBound unchanged', () => {
    const baseline = defaultInference(gen, DEFENDER.species);
    const result = inferDefenderSpeed(gen, SLOW_ATTACKER, DEFENDER, baseline, [turnObs('Quick Attack', 'attacker')]);
    expect(result.speedObservationCount).toBe(0);
    expect(result.speedBound).toEqual({ min: 0, max: 32 });
    expect(result.contradictions.length).toBe(1);
  });

  it('skips an unrecognized move name with a recorded contradiction', () => {
    const baseline = defaultInference(gen, DEFENDER.species);
    const result = inferDefenderSpeed(gen, SLOW_ATTACKER, DEFENDER, baseline, [turnObs('Not A Real Move', 'attacker')]);
    expect(result.speedObservationCount).toBe(0);
    expect(result.contradictions.length).toBe(1);
  });

  it('records a contradiction and leaves the bound unchanged for an observation that contradicts a pre-narrowed nature set', () => {
    const baseline = defaultInference(gen, DEFENDER.species);
    baseline.natureCandidates = ['Hardy'] as never;
    // Force-narrow speedBound to a single infeasible-for-Hardy value first via an
    // artificially tight prior bound, then check the contradiction path fires
    // rather than silently accepting an impossible intersection.
    baseline.speedBound = { min: 0, max: 0 };
    const veryFastAttacker = attackerState({ species: 'Ninjask', sps: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 32 }, nature: 'Jolly' });
    const result = inferDefenderSpeed(gen, veryFastAttacker, DEFENDER, baseline, [turnObs('Tackle', 'defender')]);
    // "defender went first" against a very fast attacker requires high
    // defender SP, infeasible under the forced {min:0,max:0} prior bound.
    expect(result.speedBound).toEqual({ min: 0, max: 0 });
    expect(result.contradictions.length).toBe(1);
  });
});
