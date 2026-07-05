# Gender Fallback Utility - Implementation Guide

## Overview

The Gender Fallback Utility is a robust parsing enhancement that automatically assigns correct genders to Pokémon when importing Showdown/Pokepaste text that lacks explicit gender notation. This ensures accurate sprite rendering, typing profiles, and VGC compliance.

## Features

### 1. **Female-Locked Species Detection**
Automatically assigns `'F'` gender to species that can only be female in VGC:
- **Legendaries**: Cresselia, Enamorus, Fezandipiti
- **Evolution Lines**: Chansey/Blissey, Tinkaton line, Hatterene line, Tsareena line
- **Other**: Mandibuzz, Froslass, Salazzle, Vespiquen, and more

### 2. **Genderless Species Detection**
Automatically assigns `'N'` (null/genderless) to species without gender:
- **Steel Types**: Gholdengo, Metagross line, Archaludon, Duraludon
- **Rotom Forms**: Rotom-Wash, Rotom-Heat, Rotom-Mow, Rotom-Frost, Rotom-Fan
- **Legendaries**: Regieleki, Regidrago, Terapagos, Zacian, Zamazenta
- **Other**: Bronzong, Claydol, Magnezone line, Porygon line, and more

### 3. **Form Variant Gender Handling**
Correctly identifies gender from form names:
- **Basculegion-F** → Female
- **Basculegion** → Male (default)
- **Indeedee-F** → Female
- **Indeedee** → Male (default)
- **Meowstic-F** → Female
- **Oinkologne-F** → Female

### 4. **Explicit Gender Override**
Respects explicit gender notation in Showdown text:
```
Cresselia (M) @ Sitrus Berry  // Will be Male (overrides female-lock)
```

### 5. **Default Male Fallback**
Regular Pokémon without explicit gender default to `'M'` as baseline.

## Architecture

### File Structure

```
src/renderer/
├── config/
│   └── pokemonRules.ts          # Static lookup maps and utility functions
└── services/
    └── parser.ts                 # Enhanced parser with gender fallback logic
```

### Key Components

#### 1. `pokemonRules.ts` - Static Configuration
```typescript
// Female-locked species array
export const FEMALE_LOCKED_SPECIES: readonly string[]

// Genderless species array
export const GENDERLESS_SPECIES: readonly string[]

// Gendered form variants mapping
export const GENDERED_FORM_VARIANTS: Record<string, 'M' | 'F'>

// Main utility function
export function getFallbackGender(species: string): 'M' | 'F' | 'N' | undefined
```

#### 2. `parser.ts` - Enhanced Parser
The `parseFirstLine()` function now:
1. Extracts explicit gender from `(M)` or `(F)` notation
2. If no explicit gender exists, calls `getFallbackGender(species)`
3. Applies the appropriate gender based on species rules

## Gender Assignment Priority

The system follows this priority order:

1. **Explicit Gender** (highest priority)
   - `(M)` or `(F)` in Showdown text
   - Always respected, even if it contradicts species rules

2. **Gendered Form Variants**
   - Species name contains gender indicator (e.g., `Basculegion-F`)
   - Checked before base species rules

3. **Female-Locked Species**
   - Species can only be female in VGC
   - Assigns `'F'` automatically

4. **Genderless Species**
   - Species has no gender in VGC
   - Assigns `'N'` automatically

5. **Default Male** (lowest priority)
   - All other cases default to `'M'`

## Usage Examples

### Example 1: Female-Locked Species
```
Input:
Cresselia @ Sitrus Berry
Ability: Levitate
...

Output:
{
  species: "Cresselia",
  gender: "F",  // Automatically assigned
  item: "Sitrus Berry",
  ...
}
```

### Example 2: Genderless Species
```
Input:
Gholdengo @ Choice Specs
Ability: Good as Gold
...

Output:
{
  species: "Gholdengo",
  gender: "N",  // Automatically assigned
  item: "Choice Specs",
  ...
}
```

### Example 3: Form Variant
```
Input:
Basculegion-F @ Choice Scarf
Ability: Swift Swim
...

Output:
{
  species: "Basculegion-F",
  gender: "F",  // Detected from form name
  item: "Choice Scarf",
  ...
}
```

### Example 4: Explicit Override
```
Input:
Cresselia (M) @ Sitrus Berry
Ability: Levitate
...

Output:
{
  species: "Cresselia",
  gender: "M",  // Explicit override respected
  item: "Sitrus Berry",
  ...
}
```

### Example 5: Regular Pokémon
```
Input:
Rillaboom @ Assault Vest
Ability: Grassy Surge
...

Output:
{
  species: "Rillaboom",
  gender: "M",  // Default fallback
  item: "Assault Vest",
  ...
}
```

## Testing

A comprehensive test suite is included in `src/renderer/services/parser.test.ts`:

```bash
npx tsx src/renderer/services/parser.test.ts
```

### Test Coverage
- ✅ Female-locked species (Cresselia)
- ✅ Genderless species (Gholdengo)
- ✅ Gendered form variants (Basculegion-F, Indeedee-F)
- ✅ Genderless form variants (Rotom-Wash)
- ✅ Explicit gender overrides
- ✅ Regular Pokémon defaults
- ✅ Mixed teams with various rules
- ✅ Direct utility function tests

All tests pass with 100% accuracy.

## Extending the System

### Adding New Female-Locked Species
Edit `src/renderer/config/pokemonRules.ts`:

```typescript
export const FEMALE_LOCKED_SPECIES: readonly string[] = [
  'Cresselia',
  'Enamorus',
  // Add new species here
  'NewFemalePokemon',
];
```

### Adding New Genderless Species
```typescript
export const GENDERLESS_SPECIES: readonly string[] = [
  'Gholdengo',
  'Metagross',
  // Add new species here
  'NewGenderlessPokemon',
];
```

### Adding New Gendered Form Variants
```typescript
export const GENDERED_FORM_VARIANTS: Record<string, 'M' | 'F'> = {
  'Basculegion-F': 'F',
  'Basculegion': 'M',
  // Add new forms here
  'NewPokemon-F': 'F',
  'NewPokemon': 'M',
};
```

## Benefits

1. **Accurate Sprite Rendering**: Ensures correct sprite URLs for gendered forms
2. **VGC Compliance**: Respects official VGC gender rules
3. **User Experience**: Eliminates need for manual gender specification
4. **Type Safety**: Full TypeScript support with explicit interfaces
5. **Maintainability**: Decoupled architecture with static config files
6. **Extensibility**: Easy to add new species as VGC meta evolves

## Architecture Compliance

This implementation strictly follows the `.clinerules` architecture guidelines:

✅ **Decoupled Architecture**: Separate config file for static data  
✅ **No Monolithic Files**: Parser remains under 250 lines  
✅ **Config-Based Static Data**: All lookup maps in `pokemonRules.ts`  
✅ **Explicit TypeScript Interfaces**: No `as any` casting  
✅ **Pure Functions**: No side effects in parser utilities  

## Future Enhancements

Potential improvements for future iterations:

1. **Regional Form Support**: Handle Alolan, Galarian, Hisuian, Paldean forms
2. **Mega Evolution Gender**: Preserve gender through Mega Evolution
3. **Dynamax/Gigantamax**: Ensure gender consistency with G-Max forms
4. **API Integration**: Validate against PokeAPI gender ratios
5. **User Preferences**: Allow custom gender defaults per species

## Conclusion

The Gender Fallback Utility provides a robust, maintainable solution for handling Pokémon genders in Showdown text parsing. It ensures accuracy, respects VGC rules, and maintains clean architecture principles throughout the codebase.
