import { chromeExtension } from '$src'
import { xstateInspectCompat } from '$test/helpers/xstateInspectCompat'
import path from 'path'
import { defineConfig } from 'vite'
import inspect from 'vite-plugin-inspect'

export default defineConfig({
  root: path.join(__dirname, 'src'),
  clearScreen: false,
  logLevel: 'error',
  build: {
    minify: false,
    emptyOutDir: true,
  },
  plugins: [inspect(), xstateInspectCompat(), chromeExtension()],
  // TODO: set cacheDir for all vite serve tests
  cacheDir: path.join(__dirname, '.vite'),
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  envDir: '..',
})
