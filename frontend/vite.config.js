import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' keeps the build portable (Vercel, Netlify, GitHub Pages, a static HF Space…).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 3000 },
})
