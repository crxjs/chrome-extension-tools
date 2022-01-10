import { chromeExtension } from '$src'
import path from 'path'
import { defineConfig } from 'vite'

process.chdir(__dirname)

export default defineConfig({
  root: __dirname,
  clearScreen: false,
  logLevel: 'error',
  build: {
    minify: false,
    emptyOutDir: true,
  },
  plugins: [chromeExtension()],
  cacheDir: path.join(__dirname, '.vite'),
  publicDir: 'public',
})
