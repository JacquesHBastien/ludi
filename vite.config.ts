/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves the site from /ludi-online/; Vercel and local dev use the root.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
