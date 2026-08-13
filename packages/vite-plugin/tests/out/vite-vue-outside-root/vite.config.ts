import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { crx } from '../../plugin-testOptionsProvider'
import manifest from './manifest.config'

export default defineConfig({
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest }), vue()],
})
