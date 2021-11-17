import { chromeExtension } from '$src'
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  clearScreen: false,
  logLevel: 'error',
  build: {
    minify: false,
    emptyOutDir: true,
  },
  plugins: [chromeExtension()],
  cacheDir: '.vite',
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
