import { crx } from '../../plugin-testOptionsProvider'
import { defineConfig } from 'vite'
import manifest from './manifest.json'

export default defineConfig({
  build: {
    // Explicitly set manifest to false to test that it gets removed
    manifest: false,
    minify: false,
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
