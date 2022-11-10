import { crx } from '../../plugin-testOptionsProvider'
import { defineConfig } from 'vite'
import manifest from './manifest.config'

export default defineConfig({
  build: {
        rollupOptions: {
      output: {
        // the hash randomly changes between environments
        assetFileNames: 'assets/[name].hash[hash].[ext]',
        chunkFileNames: 'assets/[name].hash[hash].js',
        entryFileNames: 'assets/[name].hash[hash].js',
      },
    },
  },
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest })],
})
