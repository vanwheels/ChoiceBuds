/**
 * Test suite for the Speed Tiers data layer - real Generations.get(9) data,
 * no mocking, same convention as damageCalcEngine.test.ts (this module is
 * pure/side-effect-free, see speedTiers.ts's header).
 */
import { describe, expect, it } from 'vitest';
import { Generations } from '@smogon/calc';
import type { ChampionsUsageEntry, ImportedPokemonInfo } from '../types/pokemon';
import { computeTeamSpeed, computeThreatSpeedProfile, defaultSpeedFieldContext, type SpeedFieldContext } from './speedTiers';

const gen = Generations.get(9);

function teamPokemon(overrides: Partial<ImportedPokemonInfo['showdownData']> = {}): ImportedPokemonInfo {
  return {
    showdownData: {
      species: 'Incineroar',
      item: '',
      ability: 'Intimidate',
      level: 50,
      shiny: false,
      gigantamax: false,
      happiness: 255,
      nature: 'Hardy',
      evs: { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
      moves: [],
      ...overrides,
    },
    pokedexNumber: 727,
    types: ['fire', 'dark'],
    baseStats: { hp: 95, attack: 115, defense: 90, specialAttack: 80, specialDefense: 90, speed: 60 },
    spriteUrl: 'https://example.com/incineroar.png',
    importedAt: 0,
    id: 'test-id',
  };
}

function usageEntry(overrides: Partial<ChampionsUsageEntry> = {}): ChampionsUsageEntry {
  return {
    species: 'Venusaur',
    season: 'Season M-3',
    moves: [],
    items: [],
    abilities: [],
    natures: [],
    statSpreads: [{ percentage: 60, points: { hp: 4, atk: 0, def: 4, spa: 20, spd: 4, spe: 30 } }],
    columnPosition: 1,
    cachedAt: 0,
    expiresAt: 0,
    ...overrides,
  };
}

describe('computeTeamSpeed', () => {
  it('computes a neutral-field base Speed', () => {
    const result = computeTeamSpeed(gen, teamPokemon(), defaultSpeedFieldContext());
    expect(result?.speed).toBeGreaterThan(0);
  });

  it('doubles Speed under Tailwind', () => {
    const base = computeTeamSpeed(gen, teamPokemon(), defaultSpeedFieldContext());
    const field: SpeedFieldContext = { ...defaultSpeedFieldContext(), teamHasTailwind: true };
    const withTailwind = computeTeamSpeed(gen, teamPokemon(), field);
    expect(withTailwind?.speed).toBe(base!.speed * 2);
  });

  it('doubles Speed for a weather-boosting ability matching field weather', () => {
    const mon = teamPokemon({ species: 'Venusaur', ability: 'Chlorophyll' });
    const noWeather = computeTeamSpeed(gen, mon, defaultSpeedFieldContext());
    const sun = computeTeamSpeed(gen, mon, { ...defaultSpeedFieldContext(), weather: 'Sun' });
    expect(sun?.speed).toBe(noWeather!.speed * 2);
  });

  it('does not boost a weather ability when the field weather does not match', () => {
    const mon = teamPokemon({ species: 'Venusaur', ability: 'Chlorophyll' });
    const noWeather = computeTeamSpeed(gen, mon, defaultSpeedFieldContext());
    const rain = computeTeamSpeed(gen, mon, { ...defaultSpeedFieldContext(), weather: 'Rain' });
    expect(rain?.speed).toBe(noWeather!.speed);
  });

  it('boosts Speed for a Choice Scarf on the team mon itself', () => {
    const noItem = computeTeamSpeed(gen, teamPokemon(), defaultSpeedFieldContext());
    const scarfed = computeTeamSpeed(gen, teamPokemon({ item: 'Choice Scarf' }), defaultSpeedFieldContext());
    expect(scarfed?.speed).toBe(Math.floor(noItem!.speed * 1.5));
  });

  it('returns null for an unresolvable species', () => {
    const result = computeTeamSpeed(gen, teamPokemon({ species: 'Not A Real Species' }), defaultSpeedFieldContext());
    expect(result).toBeNull();
  });
});

describe('computeThreatSpeedProfile', () => {
  it('produces one spread entry per statSpreads entry, sorted by percentage descending', () => {
    const usage = usageEntry({
      statSpreads: [
        { percentage: 20, points: { hp: 4, atk: 0, def: 4, spa: 20, spd: 4, spe: 30 } },
        { percentage: 60, points: { hp: 20, atk: 0, def: 4, spa: 20, spd: 4, spe: 10 } },
      ],
    });
    const profile = computeThreatSpeedProfile(gen, usage, defaultSpeedFieldContext());
    expect(profile?.spreads.map(s => s.percentage)).toEqual([60, 20]);
  });

  it('only boosts a weather-keyed ability when the field context supplies matching weather', () => {
    const usage = usageEntry({ abilities: [{ name: 'Chlorophyll', percentage: 90 }] });
    const noWeather = computeThreatSpeedProfile(gen, usage, defaultSpeedFieldContext());
    const sun = computeThreatSpeedProfile(gen, usage, { ...defaultSpeedFieldContext(), weather: 'Sun' });
    expect(sun?.spreads[0].speed).toBe(noWeather!.spreads[0].speed * 2);
  });

  it('emits a nature modifier note only when the top nature is Speed-relevant and changes the number', () => {
    const speedNature = usageEntry({ natures: [{ name: 'Timid', percentage: 50, statUp: 'Speed', statDown: 'Attack' }] });
    const withNote = computeThreatSpeedProfile(gen, speedNature, defaultSpeedFieldContext());
    expect(withNote?.modifierNotes).toEqual([expect.objectContaining({ kind: 'nature', label: 'Timid' })]);

    const nonSpeedNature = usageEntry({ natures: [{ name: 'Modest', percentage: 50, statUp: 'Sp. Atk', statDown: 'Attack' }] });
    const withoutNote = computeThreatSpeedProfile(gen, nonSpeedNature, defaultSpeedFieldContext());
    expect(withoutNote?.modifierNotes).toEqual([]);
  });

  it('emits an item modifier note for a Choice Scarf-shaped item and none for a non-speed item', () => {
    const usage = usageEntry({
      items: [{ name: 'Sitrus Berry', percentage: 40 }, { name: 'Choice Scarf', percentage: 30 }],
    });
    const profile = computeThreatSpeedProfile(gen, usage, defaultSpeedFieldContext());
    expect(profile?.modifierNotes).toEqual([expect.objectContaining({ kind: 'item', label: 'Choice Scarf' })]);
  });

  it('returns null for an unresolvable species', () => {
    const result = computeThreatSpeedProfile(gen, usageEntry({ species: 'Not A Real Species' }), defaultSpeedFieldContext());
    expect(result).toBeNull();
  });
});
