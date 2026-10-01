import { defineConfig } from 'vitest/config';

/** Unit tests for the build-time scripts (scripts/**). App tests run through `ng test`. */
export default defineConfig({
  test: {
    include: ['scripts/**/*.spec.ts'],
    environment: 'node',
    globals: true,
    // The first README render pays Shiki's one-time engine and theme initialisation.
    testTimeout: 30_000,
  },
});
