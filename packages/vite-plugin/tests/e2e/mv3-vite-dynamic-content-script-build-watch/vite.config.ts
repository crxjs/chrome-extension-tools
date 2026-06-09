import { crx } from '../../plugin-testOptionsProvider'
import { defineConfig } from 'vite'
import manifest from './manifest.json'

export default defineConfig({
  build: { minify: false, watch: {} },
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest })],
})
