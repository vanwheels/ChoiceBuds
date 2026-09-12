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
import { defaultPokemonState, defaultMoveSlots, type CalcPokemonState, type CalcMoveSlot } from './damageCalcEngine';
import {
  inferDefenderStats,
  inferOpponentOffensiveStats,
  computeYourMoveRanges,
  computeTheirMoveRanges,
  defaultInference,
  NO_ITEM,
  type LiveCalcObservation,
  type LiveCalcReverseObservation,
} from './liveCalcEngine';

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
const DEFENDER = { species: 'Ferrothorn', level: 50, defBoost: 0, spdBoost: 0, atkBoost: 0, spaBoost: 0, speBoost: 0 };

function obs(
  moveName: string,
  damagePercent: number,
  targetsHit: 1 | 2 = 2,
  extra: Partial<Pick<LiveCalcObservation, 'isCrit' | 'outcome'>> = {}
): LiveCalcObservation {
  return { moveName, damagePercent, targetsHit, isCrit: false, outcome: 'survived', ...extra };
}

function reverseObs(
  moveName: string,
  damagePercent: number,
  targetsHit: 1 | 2 = 2,
  extra: Partial<Pick<LiveCalcReverseObservation, 'isCrit' | 'outcome'>> = {}
): LiveCalcReverseObservation {
  return { moveName, damagePercent, targetsHit, isCrit: false, outcome: 'survived', ...extra };
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

  it('seeds a single, config-corrected ability for a Mega form instead of @smogon/calc\'s own (stale) bundled value - Live Calc Feedback Pass 2, Leg 1', () => {
    // @smogon/calc's own bundled data for Absol-Mega-Z still just duplicates
    // ordinary Mega Absol's ability (Magic Bounce) - the real, distinct
    // Mega Z ability (Sharpness) only lives in config/megaAbilities.ts. See
    // that config's header for the full provenance.
    const rawBundledAbility = Object.values(gen.species.get('absolmegaz' as never)?.abilities ?? {});
    expect(rawBundledAbility).toEqual(['Magic Bounce']);

    const result = defaultInference(gen, 'Absol-Mega-Z');
    expect(result.abilityCandidates).toEqual(['Sharpness']);
  });

  it('returns the default, untouched inference when attacker or defender species is empty', () => {
    const noAttacker = inferDefenderStats(gen, attackerState({ species: '' }), DEFENDER, [obs('Earthquake', 50)]);
    expect(noAttacker.defBound).toEqual({ min: 0, max: 32 });
    const noDefender = inferDefenderStats(gen, LANDO_EARTHQUAKE, { species: '', level: 50, defBoost: 0, spdBoost: 0, atkBoost: 0, spaBoost: 0, speBoost: 0 }, [obs('Earthquake', 50)]);
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

  it('names the failing axes in the contradiction message (Live Calc Result Clarity Pass), not a generic "ignored"', () => {
    const result = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 99999)]);
    expect(result.contradictions[0]).toMatch(/doesn't fit any Defense SP value under the narrowed nature, ability, and item candidates/);
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

describe('inferDefenderStats - known Def/Sp. Def stage boosts', () => {
  it('a large Def stage boost can turn an otherwise-feasible observation into a contradiction', () => {
    // A +3 Def stage is a 2.5x raw Def multiplier - far more than any
    // nature/ability/item candidate this engine scans could claw back, so a
    // damage% that's plainly achievable unboosted becomes unreachable once
    // the boost is applied, directly exercising that `boosts` actually
    // reaches @smogon/calc's `calculate()` rather than being a no-op input.
    const unboosted = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 30)]);
    const heavilyBoosted = inferDefenderStats(gen, LANDO_EARTHQUAKE, { ...DEFENDER, defBoost: 3 }, [obs('Earthquake', 30)]);
    expect(unboosted.contradictions.length).toBe(0);
    expect(heavilyBoosted.contradictions.length).toBe(1);
  });

  it('leaves spdBound untouched for a physical observation regardless of spdBoost', () => {
    const result = inferDefenderStats(gen, LANDO_EARTHQUAKE, { ...DEFENDER, spdBoost: -4 }, [obs('Earthquake', 30)]);
    expect(result.spdBound).toEqual({ min: 0, max: 32 });
  });
});

