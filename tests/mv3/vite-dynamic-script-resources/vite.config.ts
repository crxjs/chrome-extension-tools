import { crx, defineManifestV3, defineDynamicResource } from 'src/index'
import { defineConfig } from 'vite'

const manifest = defineManifestV3({
  background: {
    service_worker: 'src/background.ts',
  },
  description: 'test extension',
  manifest_version: 3,
  name: 'test extension',
  version: '1.0.0',
  web_accessible_resources: [
    defineDynamicResource({
      matches: ['https://google.com/*', 'https://github.com/*'],
    }),
  ],
})

export default defineConfig({
  build: { minify: false },
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest })],
})
