import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: '.',
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.js', 'src/**/*.spec.js', 'src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    globalSetup: ['./src/test/globalSetup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.js',
        '**/*.test.ts',
        '**/*.config.js',
        'src/database/seed.js',
        // Phase 1 placeholder marker files (docs/BACKEND_REWRITE_PLAN.md) -
        // `export {}` with nothing to cover.
        'src/domain/index.ts',
        'src/application/index.ts',
        'src/infrastructure/index.ts',
        'src/presentation/index.ts',
        'src/composition/container.ts',
      ],
    },
    setupFiles: [],
    testTimeout: 10000,
  },
})
