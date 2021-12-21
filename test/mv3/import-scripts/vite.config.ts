import { chromeExtension } from '$src'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: path.join(__dirname, 'src'),
  clearScreen: false,
  build: {
    emptyOutDir: true,
    minify: false,
    outDir: path.join(__dirname, 'dist'),
  },
  plugins: [chromeExtension()],
})
