import { chromeExtension } from '$src'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: path.join(__dirname, 'src'),
  clearScreen: false,
  logLevel: 'error',
  build: {
    emptyOutDir: true,
    minify: false,
  },
  plugins: [
    chromeExtension({
      contentScriptFormat: 'iife',
    }),
  ],
  cacheDir: path.join(__dirname, '.vite'),
  optimizeDeps: {
    include: ['react', 'react-dom', '@extend-chrome/storage'],
  },
})
