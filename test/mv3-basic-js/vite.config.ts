import { chromeExtension } from '$src'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: path.join(__dirname, 'src'),
  build: {
    minify: false,
    outDir: path.join(__dirname, 'dist'),
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
})
