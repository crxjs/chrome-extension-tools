import { defineConfig } from 'vite'
import { crx } from '../../plugin-testOptionsProvider'
import manifest from './manifest.json'

export default defineConfig({
  build: { minify: false },
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest })],
})
