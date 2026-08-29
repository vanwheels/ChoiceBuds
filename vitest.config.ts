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
    // jsdom (not 'node') because hooks tests render real React effects/refs
    // against a DOM - the plain-function tests (services/utils) run fine
    // under it too, so one shared environment is simpler than splitting by
    // glob. setupFiles stubs window.electron (normally injected by
    // preload.ts's contextBridge, absent under jsdom) before every test.
    environment: 'jsdom',
    setupFiles: ['./src/renderer/test/setupElectronMock.ts'],
    include: ['src/**/*.test.ts'],
  },
});
