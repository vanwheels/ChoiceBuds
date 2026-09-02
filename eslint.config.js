import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  // src/renderer/_archived/** holds retired code kept for reference only
  // (see its README.md) - nothing imports from it, so it's excluded from
  // lint/type-check the same way dist/release output is.
  { ignores: ['dist/**', 'dist-electron/**', 'release/**', 'node_modules/**', 'src/renderer/_archived/**'] },
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
