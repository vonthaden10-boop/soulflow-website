import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // All /api/* requests from the dev server are forwarded to Express.
      // This avoids CORS entirely and ensures requests never hit the Vite
      // SPA fallback (which returns index.html for unknown routes).
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
