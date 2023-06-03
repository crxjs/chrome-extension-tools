import { crx, defineManifest } from '../../plugin-testOptionsProvider'
import { defineConfig } from 'vite'

const manifest = defineManifest({
  description: 'test extension',
  manifest_version: 3,
  name: 'test extension',
  content_scripts: [
    {
      matches: ['https://example.com/*'],
      js: ['src/root.ts'],
    },
  ],
  version: '1.0.0',
})

export default defineConfig({
  build: { minify: false },
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest })],
})