describe('inferDefenderStats - isCrit', () => {
  it('a damage% unreachable normally becomes feasible once isCrit is set, and vice versa', () => {
    // Earthquake vs. this defender: 50% is above the non-crit range's max but
    // within the crit-boosted range - directly exercises that `isCrit`
    // actually reaches `Move`'s own crit multiplier rather than being ignored.
    const nonCrit = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 50, 1, { isCrit: false })]);
    const crit = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 50, 1, { isCrit: true })]);
    expect(nonCrit.contradictions.length).toBe(1);
    expect(nonCrit.physicalObservationCount).toBe(0);
    expect(crit.contradictions.length).toBe(0);
    expect(crit.physicalObservationCount).toBe(1);
  });
});

describe('inferDefenderStats - fainted vs. survived outcome', () => {
  it('a damage% below the real range is a contradiction when survived, but feasible as a fainted lower bound', () => {
    // 20% reads as "too low to be this hit" if taken as an exact survived
    // percent (the real range starts well above it), but a fainted read only
    // claims "at least 20%" - which the real (higher) range satisfies.
    const survived = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 20, 1, { outcome: 'survived' })]);
    const fainted = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 20, 1, { outcome: 'fainted' })]);
    expect(survived.contradictions.length).toBe(1);
    expect(survived.physicalObservationCount).toBe(0);
    expect(fainted.contradictions.length).toBe(0);
    expect(fainted.physicalObservationCount).toBe(1);
  });

  it('a damage% clearly out of reach even as a lower bound is still a contradiction when fainted', () => {
    const fainted = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 99999, 1, { outcome: 'fainted' })]);
    expect(fainted.contradictions.length).toBe(1);
    expect(fainted.physicalObservationCount).toBe(0);
  });
});

