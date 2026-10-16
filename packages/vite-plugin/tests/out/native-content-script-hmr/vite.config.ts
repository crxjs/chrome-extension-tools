import { crx } from '../../plugin-testOptionsProvider'
import { defineConfig } from 'vite'
import manifest from './manifest.json'

export default defineConfig({
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest, contentScripts: { hmr: 'native' } })],
})
