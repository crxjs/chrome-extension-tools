/* eslint-env node */

import manifest from '../../../../src/manifest-input/index'
import htmlInputs from '../../../../src/html-inputs/index'
import emptyOutputDir from '../../../../src/empty-output-dir/index'
import { join } from 'path'

const fixture = name =>
  join('tests/manifest-input/fixtures/basic', name)

export default {
  input: fixture('manifest.json'),
  output: {
    dir: fixture('dest'),
    format: 'esm',
  },
  plugins: [manifest(), htmlInputs(), emptyOutputDir()],
}
