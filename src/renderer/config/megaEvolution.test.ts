/**
 * Test suite for megaEvolution.ts's Mega Stone -> species mapping and the
 * Floette exception in particular (Champions Data Leg 6): our own species
 * matching (getMegaApiSlug/getMegaFormsForSpecies) needs "floette-eternal" -
 * the real legal Floette per utils/pokemonRules.ts - but @smogon/calc's own
 * bundled species dex still attaches its Mega form to base "Floette", so
 * CURATED_MEGA_FORM_SLUGS (consumed by utils/calcFormes.ts) needs
 * "floette-mega" instead. See megaEvolution.ts's own comment for the full
 * rationale.
 */

import { describe, expect, it } from 'vitest';
import { CURATED_MEGA_FORM_SLUGS, getMegaApiSlug, getMegaFormsForSpecies } from './megaEvolution';

describe('Floette Mega Evolution exception', () => {
  it('resolves the held-item match against floette-eternal, not bare floette', () => {
    expect(getMegaApiSlug('Floettite', 'Floette-Eternal')).toBe('floette-eternal-mega');
    expect(getMegaApiSlug('Floettite', 'Floette')).toBeNull();
  });

  it('lists floettite under floette-eternal for getMegaFormsForSpecies', () => {
    expect(getMegaFormsForSpecies('floette-eternal')).toEqual([{ item: 'floettite', suffix: 'mega' }]);
    expect(getMegaFormsForSpecies('floette')).toEqual([]);
  });

  it("uses @smogon/calc's own naming (floette-mega) in the curated slug set, not the mechanically-derived floette-eternal-mega", () => {
    expect(CURATED_MEGA_FORM_SLUGS.has('floette-mega')).toBe(true);
    expect(CURATED_MEGA_FORM_SLUGS.has('floette-eternal-mega')).toBe(false);
  });
});
