import { crx } from '@crxjs/vite-plugin'
import { defineConfig } from 'vite-plus'
import zip from 'vite-plugin-zip-pack'
import manifest from './manifest.config.js'
import { name, version } from './package.json'

export default defineConfig({
  fmt: {
    singleQuote: true,
    semi: false,
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  plugins: [
    crx({ manifest }),
    zip({ outDir: 'release', outFileName: `crx-${name}-${version}.zip` }),
  ],
  server: {
    cors: {
      origin: [/chrome-extension:\/\//],
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
})
