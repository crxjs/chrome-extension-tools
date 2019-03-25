/* eslint-env node */

import htmlInputs from '../../../../src/html-inputs'
import emptyOutputDir from '../../../../src/empty-output-dir'

export default {
  input: [
    'tests/html-inputs/fixtures/with-assets/popup.html',
    'tests/html-inputs/fixtures/with-assets/background.js',
    'tests/html-inputs/fixtures/with-assets/content.js',
  ],
  output: {
    dir: 'tests/html-inputs/fixtures/dest',
    format: 'esm',
  },
  plugins: [htmlInputs(), emptyOutputDir()],
}
