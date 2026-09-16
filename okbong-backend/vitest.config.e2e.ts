import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.e2e-spec.ts', 'src/**/*.e2e-spec.ts'],
    passWithNoTests: true,
    testTimeout: 15000,
    hookTimeout: 15000,
    sequence: { concurrent: false },
  },
});
