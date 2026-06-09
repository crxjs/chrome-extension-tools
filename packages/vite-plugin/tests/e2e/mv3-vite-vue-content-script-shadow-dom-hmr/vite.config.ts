import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { crx } from '../../plugin-testOptionsProvider'
import manifest from './manifest.json'

export default defineConfig({
  build: { minify: false },
  clearScreen: false,
  logLevel: 'error',
  plugins: [vue(), crx({ manifest, contentScripts: { shadowDom: true } })],
})
