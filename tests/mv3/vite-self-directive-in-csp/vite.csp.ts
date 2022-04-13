import { crx } from 'src/.'
import { defineConfig } from 'vite'
import manifest from './manifest-csp.json'

export default defineConfig({
  build: {
    minify: false,
    rollupOptions: {
      output: {
        // the hash randomly changes between environments
        assetFileNames: 'assets/[name].hash.[ext]',
        chunkFileNames: 'assets/[name].hash.js',
        entryFileNames: 'assets/[name].hash.js',
      },
    },
  },
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest })],
})
