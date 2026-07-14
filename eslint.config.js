import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'dist-electron/**', 'release/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ...reactHooks.configs.flat.recommended,
    files: ['src/renderer/**/*.{ts,tsx}'],
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
    },
  },
  {
    // Every data-loading hook shares one idiom: a `load*FromDisk`/
    // `initializeCacheWithSWR` async function that synchronously sets
    // isLoading/error at its own top (before its first await), called both
    // from a mount useEffect AND reused later by a manually-triggered
    // `refresh*()` (not itself called from an effect, so not flagged there).
    // A real fix needs splitting each into an effect-safe silent variant and
    // a refresh variant that resets loading state - a bigger, riskier change
    // to the core data-loading pattern of nearly every hook in the app than
    // fits a routine lint-rule cleanup pass (2026-07-14 investigation found
    // 13 files affected in total, not the ~4 originally scoped - see
    // TODO.md). The 7 simpler "reset derived state when a dependency
    // changes" cases were fixed for real (render-time reset instead of an
    // effect); these 5 load-on-mount hooks, plus useSync.ts's refreshStatus
    // (same shape - synchronously sets status in an early-return branch
    // before any await), are deliberately left disabled pending that bigger
    // dedicated pass.
    files: [
      'src/renderer/hooks/useTeams.ts',
      'src/renderer/hooks/useSettings.ts',
      'src/renderer/hooks/useSavedPokemon.ts',
      'src/renderer/hooks/useBattles.ts',
      'src/renderer/hooks/useDatabase.ts',
      'src/renderer/hooks/useSync.ts',
    ],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['src/main/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
  {
    // preload.ts intentionally types its IPC payloads as `any` to avoid
    // importing renderer types into the preload bundle - see CLAUDE.md's
    // "Process split (Electron)" section for why.
    files: ['src/main/preload.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  }
);
