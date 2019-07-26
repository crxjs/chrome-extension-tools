/* eslint-env node */

import { join } from 'path'
import pkg from './package.json'
import { chromeExtension } from '../../src/index'

const fixture = (name) => join(__dirname, 'fixtures', name)

export default {
  input: fixture('src/manifest.json'),
  manualChunks: {
    bg: [fixture('src/bg-chunk.js')],
    ct: [fixture('src/ct-chunk.js')],
  },
  output: {
    dir: fixture('dest'),
    format: 'esm',
  },
  plugins: [
    chromeExtension({
      // Required if run outside npm
      pkg,
      // Permissions
      permissions: {
        include: ['**/*'],
        exclude: ['**/background.js'],
      },
      verbose: false,
    }),
  ],
}
