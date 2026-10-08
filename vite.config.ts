import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // Relative asset paths so the build works from any sub-path (e.g. GitHub Pages' /weave-patterner/).
  base: './',
  plugins: [react()],
  build: {
    // The largest file is the 3D preview (three.js), which loads only when it's opened.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      // Two pages: Weave Patterner, and Knit Patterner at knit/. The main entry keeps the name "index" (CI looks for
      // its bundle to know when a deploy is live).
      input: { index: 'index.html', knit: 'knit/index.html' },
      output: {
        // React and MUI change rarely: in their own files, browsers keep them cached across deploys and only fetch
        // the app's own code again.
        manualChunks(id) {
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          if (/node_modules\/(@mui|@emotion|@popperjs|stylis)\//.test(id)) return 'mui'
        },
      },
    },
  },
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
