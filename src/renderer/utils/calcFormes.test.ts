import { describe, it, expect } from 'vitest';
import { getFormeFamily, formeDisplayLabel, type CalcSpeciesRef } from './calcFormes';

const CHARIZARD_FAMILY: CalcSpeciesRef[] = [
  { name: 'Charizard' },
  { name: 'Charizard-Mega-X', baseSpecies: 'Charizard' },
  { name: 'Charizard-Mega-Y', baseSpecies: 'Charizard' },
  { name: 'Charizard-Gmax', baseSpecies: 'Charizard' },
];

const AEGISLASH_FAMILY: CalcSpeciesRef[] = [
  { name: 'Aegislash-Shield' },
  { name: 'Aegislash-Blade', baseSpecies: 'Aegislash-Shield' },
  { name: 'Aegislash-Both', baseSpecies: 'Aegislash-Shield' },
];

const UNRELATED: CalcSpeciesRef[] = [
  { name: 'Pikachu' },
  { name: 'Pikachu-Alola', baseSpecies: 'Pikachu' }, // regional - not a real entry, just proving exclusion
  { name: 'Pikachu-F', baseSpecies: 'Pikachu' },
];

const ALL_SPECIES = [...CHARIZARD_FAMILY, ...AEGISLASH_FAMILY, ...UNRELATED];

describe('getFormeFamily', () => {
  it('returns an empty family for an empty species name', () => {
    expect(getFormeFamily(ALL_SPECIES, '')).toEqual({ root: '', statFormes: [], megaFormes: [] });
  });

  it('finds the root and Mega siblings for a species with no baseSpecies pointer', () => {
    const family = getFormeFamily(ALL_SPECIES, 'Charizard');
    expect(family.root).toBe('Charizard');
    expect(family.megaFormes.sort()).toEqual(['Charizard-Mega-X', 'Charizard-Mega-Y']);
  });

  it('finds the same family when starting from a Mega forme (walks baseSpecies back to root)', () => {
    const family = getFormeFamily(ALL_SPECIES, 'Charizard-Mega-X');
    expect(family.root).toBe('Charizard');
    expect(family.megaFormes.sort()).toEqual(['Charizard-Mega-X', 'Charizard-Mega-Y']);
  });

  it('excludes Gmax from both statFormes and megaFormes', () => {
    const family = getFormeFamily(ALL_SPECIES, 'Charizard');
    expect(family.statFormes).not.toContain('Charizard-Gmax');
    expect(family.megaFormes).not.toContain('Charizard-Gmax');
  });

  it('classifies Aegislash-Blade/Shield as stat formes (root + 1 sibling), not Mega', () => {
    const family = getFormeFamily(ALL_SPECIES, 'Aegislash-Shield');
    expect(family.root).toBe('Aegislash-Shield');
    expect(family.statFormes.sort()).toEqual(['Aegislash-Blade', 'Aegislash-Shield']);
    expect(family.megaFormes).toEqual([]);
  });

  it('excludes the synthetic "-Both" stance-change helper entry entirely', () => {
    const family = getFormeFamily(ALL_SPECIES, 'Aegislash-Shield');
    expect(family.statFormes).not.toContain('Aegislash-Both');
    expect(family.megaFormes).not.toContain('Aegislash-Both');
  });

  it('excludes regional and gendered forms from the toggle family', () => {
    const family = getFormeFamily(ALL_SPECIES, 'Pikachu');
    expect(family.statFormes).toEqual(['Pikachu']);
    expect(family.megaFormes).toEqual([]);
  });

  it('a species with only one real stat forme has a single-element statFormes (no toggle needed)', () => {
    const family = getFormeFamily(ALL_SPECIES, 'Pikachu');
    expect(family.statFormes).toHaveLength(1);
  });
});

describe('formeDisplayLabel', () => {
  it('labels the base entry "Base" when its name has no extra segments beyond the shared prefix', () => {
    const group = ['Charizard', 'Charizard-Mega-X', 'Charizard-Mega-Y'];
    expect(formeDisplayLabel(group, 'Charizard')).toBe('Base');
  });

  it('labels a Mega-X entry using only its non-shared suffix', () => {
    const group = ['Charizard', 'Charizard-Mega-X', 'Charizard-Mega-Y'];
    expect(formeDisplayLabel(group, 'Charizard-Mega-X')).toBe('Mega X');
  });

  it('labels a Mega-Y entry using only its non-shared suffix', () => {
    const group = ['Charizard', 'Charizard-Mega-X', 'Charizard-Mega-Y'];
    expect(formeDisplayLabel(group, 'Charizard-Mega-Y')).toBe('Mega Y');
  });

  it('labels Aegislash-Blade/Shield using their own distinguishing segment', () => {
    const group = ['Aegislash-Shield', 'Aegislash-Blade'];
    expect(formeDisplayLabel(group, 'Aegislash-Blade')).toBe('Blade');
    expect(formeDisplayLabel(group, 'Aegislash-Shield')).toBe('Shield');
  });
});
