# Duplicate File Compilation Bug Fix

## Problem Identified

The DevTools Sources panel revealed that every component was being bundled twice in the Electron isolated context, causing the live layout view to ignore file updates.

## Root Cause

In `src/main/preload.ts` (line 8), there was an import statement pulling in renderer types:

```typescript
import type { TeamsDatabase, PokeAPICache } from '../renderer/types/pokemon';
```

This caused the preload script to bundle renderer code, creating duplicate compilation. The preload script is compiled separately by the electron plugin in Vite, but importing from the renderer directory caused Vite to process those renderer files twice:
1. Once for the renderer bundle
2. Once for the preload bundle

## Configuration Analysis

### ✅ vite.config.ts - CORRECT
- Single renderer entry point via `index.html`
- Separate electron plugin configuration for `main.ts` and `preload.ts`
- No duplicate paths or overlapping entry points
- Clean separation between main, preload, and renderer builds

### ✅ tsconfig.json - CORRECT
- `include: ["src/**/*"]` - appropriate scope
- `exclude: ["node_modules", "dist", "out"]` - prevents build directory overlap
- No overlapping compilation paths

### ❌ preload.ts - FIXED
- **Before**: Imported types from `../renderer/types/pokemon`
- **After**: Uses `any` types to avoid cross-bundle imports

## Solution Applied

Removed the renderer type import from `preload.ts` and replaced with `any` types for the IPC bridge. This is acceptable because:

1. The preload script is just a pass-through bridge for IPC communication
2. The renderer process will cast these to proper types from `src/renderer/types/pokemon.ts`
3. This prevents the preload bundle from pulling in any renderer code
4. Maintains type safety on the renderer side where it matters

## Files Modified

- `src/main/preload.ts` - Removed renderer type imports, added documentation

## Verification Steps

1. Run `npm run dev` to start the development server
2. Open DevTools → Sources panel
3. Verify that components appear only once in the bundle
4. Test that file updates trigger hot module replacement correctly
5. Confirm that the live layout view responds to changes

## Architecture Principle

**Main process files (`src/main/`) must NEVER import from renderer files (`src/renderer/`).**

This maintains proper separation between Electron's main process, preload context, and renderer process, preventing duplicate bundling and ensuring clean hot module replacement during development.
