// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // rewrite: (path) => path, // giữ nguyên /api (vì Nest đã setGlobalPrefix('api'))
      },
    },
  },
  plugins: [react()],
})
