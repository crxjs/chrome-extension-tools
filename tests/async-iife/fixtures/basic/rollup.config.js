/* eslint-env node */

import manifestInput from '../../../../src/manifest-input'
import htmlInputs from '../../../../src/html-inputs'

export default {
  input: 'tests/async-iife/fixtures/basic/manifest.json',
  output: {
    dir: 'tests/async-iife/fixtures/dest',
    format: 'esm',
  },
  plugins: [manifestInput(), htmlInputs()],
}
