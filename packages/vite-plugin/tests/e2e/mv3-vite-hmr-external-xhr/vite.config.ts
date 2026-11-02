import { crx } from '../../plugin-testOptionsProvider'
import { defineConfig } from 'vite'
import manifest from './manifest.json'
import react from '@vitejs/plugin-react'

const { preambleCode } = react

export default defineConfig({
  define: {
    __TEST_API_URL__: JSON.stringify(
      process.env.CRX_TEST_API_URL ?? 'http://mock-api-route.test/',
    ),
  },
  build: { minify: false },
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest, contentScripts: { preambleCode } }), react()],
})
