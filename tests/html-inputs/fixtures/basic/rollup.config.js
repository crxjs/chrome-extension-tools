/* eslint-env node */

import htmlInputs from '../../../../src/html-inputs'
import emptyOutputDir from '../../../../src/empty-output-dir'

export default {
  input: [
    'tests/html-inputs/fixtures/basic/popup.html',
    'tests/html-inputs/fixtures/basic/options.html',
    'tests/html-inputs/fixtures/basic/background.js',
    'tests/html-inputs/fixtures/basic/content.js',
  ],
  output: {
    dir: 'tests/fixtures/dest',
    format: 'esm',
  },
  plugins: [htmlInputs(), emptyOutputDir()],
}
