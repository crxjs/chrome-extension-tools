import { chromeExtension } from '$src'
import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => ({
  root: path.join(__dirname, 'src'),
  clearScreen: false,
  logLevel: 'error',
  build: {
    minify: false,
    emptyOutDir: true,
  },
  plugins: [chromeExtension(), react()],
  cacheDir: path.join(__dirname, '.vite'),
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
}))
