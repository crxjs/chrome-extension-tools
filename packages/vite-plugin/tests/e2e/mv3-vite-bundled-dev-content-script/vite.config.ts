import { crx } from '../../plugin-testOptionsProvider'
import { defineConfig, type UserConfig } from 'vite'
import manifest from './manifest.json'

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
  plugins: [crx({ manifest })],
}

export default defineConfig(config)
