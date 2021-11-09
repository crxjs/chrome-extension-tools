import { chromeExtension } from '$src'
import { defineConfig } from 'vite'
import { xstateInspectCompat } from '../../helpers/xstateInspectCompat'

export default defineConfig({
  root: 'src',
  clearScreen: false,
  logLevel: 'error',
  build: {
    minify: false,
    emptyOutDir: true,
  },
  plugins: [xstateInspectCompat(), chromeExtension()],
  cacheDir: '../.vite',
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
