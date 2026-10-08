import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative asset paths so the build works from any sub-path (e.g. GitHub Pages' /weave-patterner/).
  base: './',
  plugins: [react()],
  // The 3D preview and tablet weaving load on demand. Prepare their dependencies when the dev server starts, so it
  // doesn't discover them on first use and reload the page (closing the dialog that asked for them).
  optimizeDeps: {
    include: [
      'three',
      'three/examples/jsm/controls/OrbitControls.js',
      'three/examples/jsm/environments/RoomEnvironment.js',
      'three/examples/jsm/geometries/RoundedBoxGeometry.js',
      '@mui/icons-material/Close',
      '@mui/icons-material/Download',
      '@mui/icons-material/Flip',
      '@mui/icons-material/PlayArrow',
      '@mui/icons-material/RestartAlt',
      '@mui/icons-material/Stop',
    ],
  },
})
