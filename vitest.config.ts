import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts on purpose - that config's Electron/Tailwind
// plugins have nothing to do with running plain unit tests, and vite's own
// `test` block would otherwise inherit them for no benefit. Only the `@`
// alias is duplicated from there in case a tested file (or a future test)
// ever imports through it.
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve('src/renderer'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
