/**
 * Test suite for Showdown parser with gender fallback logic
 * Tests gender-locks, form variants, and default assignments
 */

import { describe, expect, it } from 'vitest';
import { parseShowdownText } from './parser';
import { getFallbackGender } from '../config/pokemonRules';

// Test data for various scenarios
const TEST_CASES = {
  // Female-locked species without explicit gender
  femaleLocked: `Cresselia @ Sitrus Berry
Ability: Levitate
Level: 50
Tera Type: Fairy
EVs: 252 HP / 252 Def / 4 SpD
Bold Nature
- Lunar Blessing
- Moonblast
- Trick Room
- Helping Hand`,

  // Genderless species without explicit gender
  genderless: `Gholdengo @ Choice Specs
Ability: Good as Gold
Level: 50
Shiny: Yes
Tera Type: Steel
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Make It Rain
- Shadow Ball
- Focus Blast
- Thunderbolt`,

  // Gendered form variant (Basculegion-F)
  genderedFormFemale: `Basculegion-F @ Choice Scarf
Ability: Swift Swim
Level: 50
Tera Type: Water
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Wave Crash
- Flip Turn
- Aqua Jet
- Last Respects`,

  // Gendered form variant (Indeedee-F)
  indeedeeFemale: `Indeedee-F @ Safety Goggles
Ability: Psychic Surge
Level: 50
Tera Type: Psychic
EVs: 252 HP / 252 Def / 4 SpD
Relaxed Nature
- Psychic
- Follow Me
- Helping Hand
- Trick Room`,

  // Rotom form (genderless)
  rotomWash: `Rotom-Wash @ Sitrus Berry
Ability: Levitate
Level: 50
Tera Type: Electric
EVs: 252 HP / 252 SpA / 4 Spe
Modest Nature
- Hydro Pump
- Thunderbolt
- Volt Switch
- Protect`,

  // Explicit gender should override fallback
  explicitMale: `Cresselia (M) @ Sitrus Berry
Ability: Levitate
Level: 50
Tera Type: Fairy
EVs: 252 HP / 252 Def / 4 SpD
Bold Nature
- Lunar Blessing
- Moonblast
- Trick Room
- Helping Hand`,

  // Regular Pokémon without gender (should default to M)
  regularNoGender: `Rillaboom @ Assault Vest
Ability: Grassy Surge
Level: 50
Tera Type: Fire
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Fake Out
- Grassy Glide
- Wood Hammer
- U-turn`,

  // Multiple Pokémon with mixed gender rules
  mixedTeam: `Cresselia @ Sitrus Berry
Ability: Levitate
Level: 50
Tera Type: Fairy
EVs: 252 HP / 252 Def / 4 SpD
Bold Nature
- Lunar Blessing
- Moonblast
- Trick Room
- Helping Hand

Gholdengo @ Choice Specs
Ability: Good as Gold
Level: 50
Tera Type: Steel
EVs: 252 SpA / 4 SpD / 252 Spe
Timid Nature
- Make It Rain
- Shadow Ball
- Focus Blast
- Thunderbolt

Basculegion-F @ Choice Scarf
Ability: Swift Swim
Level: 50
Tera Type: Water
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Wave Crash
- Flip Turn
- Aqua Jet
- Last Respects

Rillaboom (M) @ Assault Vest
Ability: Grassy Surge
Level: 50
Tera Type: Fire
EVs: 252 HP / 252 Atk / 4 SpD
Adamant Nature
- Fake Out
- Grassy Glide
- Wood Hammer
- U-turn`,
};

describe('parseShowdownText - gender fallback', () => {
  it('applies the female-locked fallback (Cresselia)', () => {
    const result = parseShowdownText(TEST_CASES.femaleLocked);
    expect(result.pokemon[0]?.gender).toBe('F');
  });

  it('applies the genderless fallback (Gholdengo)', () => {
    const result = parseShowdownText(TEST_CASES.genderless);
    expect(result.pokemon[0]?.gender).toBe('N');
  });

  it('applies the gendered-form fallback (Basculegion-F)', () => {
    const result = parseShowdownText(TEST_CASES.genderedFormFemale);
    expect(result.pokemon[0]?.gender).toBe('F');
  });

  it('applies the gendered-form fallback (Indeedee-F)', () => {
    const result = parseShowdownText(TEST_CASES.indeedeeFemale);
    expect(result.pokemon[0]?.gender).toBe('F');
  });

  it('applies the genderless-form fallback (Rotom-Wash)', () => {
    const result = parseShowdownText(TEST_CASES.rotomWash);
    expect(result.pokemon[0]?.gender).toBe('N');
  });

  it('lets an explicit gender override the fallback (Cresselia (M))', () => {
    const result = parseShowdownText(TEST_CASES.explicitMale);
    expect(result.pokemon[0]?.gender).toBe('M');
  });

  it('defaults an ungendered regular species to M (Rillaboom)', () => {
    const result = parseShowdownText(TEST_CASES.regularNoGender);
    expect(result.pokemon[0]?.gender).toBe('M');
  });

  it('applies the right fallback per-Pokémon across a mixed team', () => {
    const result = parseShowdownText(TEST_CASES.mixedTeam);
    expect(result.pokemon.map(p => p.gender)).toEqual(['F', 'N', 'F', 'M']);
  });
});

describe('getFallbackGender', () => {
  it.each([
    ['Cresselia', 'F'],
    ['Gholdengo', 'N'],
    ['Basculegion-F', 'F'],
    ['Basculegion', 'M'],
    ['Rotom-Wash', 'N'],
    ['Indeedee-F', 'F'],
    ['Indeedee', 'M'],
    ['Pikachu', 'M'],
    ['Tinkaton', 'F'],
    ['Metagross', 'N'],
  ])('%s -> %s', (species, expected) => {
    expect(getFallbackGender(species)).toBe(expected);
  });
});
