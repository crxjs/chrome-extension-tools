import { chromeExtension } from '$src'
import { defineConfig } from 'vite'

process.chdir(__dirname)

export default defineConfig({
  root: 'src',
  clearScreen: false,
  logLevel: 'error',
  build: {
    minify: false,
    emptyOutDir: true,
  },
  plugins: [chromeExtension()],
})