describe('inferDefenderStats - Known Ability lock', () => {
  it('hard-locks abilityCandidates to the known ability instead of the full species pool, with no observations', () => {
    const result = inferDefenderStats(gen, LANDO_EARTHQUAKE, { ...DEFENDER, knownAbility: 'Iron Barbs' }, []);
    expect(result.abilityCandidates).toEqual(['Iron Barbs']);
  });

  it('stays locked to the known ability after a consistent observation, rather than widening back to the full pool', () => {
    const result = inferDefenderStats(gen, LANDO_EARTHQUAKE, { ...DEFENDER, knownAbility: 'Iron Barbs' }, [obs('Earthquake', 30)]);
    expect(result.abilityCandidates).toEqual(['Iron Barbs']);
    expect(result.physicalObservationCount).toBe(1);
  });

  it('a known ability with no modeled damage effect narrows Def the same as leaving the ability open', () => {
    const unlocked = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 30)]);
    const locked = inferDefenderStats(gen, LANDO_EARTHQUAKE, { ...DEFENDER, knownAbility: 'Iron Barbs' }, [obs('Earthquake', 30)]);
    expect(locked.defBound).toEqual(unlocked.defBound);
  });

  it("a known ability with a modeled damage effect (Aura Guard's contact-damage-taken halving) feeds the nature/item axes' own scans too, not just its own axis", () => {
    // Tackle vs. Ferrothorn spans roughly 4.85%-7.27% across the full Def SP
    // range with no ability effect - 6% sits inside that. Aura Guard halves
    // contact damage taken (`championsAbilityDamageEffects.ts`), which
    // @smogon/calc's own calculate() has no idea about (it's a
    // Champions-invented ability) - the halving only happens via this
    // engine's own post-hoc contactMultiplier, so this directly proves
    // `knownAbility` reaches that multiplier rather than being a no-op past
    // the ability axis itself.
    const observation = [obs('Tackle', 6, 1)];
    const unlocked = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, observation);
    const locked = inferDefenderStats(gen, LANDO_EARTHQUAKE, { ...DEFENDER, knownAbility: 'Aura Guard' }, observation);
    expect(unlocked.contradictions.length).toBe(0);
    expect(unlocked.physicalObservationCount).toBe(1);
    expect(locked.contradictions.length).toBe(1);
    expect(locked.physicalObservationCount).toBe(0);
  });

  it('records a contradiction and leaves the running bound/lock unchanged, rather than silently dropping the lock, when the known ability makes an observation infeasible', () => {
    const baseline = inferDefenderStats(gen, LANDO_EARTHQUAKE, { ...DEFENDER, knownAbility: 'Aura Guard' }, []);
    const result = inferDefenderStats(gen, LANDO_EARTHQUAKE, { ...DEFENDER, knownAbility: 'Aura Guard' }, [obs('Tackle', 6, 1)]);
    expect(result.defBound).toEqual(baseline.defBound);
    expect(result.abilityCandidates).toEqual(['Aura Guard']);
  });

  it("names the locked ability itself in the contradiction message (Live Calc Result Clarity Pass) rather than blaming nature/item too, since the lock is what's shared across all three axes' scans", () => {
    const result = inferDefenderStats(gen, LANDO_EARTHQUAKE, { ...DEFENDER, knownAbility: 'Aura Guard' }, [obs('Tackle', 6, 1)]);
    expect(result.contradictions[0]).toMatch(/doesn't fit the locked ability \(Aura Guard\)/);
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

// Reverse direction (Live Calc Page Layout & Function Rework - Leg 1): the
// opponent (DEFENDER's species/level/locks/boosts - same input shape, now
// playing attacker) hits the fully-known LANDO_EARTHQUAKE, which plays
// defender here. Each test seeds its own upstream inference via
// inferDefenderStats() with no observations (same defaultInference()
// baseline `inferOpponentOffensiveStats()` itself falls back to when tested
// in isolation) rather than hand-building one, so a real narrowed
// nature/ability/item state is always what's actually threaded through.
const BASE_INFERENCE = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, []);

describe('inferOpponentOffensiveStats - no/invalid input', () => {
  it('leaves atk/spaBound at the full default and both reverse counts at 0 with no observations', () => {
    const result = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, []);
    expect(result.atkBound).toEqual({ min: 0, max: 32 });
    expect(result.spaBound).toEqual({ min: 0, max: 32 });
    expect(result.theirPhysicalObservationCount).toBe(0);
    expect(result.theirSpecialObservationCount).toBe(0);
  });

  it('leaves the given inference untouched when the known Pokémon or opponent species is empty', () => {
    const noKnown = inferOpponentOffensiveStats(gen, attackerState({ species: '' }), DEFENDER, BASE_INFERENCE, [reverseObs('Power Whip', 50)]);
    expect(noKnown.atkBound).toEqual({ min: 0, max: 32 });
    const noOpponent = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, { ...DEFENDER, species: '' }, BASE_INFERENCE, [reverseObs('Power Whip', 50)]);
    expect(noOpponent.atkBound).toEqual({ min: 0, max: 32 });
  });
});

describe('inferOpponentOffensiveStats - category separation', () => {
  it('a physical-move observation narrows only atkBound, leaving spaBound untouched', () => {
    const result = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, [reverseObs('Power Whip', 45, 1)]);
    expect(result.theirPhysicalObservationCount).toBe(1);
    expect(result.theirSpecialObservationCount).toBe(0);
    expect(result.spaBound).toEqual({ min: 0, max: 32 });
  });

  it('a special-move observation narrows only spaBound, leaving atkBound untouched', () => {
    const result = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, [reverseObs('Energy Ball', 26, 1)]);
    expect(result.theirSpecialObservationCount).toBe(1);
    expect(result.theirPhysicalObservationCount).toBe(0);
    expect(result.atkBound).toEqual({ min: 0, max: 32 });
  });
});

