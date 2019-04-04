/* eslint-env node */

import manifestInput from '../../../../src/manifest-input'
import htmlInputs from '../../../../src/html-inputs'
import { join } from 'path'

const fixture = name => join('tests/async-iife/fixtures', name)

export default {
  input: fixture('basic/manifest.json'),
  output: {
    dir: fixture('dest'),
    format: 'esm',
  },
  plugins: [manifestInput(), htmlInputs()],
}
