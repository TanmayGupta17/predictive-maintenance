import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    // Each test file runs in an isolated module registry so in-memory
    // singletons (sliding window store, realtime server) don't leak across files.
    isolate: true,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
