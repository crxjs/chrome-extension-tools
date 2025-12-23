import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import { defineConfig } from 'vite'
import manifest from './manifest.config.js'

// Alternative config: build.manifest is true, so the Vite manifest SHOULD appear in output
export default defineConfig({
  resolve: {
    alias: {
      '@': `${path.resolve(__dirname, 'src')}`,
    },
  },
  build: {
    // Explicitly set manifest to true - Vite manifest SHOULD appear in output
    manifest: true,
  },
  plugins: [crx({ manifest })],
})
