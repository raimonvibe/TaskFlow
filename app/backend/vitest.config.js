import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: '.',
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    globalSetup: ['./src/test/globalSetup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Floors sit a point or two under the measured baseline after the
      // empty-due-date tests landed (docs/NEXT_STEPS.md item 2). Raise when
      // coverage grows; do not set above current reality.
      thresholds: {
        statements: 93,
        branches: 81,
        functions: 95,
        lines: 93,
      },
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.test.ts',
        '**/*.config.js',
        // Standalone entrypoints: run by `npm run db:init` / `npm run seed`
        // and by the deploy, not importable as units.
        'src/main.ts',
        'src/database/**',
        'src/composition/scriptContext.ts',
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
