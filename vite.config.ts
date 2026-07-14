/**
 * Vite Configuration
 * Configures Vite for React development with Electron
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Seamlessly injects Tailwind v4 without requiring postcss.config.js
    electron({
      main: {
        entry: 'src/main/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      preload: {
        input: 'src/main/preload.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['electron'],
              output: {
                format: 'es',
              },
            },
          },
        },
      },
    }),
  ],
  root: '.',
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    // CalcPage's own lazy chunk (~507kB) sits just over Vite's 500kB default
    // warning threshold - almost entirely @smogon/calc's bundled move/species/
    // ability data tables, which have no subpath exports to tree-shake by
    // generation (confirmed by reading its package.json/dist layout directly).
    // Already behind React.lazy() so it's only fetched when the Calc tab
    // opens - raising the threshold acknowledges an expected, harmless size
    // rather than silencing a real regression warning.
    chunkSizeWarningLimit: 550,
  },
  server: {
    port: 5173,
    strictPort: true,
    // Vite's watcher otherwise covers the whole project root (only
    // node_modules/.git are excluded by default) - .claude/skills/run-desktop
    // writes screenshots into its own shots/ dir on every automated test run,
    // and since PNGs aren't part of the module graph, Vite falls back to a
    // full page reload, wiping in-progress renderer state mid-session.
    watch: {
      ignored: ['**/.claude/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
});


