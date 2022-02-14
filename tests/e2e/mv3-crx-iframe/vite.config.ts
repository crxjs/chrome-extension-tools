import { crx, defineManifestV3 } from 'src/index'
import { defineConfig } from 'vite'

const manifest = defineManifestV3({
  background: {
    service_worker: 'src/background.ts',
  },
  description: 'test extension',
  manifest_version: 3,
  name: 'test extension',
  options_page: 'src/options.html',
  version: '1.0.0',
})

export default defineConfig({
  build: {
    minify: false,
    rollupOptions: {
      input: ['src/iframe.html'],
    },
  },
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest })],
})
