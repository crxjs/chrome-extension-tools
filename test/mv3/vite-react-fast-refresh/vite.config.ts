import { chromeExtension } from '$src'
import { xstateInspectCompat } from '$test/helpers/xstateInspectCompat'
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
  plugins: [xstateInspectCompat(), chromeExtension(), react()],
  cacheDir: path.join(__dirname, '.vite'),
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
}))
