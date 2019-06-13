/* eslint-env node */

import { join } from 'path'
import pkg from './package.json'
import chromeExtension from '../../src/index'

import { reloader } from './reloader'

process.env.ROLLUP_WATCH = true

const fixture = (name) => join(__dirname, 'fixtures', name)

export default {
  input: fixture('src/manifest.json'),
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
      // Add reloader
      reloader,
    }),
  ],
}
