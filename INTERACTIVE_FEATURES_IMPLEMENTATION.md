# Interactive Gender & Shiny Features Implementation

## Overview
Implemented fully interactive, real-time data adjustments for Gender indicators and Shiny star buttons in PokemonCard component with strict form locks and live sprite hot-swapping.

## Implementation Date
July 4, 2026

## Features Implemented

### 1. Interactive Gender Swapper with Strict Form Locks
**Location:** `src/renderer/components/PokemonCard.tsx`

#### Functionality:
- **Click Handler:** Gender indicator box is now clickable with visual hover feedback
- **Strict Validation:** Before allowing gender changes, the system checks:
  - ✅ **Genderless Species:** Completely frozen (e.g., Gholdengo, Metagross, Rotom forms)
  - ✅ **Female-Locked Species:** Blocked from rotation (e.g., Enamorus, Cresselia, Blissey)
  - ✅ **Gender-Dimorphic Species:** Properly handled (Basculegion, Indeedee, Meowstic, Oinkologne)
- **State Management:** Updates flow through `useTeams()` hook and persist to disk immediately
- **Visual Feedback:**
  - Clickable indicators show `cursor-pointer` and `hover:scale-110` animation
  - Locked indicators show `cursor-not-allowed` and reduced opacity
  - Tooltips explain why certain species cannot change gender

#### Gender Toggle Logic:
```typescript
- Male (♂) ↔ Female (♀) for standard species
- Genderless (⌀) species: No interaction allowed
- Female-only species: No interaction allowed
```

### 2. Interactive Shiny Star Toggle
**Location:** `src/renderer/components/PokemonCard.tsx`

#### Functionality:
- **Click Handler:** Star indicator is now fully clickable
- **Instant Toggle:** Clicking immediately flips the `shiny` boolean in team data
- **Visual States:**
  - Shiny: Bright amber star (text-amber-400) with enhanced scale and drop shadow
  - Non-Shiny: Subtle grey star (text-zinc-600) with reduced opacity
- **Hover Effect:** Scale animation on hover for better UX feedback
- **Persistence:** Changes save instantly through `useTeams()` hook

### 3. Live Artwork and Form Variant Hot-Swapping
**Location:** `src/renderer/components/PokemonCard.tsx`

#### Dynamic Sprite URL Generation:
Implemented `getSpriteUrl()` function that dynamically constructs sprite URLs based on:

1. **Shiny Status:**
   - Non-shiny: `https://raw.githubusercontent.com/.../official-artwork/XXX.png`
   - Shiny: `https://raw.githubusercontent.com/.../official-artwork/shiny/XXX.png`

2. **Gender-Dimorphic Forms:**
   - Basculegion: `basculegion-male` ↔ `basculegion-female`
   - Indeedee: `indeedee-male` ↔ `indeedee-female`
   - Meowstic: `meowstic-male` ↔ `meowstic-female`
   - Oinkologne: `oinkologne-male` ↔ `oinkologne-female`

3. **Real-Time Updates:**
   - Sprite URL recalculates on every render based on current state
   - Gender changes trigger sprite URL updates for dimorphic species
   - Shiny toggles instantly switch between normal/shiny sprite folders

## Technical Architecture

### Data Flow:
```
User Click → Handler Function → useTeams Hook → Team Update → Disk Persistence → UI Re-render
```

### Component Props Updated:
**PokemonCard.tsx** now requires:
- `pokemon: ImportedPokemonInfo` (existing)
- `teamId: string` (new - for team identification)
- `pokemonIndex: number` (new - for pokemon position in team array)

**TeamCard.tsx** updated to pass:
- `teamId={team.id}`
- `pokemonIndex={index}`

### State Management:
- All updates flow through `useTeams()` hook's `updateTeam()` function
- Changes persist immediately to `teams.json` in userData directory
- No direct state mutation - follows React immutability patterns

## Gender Lock Rules Reference

### Genderless Species (Cannot Change):
- Gholdengo, Metagross, Rotom (all forms)
- Regis (Regieleki, Regidrago, etc.)
- Terapagos, Archaludon, Duraludon
- Bronzong, Claydol, Cryogonal
- Magnezone line, Porygon line
- Voltorb/Electrode (both forms)
- Legendary/Mythical: Magearna, Meltan, Melmetal, Genesect, Silvally, Type: Null
- Zacian, Zamazenta, Eternatus

### Female-Locked Species (Cannot Change):
- Cresselia, Enamorus (both forms)
- Fezandipiti
- Blissey line (Chansey, Happiny)
- Illumise, Mandibuzz line
- Froslass, Tsareena line
- Tinkaton line
- Hatterene line
- Salazzle, Vespiquen
- Wormadam (all forms)
- Kangaskhan, Miltank
- Nidoqueen line
- Lilligant (both forms)
- Florges line

### Gender-Dimorphic Species (Can Toggle with Sprite Changes):
- Basculegion (Male ↔ Female forms)
- Indeedee (Male ↔ Female forms)
- Meowstic (Male ↔ Female forms)
- Oinkologne (Male ↔ Female forms)

## Files Modified

1. **src/renderer/components/PokemonCard.tsx**
   - Added `teamId` and `pokemonIndex` props
   - Imported `useTeams` hook and gender rule utilities
   - Implemented `handleGenderToggle()` with validation logic
   - Implemented `handleShinyToggle()` for instant shiny switching
   - Added `getSpriteUrl()` for dynamic sprite URL generation
   - Added `isGenderClickable()` helper for UI state
   - Updated gender and shiny indicator JSX with click handlers

2. **src/renderer/components/TeamCard.tsx**
   - Updated PokemonCard instantiation to pass `teamId` and `pokemonIndex`

## Testing Recommendations

### Manual Testing Checklist:
- [ ] Test gender toggle on standard species (e.g., Pikachu, Charizard)
- [ ] Verify genderless species cannot be clicked (e.g., Gholdengo, Metagross)
- [ ] Verify female-locked species cannot be clicked (e.g., Enamorus, Cresselia)
- [ ] Test gender-dimorphic species sprite changes (Basculegion, Indeedee)
- [ ] Test shiny toggle on various species
- [ ] Verify shiny sprites load correctly (check /shiny/ folder path)
- [ ] Confirm changes persist after app restart
- [ ] Test hover animations and visual feedback
- [ ] Verify tooltips display correct messages

### Edge Cases to Test:
- Rapid clicking on gender/shiny indicators
- Gender toggle on species with form variants
- Shiny toggle on gender-dimorphic species
- Multiple pokemon updates in quick succession

## Architecture Compliance

✅ **Decoupled Architecture:** State management separated from UI components
✅ **Custom Hooks:** All state changes flow through `useTeams()` hook
✅ **TypeScript Interfaces:** Explicit types for all data contracts
✅ **No Inline Logic:** Gender rules imported from `pokemonRules.ts` config
✅ **Component Size:** PokemonCard remains under 450 lines (within guidelines)

## Future Enhancements

Potential improvements for future iterations:
1. Add animation transitions when sprites change
2. Implement undo/redo for quick changes
3. Add bulk edit mode for multiple pokemon
4. Show loading state during sprite URL updates
5. Add keyboard shortcuts for power users
6. Implement form variant selector for species with multiple forms

## Notes

- Sprite URLs are generated dynamically on each render for real-time updates
- Gender changes on dimorphic species update both gender field and sprite URL
- All changes persist immediately - no "save" button required
- Visual feedback (hover, cursor, tooltips) guides user interaction
- Strict validation prevents invalid gender assignments
