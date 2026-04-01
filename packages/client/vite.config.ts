/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5180,
    proxy: {
      '/api/figma-proxy': {
        target: 'https://api.figma.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/figma-proxy/, ''),
        headers: {
          'Origin': 'https://api.figma.com',
        },
      },
      '/api': {
        target: 'http://localhost:5181',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
})
