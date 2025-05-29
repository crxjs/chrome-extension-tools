import { defineConfig } from 'vite'
import { crx, defineManifest } from '@crxjs/vite-plugin'

const manifest = defineManifest({
  manifest_version: 3,
  name: 'WebSocket HMR Test',
  version: '1.0.0',
  description: 'Test extension for WebSocket-based HMR',
  background: {
    service_worker: 'src/background.ts',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content.ts'],
    },
  ],
  action: {
    default_popup: 'src/popup.html',
  },
})

export default defineConfig({
  plugins: [crx({ manifest })],
  server: {
    port: 5173,
    hmr: {
      port: 5173,
    },
  },
})
