/* eslint-env node */

import { join } from 'path'
import pkg from './package.json'
// import emptyOutputDir from '../../src/empty-output-dir/index'
// import htmlInputs from '../../src/html-inputs/index'
// import manifest from '../../src/manifest-input/index'
import chromeExtension from '../../src/index'

const fixture = name => join(__dirname, 'fixtures', name)

export default {
  input: fixture('src/manifest.json'),
  output: {
    dir: fixture('dest'),
    format: 'esm',
  },
  plugins: [chromeExtension({ pkg })],
}
