import { chromeExtension } from '$src'
import { defineConfig } from 'vite'

process.chdir(__dirname)

export default defineConfig({
  root: 'src',
  clearScreen: false,
  build: {
    minify: false,
  },
  plugins: [chromeExtension()],
  optimizeDeps: {
    include: [],
  },
})
