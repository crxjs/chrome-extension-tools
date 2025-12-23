import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import { defineConfig } from 'vite'
import manifest from './manifest.config.js'

// Default config: build.manifest is NOT set (or false), so the Vite manifest should be removed
export default defineConfig({
  resolve: {
    alias: {
      '@': `${path.resolve(__dirname, 'src')}`,
    },
  },
  build: {
    // Explicitly set manifest to false - Vite manifest should NOT appear in output
    manifest: false,
  },
  plugins: [crx({ manifest })],
})
