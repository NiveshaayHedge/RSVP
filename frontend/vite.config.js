import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development, Vite serves the React app on :5173 and forwards /api/* to the Python backend.
const apiPort = process.env.API_PORT || 3000

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': `http://localhost:${apiPort}` } },
  build: { outDir: 'dist', emptyOutDir: true },
})
