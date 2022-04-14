import vue from '@vitejs/plugin-vue'
import { crx } from 'src/index'
import { defineConfig } from 'vite'
import manifest from './manifest.json'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(), crx({ manifest })],
})
