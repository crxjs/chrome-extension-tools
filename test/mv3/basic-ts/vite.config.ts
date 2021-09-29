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
    sourcemap: 'inline',
    outDir: path.join(__dirname, 'dist'),
    rollupOptions: {
      input: path.join(__dirname, 'src', 'manifest.json'),
    },
  },
  plugins: [chromeExtension()],
  cacheDir: path.join(__dirname, '.vite'),
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
})
