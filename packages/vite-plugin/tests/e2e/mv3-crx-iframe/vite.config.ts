import { crx, defineManifest } from '../../plugin-testOptionsProvider'
import { defineConfig } from 'vite'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path/posix'

const __dirname = dirname(fileURLToPath(import.meta.url))

const manifest = defineManifest({
  background: {
    service_worker: 'src/background.ts',
  },
  description: 'test extension',
  manifest_version: 3,
  name: 'test extension',
  options_page: 'src/options.html',
  version: '1.0.0',
})

export default defineConfig({
  build: {
    minify: false,
    rollupOptions: {
      // input needs to be absolute b/c vitest doesn't support process.chdir
      input: ['src/iframe.html'].map((f) => join(__dirname, f)),
    },
  },
  clearScreen: false,
  logLevel: 'error',
  plugins: [crx({ manifest })],
})
