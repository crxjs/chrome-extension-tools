import { chromeExtension } from '$src'
import { xstateInspectCompat } from '$test/helpers/xstateInspectCompat'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: path.join(__dirname, 'src'),
  clearScreen: false,
  logLevel: 'error',
  build: {
    minify: false,
    emptyOutDir: true,
    rollupOptions: {
      input: path.join(__dirname, 'src', 'manifest.json'),
    },
  },
  plugins: [xstateInspectCompat(), chromeExtension()],
  // TODO: set cacheDir for all vite serve tests
  cacheDir: path.join(__dirname, '.vite'),
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