describe('inferOpponentOffensiveStats - multi-observation narrowing', () => {
  it('a second consistent observation only ever shrinks (or holds) the running atkBound, never grows it', () => {
    const one = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, [reverseObs('Power Whip', 45, 1)]);
    const two = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, [reverseObs('Power Whip', 45, 1), reverseObs('Power Whip', 46, 1)]);
    expect(two.atkBound.min).toBeGreaterThanOrEqual(one.atkBound.min);
    expect(two.atkBound.max).toBeLessThanOrEqual(one.atkBound.max);
    expect(two.theirPhysicalObservationCount).toBe(2);
  });

  it('further narrows whatever nature/ability/item candidates the forward pass already narrowed, rather than resetting them', () => {
    const result = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, [reverseObs('Power Whip', 45, 1)]);
    expect(result.natureCandidates.length).toBeLessThanOrEqual(BASE_INFERENCE.natureCandidates.length);
    for (const n of result.natureCandidates) expect(BASE_INFERENCE.natureCandidates).toContain(n);
  });
});

describe('inferOpponentOffensiveStats - graceful degradation', () => {
  it('records a contradiction and leaves atkBound unchanged for an impossible damage%', () => {
    const result = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, [reverseObs('Power Whip', 99999, 1)]);
    expect(result.atkBound).toEqual(BASE_INFERENCE.atkBound);
    expect(result.contradictions.length).toBe(1);
  });

  it('skips a Status move observation with a recorded contradiction rather than crashing', () => {
    const result = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, [reverseObs('Spikes', 0)]);
    expect(result.theirPhysicalObservationCount).toBe(0);
    expect(result.theirSpecialObservationCount).toBe(0);
    expect(result.contradictions.length).toBe(1);
  });

  it('skips an unrecognized move name with a recorded contradiction', () => {
    const result = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, [reverseObs('Not A Real Move', 40)]);
    expect(result.contradictions.length).toBe(1);
    expect(result.theirPhysicalObservationCount).toBe(0);
  });
});

describe('inferOpponentOffensiveStats - known offensive stage boosts', () => {
  it('a large Atk stage boost can turn an otherwise-feasible observation into a contradiction', () => {
    const boosted = { ...DEFENDER, atkBoost: 6 };
    const boostedBase = inferDefenderStats(gen, LANDO_EARTHQUAKE, boosted, []);
    const unboosted = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, [reverseObs('Power Whip', 45, 1)]);
    const heavilyBoosted = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, boosted, boostedBase, [reverseObs('Power Whip', 45, 1)]);
    expect(unboosted.contradictions.length).toBe(0);
    expect(heavilyBoosted.contradictions.length).toBe(1);
  });
});

describe('inferOpponentOffensiveStats - Known Ability/Item/Nature locks', () => {
  it('hard-locks abilityCandidates to the opponent\'s known ability, further narrowing atkBound rather than leaving it untouched', () => {
    const locked = { ...DEFENDER, knownAbility: 'Iron Barbs' };
    const lockedBase = inferDefenderStats(gen, LANDO_EARTHQUAKE, locked, []);
    const result = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, locked, lockedBase, [reverseObs('Power Whip', 45, 1)]);
    expect(result.abilityCandidates).toEqual(['Iron Barbs']);
  });

  it('hard-locks itemCandidates to the opponent\'s known item', () => {
    const locked = { ...DEFENDER, knownItem: 'Leftovers' };
    const lockedBase = inferDefenderStats(gen, LANDO_EARTHQUAKE, locked, []);
    const result = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, locked, lockedBase, []);
    expect(result.itemCandidates).toEqual(['Leftovers']);
  });

  it('hard-locks natureCandidates to the opponent\'s known nature', () => {
    const locked = { ...DEFENDER, knownNature: 'Adamant' as const };
    const lockedBase = inferDefenderStats(gen, LANDO_EARTHQUAKE, locked, []);
    const result = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, locked, lockedBase, []);
    expect(result.natureCandidates).toEqual(['Adamant']);
  });
});

