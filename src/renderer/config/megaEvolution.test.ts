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
import {
  CURATED_MEGA_FORM_SLUGS,
  formatMegaLabel,
  getMegaApiSlug,
  getMegaFormsForSpecies,
  megaFormBadgeLetter,
  resolveOpponentMegaControl,
} from './megaEvolution';

describe('Floette Mega Evolution exception', () => {
  it('resolves the held-item match against floette-eternal, not bare floette', () => {
    expect(getMegaApiSlug('Floettite', 'Floette-Eternal')).toBe('floette-eternal-mega');
    expect(getMegaApiSlug('Floettite', 'Floette')).toBeNull();
  });

  it('lists floettite under floette-eternal for getMegaFormsForSpecies', () => {
    expect(getMegaFormsForSpecies('floette-eternal')).toEqual([
      { item: 'floettite', suffix: 'mega' },
    ]);
    expect(getMegaFormsForSpecies('floette')).toEqual([]);
  });

  it("uses @smogon/calc's own naming (floette-mega) in the curated slug set, not the mechanically-derived floette-eternal-mega", () => {
    expect(CURATED_MEGA_FORM_SLUGS.has('floette-mega')).toBe(true);
    expect(CURATED_MEGA_FORM_SLUGS.has('floette-eternal-mega')).toBe(false);
  });
});

describe('formatMegaLabel (Add Pokémon Table: Mega Form Rows Leg 2)', () => {
  it('labels a single-form Mega with no suffix word', () => {
    expect(formatMegaLabel('Gengar', 'mega')).toBe('Mega Gengar');
  });

  it('labels a split X/Y form with its letter appended', () => {
    expect(formatMegaLabel('Charizard', 'mega-x')).toBe('Mega Charizard X');
    expect(formatMegaLabel('Charizard', 'mega-y')).toBe('Mega Charizard Y');
  });

  it('labels Reg M-C\'s second "Mega Z" form, matching megaAbilities.ts\'s own naming', () => {
    expect(formatMegaLabel('Absol', 'mega-z')).toBe('Mega Absol Z');
  });
});

describe('megaFormBadgeLetter (Battle Logger X/Y/Z picker)', () => {
  it('labels an unambiguous single form "M"', () => {
    expect(megaFormBadgeLetter('mega')).toBe('M');
  });

  it('labels a split form with its letter', () => {
    expect(megaFormBadgeLetter('mega-x')).toBe('X');
    expect(megaFormBadgeLetter('mega-y')).toBe('Y');
    expect(megaFormBadgeLetter('mega-z')).toBe('Z');
  });
});

describe('resolveOpponentMegaControl (Battle Logger Mega button)', () => {
  it('hides the control entirely for a non-mega-capable species', () => {
    expect(resolveOpponentMegaControl('Pikachu', undefined)).toEqual({ kind: 'none' });
  });

  it("hides the control when the confirmed held item is not this species' own stone", () => {
    expect(resolveOpponentMegaControl('Gengar', 'Choice Scarf')).toEqual({ kind: 'none' });
  });

  it('resolves a single unambiguous form automatically, without confirming the item yet', () => {
    expect(resolveOpponentMegaControl('Gengar', undefined)).toEqual({
      kind: 'single',
      slug: 'gengar-mega',
      revealItem: 'gengarite',
    });
  });

  it('stays single (not choice) for an unambiguous species even once the confirmed item pins the exact form - no ambiguity to correct', () => {
    expect(resolveOpponentMegaControl('Gengar', 'Gengarite')).toEqual({
      kind: 'single',
      slug: 'gengar-mega',
      revealItem: null,
    });
  });

  it('offers a choice between every possible form when the item is still unconfirmed and ambiguous', () => {
    expect(resolveOpponentMegaControl('Charizard', undefined)).toEqual({
      kind: 'choice',
      options: [
        { slug: 'charizard-mega-x', item: 'charizardite x', suffix: 'mega-x' },
        { slug: 'charizard-mega-y', item: 'charizardite y', suffix: 'mega-y' },
      ],
    });
  });

  it('keeps offering the full choice - never collapses to single - once a form is already confirmed, so a misclick (e.g. X instead of Y) can be corrected', () => {
    expect(resolveOpponentMegaControl('Charizard', 'Charizardite X')).toEqual({
      kind: 'choice',
      options: [
        { slug: 'charizard-mega-x', item: 'charizardite x', suffix: 'mega-x' },
        { slug: 'charizard-mega-y', item: 'charizardite y', suffix: 'mega-y' },
      ],
    });
  });
});
