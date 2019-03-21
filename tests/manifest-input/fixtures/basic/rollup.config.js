/* eslint-env node */

import manifest from '../../../../src/manifest-input/index'
import htmlInputs from '../../../../src/html-inputs'
import emptyOutputDir from '../../../../src/empty-output-dir'

export default {
  input: 'tests/manifest-input/fixtures/basic/manifest.json',
  output: {
    dir: 'tests/manifest-input/fixtures/dest',
    format: 'esm',
  },
  plugins: [manifest(), htmlInputs(), emptyOutputDir()],
}
