import { crx, defineManifestV3 } from 'src/index'
import { defineConfig } from 'vite'

const manifest = defineManifestV3({
  background: {
    service_worker: 'src/background.ts',
  },
  content_scripts: [
    {
      js: ['src/declared-script.ts'],
      matches: ['https://a.com/*', 'http://b.com/*'],
    },
  ],
  manifest_version: 3,
  name: 'test extension',
  version: '1.0.0',
})

export default defineConfig({
  build: { minify: false },
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest })],
})