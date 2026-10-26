/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves the site from /ludi-online/; Vercel and local dev use the root.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    // The game, plus the dice lab (/dice/) and kill lab (/smack/) test pages.
    rollupOptions: { input: { main: 'index.html', dice: 'dice/index.html', smack: 'smack/index.html' } },
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
