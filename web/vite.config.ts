/**
 * Vite Configuration - Web build
 * Separate from the root vite.config.ts on purpose - that config's Electron
 * plugin has no equivalent here, and this entry point (web/index.html +
 * main.tsx) lives outside the Electron renderer's implicit root. Shares the
 * root package.json's node_modules (React, Tailwind, etc.) rather than a
 * standalone package.json like worker/ has - worker/ is a genuinely
 * separate Cloudflare runtime, this is just an alternate front door onto
 * the same renderer code.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: path.resolve(__dirname, '.'),
  publicDir: path.resolve(__dirname, '../public'),
  base: './',
  build: {
    outDir: path.resolve(__dirname, '../dist/web'),
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src/renderer'),
    },
  },
});
