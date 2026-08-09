import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true, // Needed for Docker
    watch: {
      usePolling: true // Needed for Docker on some systems
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable for smaller bundle size
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            /[/\\]node_modules[/\\](?:react|react-dom|react-router)(?:[/\\]|$)/.test(
              id
            )
          ) {
            return 'react-vendor'
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Floors sit a point or two under the measured baseline. Raise when
      // coverage grows; do not set above current reality.
      thresholds: {
        statements: 84,
        branches: 65,
        functions: 94,
        lines: 84,
      },
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{js,jsx,ts,tsx}',
        '**/*.config.js',
        'dist/',
      ],
    },
  },
})
