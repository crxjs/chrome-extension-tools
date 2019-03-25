/* eslint-env node */

import htmlInputs from '../../../../src/html-inputs/index'
import emptyOutputDir from '../../../../src/empty-output-dir/index'

export default {
  input: [
    'tests/html-inputs/fixtures/with-image/background.js',
    'tests/html-inputs/fixtures/with-image/popup.html',
    'tests/html-inputs/fixtures/with-image/content.js',
  ],
  output: {
    dir: 'tests/html-inputs/fixtures/dest',
    format: 'esm',
  },
  plugins: [htmlInputs(), emptyOutputDir()],
}
