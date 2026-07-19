import { defineConfig } from 'vitest/config';

// Separate from vite.config.ts on purpose: unit tests here are pure-function
// tests over src/lib (no React rendering, no build-mode toggles to inherit).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
