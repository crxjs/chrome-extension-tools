import UnoCSS from 'unocss/vite'
import { crx } from '../../plugin-testOptionsProvider'
import { defineConfig } from 'vite'
import manifest from './manifest.json'

export default defineConfig({
  build: { minify: false },
  clearScreen: false,
  logLevel: 'error',
  plugins: [UnoCSS(), crx({ manifest })],
})
