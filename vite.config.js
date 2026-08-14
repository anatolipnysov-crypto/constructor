import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { transformConstructorAppSource } from './src/buildTransforms/atmospaceBotFirst.js'

function atmospaceBotFirstTransform() {
  return {
    name: 'atmospace-bot-first-constructor',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = String(id || '').replaceAll('\\', '/')
      if (!normalizedId.endsWith('/src/App.jsx')) return null
      return {
        code: transformConstructorAppSource(code),
        map: null,
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [atmospaceBotFirstTransform(), react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name]-[hash]-v20260725-clean.js',
        chunkFileNames: 'assets/[name]-[hash]-v20260725-clean.js',
        assetFileNames: 'assets/[name]-[hash]-v20260725-clean[extname]',
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
