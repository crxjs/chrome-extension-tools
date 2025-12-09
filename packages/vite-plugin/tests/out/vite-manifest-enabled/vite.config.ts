import { crx } from '../../plugin-testOptionsProvider'
import { defineConfig } from 'vite'
import manifest from './manifest.json'

export default defineConfig({
  build: {
    // Explicitly set manifest to true - Vite manifest SHOULD be in output
    manifest: true,
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
