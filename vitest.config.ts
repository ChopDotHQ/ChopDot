import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage',
      thresholds: {
        statements: 55,
        branches: 45,
        functions: 55,
        lines: 55,
      },
    },
  },
});
