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
