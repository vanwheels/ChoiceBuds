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
      // Both new in eslint-plugin-react-hooks 7.x's "recommended" preset
      // (2026-07-14 dep bump) and both fire broadly against long-standing,
      // working patterns rather than real bugs: set-state-in-effect flags
      // the standard "reset local state when a prop changes" effect used
      // throughout the app's overlay/row components, and immutability
      // flags every load-on-mount hook's useEffect(() => { loadXFromDisk() },
      // []) calling a const declared later in the same file (a hoisting-order
      // objection, not a runtime bug - the effect only runs post-mount).
      // Disabled here rather than silently reworking those hooks as a side
      // effect of a routine dependency bump - see TODO.md for the follow-up.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
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
