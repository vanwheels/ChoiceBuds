/**
 * Test suite for megaAbilities.ts. Guards two things: getMegaAbility's
 * null-safety, and that every Mega form megaEvolution.ts's
 * MEGA_STONE_TO_SPECIES knows about has a matching entry here (the
 * "Remaining Champions Mega Ability Audit" backlog item's completion
 * condition) - including the Floette exception, which is keyed
 * `floette-mega` here to match @smogon/calc's own forme name rather than
 * the mechanically-derived `floette-eternal-mega` (see megaEvolution.ts's
 * own comment on CURATED_MEGA_FORM_SLUGS for why).
 */

import { describe, expect, it } from 'vitest';
import { MEGA_STONE_TO_SPECIES } from './megaEvolution';
import { getMegaAbility, MEGA_ABILITIES } from './megaAbilities';

describe('getMegaAbility', () => {
  it('returns undefined for a null slug', () => {
    expect(getMegaAbility(null)).toBeUndefined();
  });

  it('returns undefined for an unknown slug', () => {
    expect(getMegaAbility('not-a-real-mega')).toBeUndefined();
  });

  it('resolves a known slug to its guaranteed ability', () => {
    expect(getMegaAbility('charizard-mega-y')).toBe('Drought');
  });
});

describe('MEGA_ABILITIES coverage', () => {
  it('has an entry for every Mega form in MEGA_STONE_TO_SPECIES', () => {
    const missing = Object.values(MEGA_STONE_TO_SPECIES)
      .map(({ species, suffix }) => (species === 'floette-eternal' ? 'floette' : species) + '-' + suffix)
      .filter(slug => !(slug in MEGA_ABILITIES));

    expect(missing).toEqual([]);
  });
});
