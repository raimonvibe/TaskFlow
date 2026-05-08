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
            /[/\\]node_modules[/\\](?:react|react-dom|react-router-dom)(?:[/\\]|$)/.test(
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
    setupFiles: './src/test/setup.js',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.test.{js,jsx}',
        '**/*.config.js',
        'dist/',
      ],
    },
  },
})
