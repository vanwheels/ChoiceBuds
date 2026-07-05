/**
 * Test suite for Showdown parser with gender fallback logic
 * Tests gender-locks, form variants, and default assignments
 */

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

// Run tests
console.log('=== GENDER FALLBACK UTILITY TESTS ===\n');

// Test 1: Female-locked species
console.log('Test 1: Female-locked species (Cresselia)');
const result1 = parseShowdownText(TEST_CASES.femaleLocked);
console.log(`  Species: ${result1.pokemon[0]?.species}`);
console.log(`  Gender: ${result1.pokemon[0]?.gender}`);
console.log(`  Expected: F, Got: ${result1.pokemon[0]?.gender}`);
console.log(`  ✓ ${result1.pokemon[0]?.gender === 'F' ? 'PASS' : 'FAIL'}\n`);

// Test 2: Genderless species
console.log('Test 2: Genderless species (Gholdengo)');
const result2 = parseShowdownText(TEST_CASES.genderless);
console.log(`  Species: ${result2.pokemon[0]?.species}`);
console.log(`  Gender: ${result2.pokemon[0]?.gender}`);
console.log(`  Expected: N, Got: ${result2.pokemon[0]?.gender}`);
console.log(`  ✓ ${result2.pokemon[0]?.gender === 'N' ? 'PASS' : 'FAIL'}\n`);

// Test 3: Gendered form variant (Basculegion-F)
console.log('Test 3: Gendered form variant (Basculegion-F)');
const result3 = parseShowdownText(TEST_CASES.genderedFormFemale);
console.log(`  Species: ${result3.pokemon[0]?.species}`);
console.log(`  Gender: ${result3.pokemon[0]?.gender}`);
console.log(`  Expected: F, Got: ${result3.pokemon[0]?.gender}`);
console.log(`  ✓ ${result3.pokemon[0]?.gender === 'F' ? 'PASS' : 'FAIL'}\n`);

// Test 4: Indeedee-F
console.log('Test 4: Gendered form variant (Indeedee-F)');
const result4 = parseShowdownText(TEST_CASES.indeedeeFemale);
console.log(`  Species: ${result4.pokemon[0]?.species}`);
console.log(`  Gender: ${result4.pokemon[0]?.gender}`);
console.log(`  Expected: F, Got: ${result4.pokemon[0]?.gender}`);
console.log(`  ✓ ${result4.pokemon[0]?.gender === 'F' ? 'PASS' : 'FAIL'}\n`);

// Test 5: Rotom-Wash (genderless form)
console.log('Test 5: Genderless form variant (Rotom-Wash)');
const result5 = parseShowdownText(TEST_CASES.rotomWash);
console.log(`  Species: ${result5.pokemon[0]?.species}`);
console.log(`  Gender: ${result5.pokemon[0]?.gender}`);
console.log(`  Expected: N, Got: ${result5.pokemon[0]?.gender}`);
console.log(`  ✓ ${result5.pokemon[0]?.gender === 'N' ? 'PASS' : 'FAIL'}\n`);

// Test 6: Explicit gender overrides fallback
console.log('Test 6: Explicit gender overrides fallback (Cresselia (M))');
const result6 = parseShowdownText(TEST_CASES.explicitMale);
console.log(`  Species: ${result6.pokemon[0]?.species}`);
console.log(`  Gender: ${result6.pokemon[0]?.gender}`);
console.log(`  Expected: M (explicit override), Got: ${result6.pokemon[0]?.gender}`);
console.log(`  ✓ ${result6.pokemon[0]?.gender === 'M' ? 'PASS' : 'FAIL'}\n`);

// Test 7: Regular Pokémon defaults to M
console.log('Test 7: Regular Pokémon defaults to M (Rillaboom)');
const result7 = parseShowdownText(TEST_CASES.regularNoGender);
console.log(`  Species: ${result7.pokemon[0]?.species}`);
console.log(`  Gender: ${result7.pokemon[0]?.gender}`);
console.log(`  Expected: M, Got: ${result7.pokemon[0]?.gender}`);
console.log(`  ✓ ${result7.pokemon[0]?.gender === 'M' ? 'PASS' : 'FAIL'}\n`);

// Test 8: Mixed team with various gender rules
console.log('Test 8: Mixed team with various gender rules');
const result8 = parseShowdownText(TEST_CASES.mixedTeam);
console.log(`  Parsed ${result8.pokemon.length} Pokémon`);
result8.pokemon.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.species}: ${p.gender}`);
});
const expectedGenders = ['F', 'N', 'F', 'M'];
const allCorrect = result8.pokemon.every((p, i) => p.gender === expectedGenders[i]);
console.log(`  Expected: [F, N, F, M]`);
console.log(`  Got: [${result8.pokemon.map(p => p.gender).join(', ')}]`);
console.log(`  ✓ ${allCorrect ? 'PASS' : 'FAIL'}\n`);

// Test 9: Direct utility function tests
console.log('Test 9: Direct utility function tests');
const utilityTests = [
  { species: 'Cresselia', expected: 'F' },
  { species: 'Gholdengo', expected: 'N' },
  { species: 'Basculegion-F', expected: 'F' },
  { species: 'Basculegion', expected: 'M' },
  { species: 'Rotom-Wash', expected: 'N' },
  { species: 'Indeedee-F', expected: 'F' },
  { species: 'Indeedee', expected: 'M' },
  { species: 'Pikachu', expected: 'M' },
  { species: 'Tinkaton', expected: 'F' },
  { species: 'Metagross', expected: 'N' },
];

utilityTests.forEach(test => {
  const result = getFallbackGender(test.species);
  const pass = result === test.expected;
  console.log(`  ${test.species}: Expected ${test.expected}, Got ${result} ${pass ? '✓' : '✗'}`);
});

console.log('\n=== ALL TESTS COMPLETE ===');
