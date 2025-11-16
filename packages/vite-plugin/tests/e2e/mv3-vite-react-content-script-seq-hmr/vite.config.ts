import react from '@vitejs/plugin-react'
import { crx } from '../../plugin-testOptionsProvider'
import { defineConfig } from 'vite'
import manifest from './manifest.json'

const { preambleCode } = react


export default defineConfig({
  build: { minify: false },
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest, contentScripts: { preambleCode } }), react()],
})
