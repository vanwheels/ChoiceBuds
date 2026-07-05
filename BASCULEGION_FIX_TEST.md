# Basculegion PokeAPI Import Fix - Test Documentation

## Problem Summary
PokeAPI requires explicit variant endpoints for gender-divergent species like Basculegion:
- `basculegion-male` (Male form)
- `basculegion-female` (Female form)

There is NO generic `basculegion` endpoint, which was causing import crashes.

## Solution Implemented
Added a `normalizeSpeciesForAPI()` function in `src/renderer/services/pokeapi.ts` that:
1. Maps Showdown species names to correct PokeAPI slugs
2. Uses gender information from parsed Pokémon data
3. Handles multiple gender-divergent species (Basculegion, Indeedee, Oinkologne, Meowstic)

## Test Cases

### Test 1: Basculegion without explicit gender suffix
**Input (Showdown format):**
```
Basculegion @ Choice Scarf
Ability: Swift Swim
Level: 50
Tera Type: Water
EVs: 252 Atk / 4 SpD / 252 Spe
Adamant Nature
- Wave Crash
- Flip Turn
- Aqua Jet
- Last Respects
```

**Expected Behavior:**
- Parser assigns gender: `M` (male default from pokemonRules.ts)
- API normalization converts to: `basculegion-male`
- PokeAPI fetch succeeds with correct endpoint

### Test 2: Basculegion-F (Female form with suffix)
**Input (Showdown format):**
```
Basculegion-F @ Choice Scarf
Ability: Swift Swim
Level: 50
Tera Type: Water
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Hydro Pump
- Shadow Ball
- Ice Beam
- Flip Turn
```

**Expected Behavior:**
- Parser assigns gender: `F` (from species suffix)
- API normalization converts to: `basculegion-female`
- PokeAPI fetch succeeds with correct endpoint

### Test 3: Basculegion with explicit (F) gender marker
**Input (Showdown format):**
```
Basculegion (F) @ Choice Scarf
Ability: Swift Swim
Level: 50
Tera Type: Water
EVs: 252 SpA / 4 SpD / 252 Spe
Modest Nature
- Hydro Pump
- Shadow Ball
- Ice Beam
- Flip Turn
```

**Expected Behavior:**
- Parser assigns gender: `F` (from explicit marker)
- API normalization converts to: `basculegion-female`
- PokeAPI fetch succeeds with correct endpoint

### Test 4: Other Gender-Divergent Species

#### Indeedee
- `Indeedee` → `indeedee-male` (default)
- `Indeedee (F)` → `indeedee-female`
- `Indeedee-F` → `indeedee-female`

#### Oinkologne
- `Oinkologne` → `oinkologne-male` (default)
- `Oinkologne (F)` → `oinkologne-female`
- `Oinkologne-F` → `oinkologne-female`

#### Meowstic
- `Meowstic` → `meowstic-male` (default)
- `Meowstic (F)` → `meowstic-female`
- `Meowstic-F` → `meowstic-female`

## Implementation Details

### Key Changes in `pokeapi.ts`:

1. **Updated `fetchPokemonData()` signature:**
   ```typescript
   export async function fetchPokemonData(
     speciesName: string, 
     gender?: 'M' | 'F' | 'N' | ''
   ): Promise<PokeAPICacheEntry>
   ```

2. **New `normalizeSpeciesForAPI()` function:**
   - Replaces old `normalizeSpeciesName()`
   - Accepts gender parameter
   - Maps gender-divergent species to correct API endpoints
   - Preserves all existing special case handling

3. **Updated `enrichPokemonWithAPI()`:**
   - Extracts gender from `ShowdownPokemon` object
   - Uses normalized name as cache key for consistency
   - Passes gender to `fetchPokemonData()`

### Cache Key Strategy
The cache now uses the normalized API endpoint name as the key:
- `basculegion-male` (not `basculegion`)
- `basculegion-female` (not `basculegion-f`)

This ensures:
- No cache collisions between male/female forms
- Consistent lookups across different input formats
- Proper sprite and stat data for each form

## Manual Testing Steps

1. **Start the application:**
   ```bash
   npm run dev
   ```

2. **Import a team with Basculegion:**
   - Click "Import Team" button
   - Paste Showdown format team with Basculegion
   - Verify import succeeds without errors

3. **Check the imported Pokémon card:**
   - Verify correct sprite displays
   - Verify correct types show
   - Verify correct base stats display

4. **Test both forms:**
   - Import male Basculegion (default or explicit)
   - Import female Basculegion (with -F suffix or (F) marker)
   - Verify both import successfully with different sprites

## Expected Results

✅ **Before Fix:**
- Basculegion import would crash with 404 error
- Error message: "Pokémon species 'basculegion' not found in PokeAPI"

✅ **After Fix:**
- Basculegion imports successfully
- Correct form-specific sprite displays
- Correct form-specific stats display
- No console errors

## Additional Notes

- The fix maintains backward compatibility with all existing species
- Display names remain clean (e.g., "Basculegion" not "basculegion-male")
- The normalization only affects API requests, not UI rendering
- Cache entries are stored with normalized keys for consistency
