/* eslint-env node */

import { join } from 'path'
import pkg from '../../../../package.json'
import emptyOutputDir from '../../../../src/empty-output-dir/index'
import htmlInputs from '../../../../src/html-inputs/index'
import manifest from '../../../../src/manifest-input/index'

const fixture = name =>
  join('tests/manifest-input/fixtures/basic', name)

export default {
  input: fixture('manifest.json'),
  output: {
    dir: fixture('dest'),
    format: 'esm',
  },
  plugins: [manifest({ pkg }), htmlInputs(), emptyOutputDir()],
}
