import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // En dev (npm run dev), /api est redirigé vers la stack Docker lancée sur le port 8088.
  server: { proxy: { '/api': 'http://localhost:8088' } },
})
