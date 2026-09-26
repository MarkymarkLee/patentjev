import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Backend (FastAPI) runs on :8000; the dev server forwards /api to it.
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
