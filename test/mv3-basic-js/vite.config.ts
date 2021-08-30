import { chromeExtension } from '$src'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig(({ command }) => ({
  root: path.join(__dirname, 'src'),
  clearScreen: false,
  logLevel: 'error',
  build: {
    minify: false,
    outDir: path.join(__dirname, 'dist-' + command),
    emptyOutDir: true,
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
}))
