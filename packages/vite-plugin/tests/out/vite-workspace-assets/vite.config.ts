import { fileURLToPath } from 'url'
import { dirname, resolve } from 'pathe'
import { defineConfig } from 'vite'
import { crx } from '../../plugin-testOptionsProvider'
import manifest from './manifest.json'

const root = dirname(fileURLToPath(import.meta.url))
const sharedAssetsRoot = resolve(root, '../vite-workspace-assets-shared')

export default defineConfig({
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest })],
  resolve: {
    alias: {
      '@workspace/shared-assets': sharedAssetsRoot,
    },
  },
  server: {
    fs: {
      allow: [root, sharedAssetsRoot],
    },
  },
})
