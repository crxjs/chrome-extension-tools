import react from '@vitejs/plugin-react'
import { crx } from '../../plugin-testOptionsProvider'
import { defineConfig, type UserConfig } from 'vite'
import manifest from './manifest.json'

const { preambleCode } = react

type BundledDevConfig = UserConfig & {
  experimental: {
    bundledDev: boolean
  }
}

const config: BundledDevConfig = {
  build: { minify: false },
  clearScreen: false,
  experimental: {
    bundledDev: true,
  },
  logLevel: 'error',
  plugins: [crx({ manifest, contentScripts: { preambleCode } }), react()],
}

export default defineConfig(config)
