import { chromeExtension } from '$src'
import { xstateInspectCompat } from '$test/helpers/xstateInspectCompat'
import path from 'path'
import { defineConfig } from 'vite'

process.chdir(__dirname)

export default defineConfig({
  root: 'src',
  clearScreen: false,
  logLevel: 'error',
  build: {
    minify: false,
    emptyOutDir: true,
  },
  plugins: [xstateInspectCompat(), chromeExtension()],
  cacheDir: path.join(__dirname, '.vite'),
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
