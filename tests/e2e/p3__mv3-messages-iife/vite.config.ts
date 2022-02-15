import { crx, defineManifestV3 } from 'src/index'
import { defineConfig } from 'vite'
import _manifest from './manifest.json'

const manifest = defineManifestV3(_manifest)

export default defineConfig({
  build: { minify: false },
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest, format: 'iife' })],
})
