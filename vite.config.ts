import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Deploy base: '/' locally, '/vidora/' on GitHub Pages (project site).
  // The Pages workflow sets VITE_BASE=/vidora/ at build time; local
  // dev/preview keep the default so nothing else changes.
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
  },
});