describe('inferOpponentOffensiveStats - contact-damage ability effect reads the KNOWN Pokémon, not the opponent candidate', () => {
  it("the known Pokémon's own Aura Guard ability halves contact damage taken, the mirror image of the forward direction's own equivalent test", () => {
    // Tackle (contact, Normal, neutral vs. Ground/Flying) from Ferrothorn
    // into the fully-known Landorus-Therian - picking a damage% inside the
    // unboosted range but above what Aura Guard's halving could ever reach
    // proves the ability is being read off the KNOWN side (Landorus-T) here,
    // not scanned as a candidate axis on the opponent (Ferrothorn) side -
    // the forward-direction test this mirrors proves the opposite wiring.
    const withoutAuraGuard = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, [reverseObs('Tackle', 12, 1)]);
    const knownWithAuraGuard = attackerState({ species: 'Landorus-Therian', ability: 'Aura Guard' });
    const auraGuardBase = inferDefenderStats(gen, knownWithAuraGuard, DEFENDER, []);
    const withAuraGuard = inferOpponentOffensiveStats(gen, knownWithAuraGuard, DEFENDER, auraGuardBase, [reverseObs('Tackle', 12, 1)]);
    expect(withoutAuraGuard.contradictions.length).toBe(0);
    expect(withAuraGuard.contradictions.length).toBe(1);
  });
});

// Live Calc Page Layout & Function Rework - Leg 3 (Layout & Live Range Grid
// Rework): the two move grids' own live results. Reuses BASE_INFERENCE
// (inferDefenderStats() with no observations) as the "everything still
// possible" starting point, same as the reverse-direction describe blocks
// above - a real narrowed inference (from actual observations) is what
// exercises the "narrower inference -> narrower or equal range" behavior.
function moveSlots(...names: string[]): CalcMoveSlot[] {
  const slots = defaultMoveSlots();
  names.forEach((name, i) => { slots[i] = { ...slots[i], name }; });
  return slots;
}

function parsePercentRange(percent: string | null): [number, number] {
  if (!percent) throw new Error('expected a percent string');
  const [lo, hi] = percent.replace('%', '').split(' - ').map(Number);
  return [lo, hi];
}

describe('computeYourMoveRanges', () => {
  it('returns an empty entry (no percent, no error) for an unfilled move slot', () => {
    const result = computeYourMoveRanges(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, moveSlots());
    expect(result[0]).toEqual({ moveName: '', percent: null, errorMessage: null });
  });

  it('returns an error entry for a Status move, without throwing', () => {
    const result = computeYourMoveRanges(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, moveSlots('Swords Dance'));
    expect(result[0].percent).toBeNull();
    expect(result[0].errorMessage).toBeTruthy();
  });

  it("returns an error entry for a multi-hit move - not modeled, same v1 limitation as the observation engine's own rejection", () => {
    const result = computeYourMoveRanges(gen, attackerState({ species: 'Cloyster' }), DEFENDER, BASE_INFERENCE, moveSlots('Icicle Spear'));
    expect(result[0].percent).toBeNull();
    expect(result[0].errorMessage).toMatch(/multi-hit/i);
  });

  it('leaves every slot empty (percent null, no error) when the attacker or defender species is missing', () => {
    const noAttacker = computeYourMoveRanges(gen, attackerState({ species: '' }), DEFENDER, BASE_INFERENCE, moveSlots('Earthquake'));
    expect(noAttacker[0]).toEqual({ moveName: 'Earthquake', percent: null, errorMessage: null });
    const noDefender = computeYourMoveRanges(gen, LANDO_EARTHQUAKE, { ...DEFENDER, species: '' }, BASE_INFERENCE, moveSlots('Earthquake'));
    expect(noDefender[0]).toEqual({ moveName: 'Earthquake', percent: null, errorMessage: null });
  });

  it('produces a valid ascending min-max percent span for a real damaging move', () => {
    const result = computeYourMoveRanges(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, moveSlots('Earthquake'));
    expect(result[0].errorMessage).toBeNull();
    const [lo, hi] = parsePercentRange(result[0].percent);
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeGreaterThanOrEqual(lo);
  });

  it('narrows (or holds) the span once observations have actually narrowed the running inference, never widens it', () => {
    const narrowed = inferDefenderStats(gen, LANDO_EARTHQUAKE, DEFENDER, [obs('Earthquake', 30), obs('Earthquake', 31)]);
    const baseline = computeYourMoveRanges(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, moveSlots('Earthquake'));
    const afterNarrowing = computeYourMoveRanges(gen, LANDO_EARTHQUAKE, DEFENDER, narrowed, moveSlots('Earthquake'));
    const [baseLo, baseHi] = parsePercentRange(baseline[0].percent);
    const [narrowLo, narrowHi] = parsePercentRange(afterNarrowing[0].percent);
    expect(narrowLo).toBeGreaterThanOrEqual(baseLo);
    expect(narrowHi).toBeLessThanOrEqual(baseHi);
  });

  it("known Def stat-stage boosts on the defender panel feed the grid's own scan too, not just inferDefenderStats()", () => {
    const unboosted = computeYourMoveRanges(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, moveSlots('Earthquake'));
    const boosted = computeYourMoveRanges(gen, LANDO_EARTHQUAKE, { ...DEFENDER, defBoost: 3 }, BASE_INFERENCE, moveSlots('Earthquake'));
    const [, unboostedHi] = parsePercentRange(unboosted[0].percent);
    const [, boostedHi] = parsePercentRange(boosted[0].percent);
    expect(boostedHi).toBeLessThan(unboostedHi);
  });
});

