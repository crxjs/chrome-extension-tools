import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { crx } from '../../plugin-testOptionsProvider'
import manifest from './manifest.json'

const { preambleCode } = react
const liveReload = process.env.CRXJS_TEST_I18NEXT_LIVE_RELOAD !== 'false'

export default defineConfig({
  build: { minify: false },
  clearScreen: false,
  logLevel: 'error',
  plugins: [
    crx({
      manifest,
      contentScripts: { preambleCode },
      liveReload,
    }),
    react(),
  ],
})
