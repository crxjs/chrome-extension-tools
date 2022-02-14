import { crx, defineManifestV3 } from 'src/index'
import { defineConfig } from 'vite'

const manifest = defineManifestV3({
  manifest_version: 3,
  action: { default_popup: 'src/popup.html' },
  name: 'test extension',
  version: '1.0.0',
})

export default defineConfig({
  build: { minify: false },
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest })],
})
