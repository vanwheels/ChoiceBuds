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
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
});


