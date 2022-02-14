import { crx } from 'src/index'
import { defineConfig } from 'vite'
import _manifest from './manifest.json'

const manifest = _manifest as ManifestV3

export default defineConfig({
  build: { minify: false },
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest })],
})
