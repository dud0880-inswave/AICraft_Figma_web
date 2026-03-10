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
})
