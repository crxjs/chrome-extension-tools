import { crx } from '../../plugin-testOptionsProvider'
import { defineConfig } from 'vite'
import manifest from './manifest.config'

export default defineConfig({
  build: { minify: false },
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest, contentScripts: { standaloneFiles: ['src/content-standalone.ts'] } })],
})
