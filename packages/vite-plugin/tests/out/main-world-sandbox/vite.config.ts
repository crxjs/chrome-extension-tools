import { defineConfig } from 'vite'
import { crx } from '../../plugin-testOptionsProvider'
import manifest from './manifest.json'

export default defineConfig({
  build: {
    minify: false,
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].hash[hash].[ext]',
        chunkFileNames: 'assets/[name].hash[hash].js',
        entryFileNames: 'assets/[name].hash[hash].js',
      },
    },
  },
  plugins: [crx({ manifest })],
})
