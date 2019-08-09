/* eslint-env node */

import { join } from 'path'
import pkg from './package.json'
import { chromeExtension } from '../../src/index'

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
      // Include or exclude files
      // from which to derive permissions
      // permissions: {
      //   include: ['**/src/**/*', '**/@bumble/**/*'],
      // },
      verbose: false,
    }),
  ],
}
