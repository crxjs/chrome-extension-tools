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
    rollupOptions: {
      input: path.join(__dirname, 'src', 'manifest.json'),
      output: {
        // TODO: set entryFileNames in options hook
        //  - vite produces an invalid build w/o entryFileNames
        entryFileNames: '[name].js',
      },
    },
  },
  plugins: [chromeExtension()],
  cacheDir: path.join(__dirname, '.vite'),
  optimizeDeps: {
    include: ['react', 'react-dom', '@extend-chrome/storage'],
  },
})
