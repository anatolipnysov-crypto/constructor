import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash]-v20260711a.js',
        chunkFileNames: 'assets/[name]-[hash]-v20260711a.js',
        assetFileNames: 'assets/[name]-[hash]-v20260711a[extname]',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
