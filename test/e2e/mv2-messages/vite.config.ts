import { chromeExtension } from '$src'
import { defineConfig } from 'vite'
import { join } from 'path'

export default defineConfig({
  root: 'src',
  clearScreen: false,
  logLevel: 'error',
  build: {
    emptyOutDir: true,
    minify: false,
  },
  plugins: [chromeExtension()],
  cacheDir: join(process.cwd(), '.vite'),
  optimizeDeps: {
    include: ['react', 'react-dom', '@extend-chrome/storage'],
  },
})