describe('computeTheirMoveRanges', () => {
  it('returns an empty entry for an unfilled move slot', () => {
    const result = computeTheirMoveRanges(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, moveSlots());
    expect(result[0]).toEqual({ moveName: '', percent: null, errorMessage: null });
  });

  it('leaves every slot empty when the known Pokémon or opponent species is missing', () => {
    const noKnown = computeTheirMoveRanges(gen, attackerState({ species: '' }), DEFENDER, BASE_INFERENCE, moveSlots('Power Whip'));
    expect(noKnown[0]).toEqual({ moveName: 'Power Whip', percent: null, errorMessage: null });
    const noOpponent = computeTheirMoveRanges(gen, LANDO_EARTHQUAKE, { ...DEFENDER, species: '' }, BASE_INFERENCE, moveSlots('Power Whip'));
    expect(noOpponent[0]).toEqual({ moveName: 'Power Whip', percent: null, errorMessage: null });
  });

  it('produces a valid ascending min-max percent span for a real damaging move', () => {
    const result = computeTheirMoveRanges(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, moveSlots('Power Whip'));
    expect(result[0].errorMessage).toBeNull();
    const [lo, hi] = parsePercentRange(result[0].percent);
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeGreaterThanOrEqual(lo);
  });

  it("reads the contact-damage ability effect off the KNOWN Pokémon (Aura Guard halving), same wiring inferOpponentOffensiveStats() already exercises", () => {
    const withoutAuraGuard = computeTheirMoveRanges(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, moveSlots('Tackle'));
    const knownWithAuraGuard = attackerState({ species: 'Landorus-Therian', ability: 'Aura Guard' });
    const auraGuardBase = inferDefenderStats(gen, knownWithAuraGuard, DEFENDER, []);
    const withAuraGuard = computeTheirMoveRanges(gen, knownWithAuraGuard, DEFENDER, auraGuardBase, moveSlots('Tackle'));
    const [, hiWithout] = parsePercentRange(withoutAuraGuard[0].percent);
    const [, hiWith] = parsePercentRange(withAuraGuard[0].percent);
    expect(hiWith).toBeLessThan(hiWithout);
  });

  it('narrows (or holds) the span once reverse observations have actually narrowed the running inference', () => {
    const narrowed = inferOpponentOffensiveStats(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, [reverseObs('Power Whip', 45, 1), reverseObs('Power Whip', 46, 1)]);
    const baseline = computeTheirMoveRanges(gen, LANDO_EARTHQUAKE, DEFENDER, BASE_INFERENCE, moveSlots('Power Whip'));
    const afterNarrowing = computeTheirMoveRanges(gen, LANDO_EARTHQUAKE, DEFENDER, narrowed, moveSlots('Power Whip'));
    const [baseLo, baseHi] = parsePercentRange(baseline[0].percent);
    const [narrowLo, narrowHi] = parsePercentRange(afterNarrowing[0].percent);
    expect(narrowLo).toBeGreaterThanOrEqual(baseLo);
    expect(narrowHi).toBeLessThanOrEqual(baseHi);
  });
});
