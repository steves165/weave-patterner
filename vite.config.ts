import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative asset paths so the build works from any sub-path (e.g. GitHub Pages' /weave-patterner/).
  base: './',
  plugins: [react()],
})
