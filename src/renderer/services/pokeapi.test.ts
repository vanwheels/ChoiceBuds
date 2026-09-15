import { describe, expect, it } from 'vitest';
import { normalizeSpeciesForAPI } from './pokeapi';

// Previously untested despite backing every enrichment fetch - written while
// fixing the Toxtricity gap this table was missing (found via VGCPastes
// catalog sprite-matching diagnosis, see docs/investigations/
// vgcpastes-catalog-sprite-matching.md), to lock in the existing
// gender-divergent/no-bare-slug special cases alongside the new one.
describe('normalizeSpeciesForAPI', () => {
  it('passes an ordinary species through as lowercase', () => {
    expect(normalizeSpeciesForAPI('Landorus-Therian')).toBe('landorus-therian');
  });

  it('defaults each gender-divergent species to its male slug with no gender given', () => {
    expect(normalizeSpeciesForAPI('Basculegion')).toBe('basculegion-male');
    expect(normalizeSpeciesForAPI('Indeedee')).toBe('indeedee-male');
    expect(normalizeSpeciesForAPI('Oinkologne')).toBe('oinkologne-male');
    expect(normalizeSpeciesForAPI('Meowstic')).toBe('meowstic-male');
  });

  it('resolves a gender-divergent species to its female slug when gender is F', () => {
    expect(normalizeSpeciesForAPI('Basculegion', 'F')).toBe('basculegion-female');
  });

  it('resolves an explicit "-F"/"-M" suffix regardless of the gender argument', () => {
    expect(normalizeSpeciesForAPI('Indeedee-F')).toBe('indeedee-female');
    expect(normalizeSpeciesForAPI('Indeedee-M', 'F')).toBe('indeedee-male');
  });

  it('maps species with no bare-named PokeAPI resource to their default forme', () => {
    expect(normalizeSpeciesForAPI('Aegislash')).toBe('aegislash-shield');
    expect(normalizeSpeciesForAPI('Palafin')).toBe('palafin-zero');
    expect(normalizeSpeciesForAPI('Gourgeist')).toBe('gourgeist-average');
    expect(normalizeSpeciesForAPI('Lycanroc')).toBe('lycanroc-midday');
    expect(normalizeSpeciesForAPI('Maushold')).toBe('maushold-family-of-four');
    expect(normalizeSpeciesForAPI('Mimikyu')).toBe('mimikyu-disguised');
    expect(normalizeSpeciesForAPI('Morpeko')).toBe('morpeko-full-belly');
    expect(normalizeSpeciesForAPI('Pyroar')).toBe('pyroar-male');
    expect(normalizeSpeciesForAPI('Toxtricity')).toBe('toxtricity-amped');
  });

  it('appends "-breed" to Paldean Tauros forms, matching PokeAPI\'s real slugs', () => {
    expect(normalizeSpeciesForAPI('Tauros-Paldea-Combat')).toBe('tauros-paldea-combat-breed');
    expect(normalizeSpeciesForAPI('Tauros-Paldea-Blaze')).toBe('tauros-paldea-blaze-breed');
    expect(normalizeSpeciesForAPI('Tauros-Paldea-Aqua')).toBe('tauros-paldea-aqua-breed');
  });

  it('strips apostrophes and periods, and turns spaces into hyphens', () => {
    expect(normalizeSpeciesForAPI("Sirfetch'd")).toBe('sirfetchd');
    expect(normalizeSpeciesForAPI('Mr. Mime')).toBe('mr-mime');
  });
});
