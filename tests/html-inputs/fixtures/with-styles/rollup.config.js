/* eslint-env node */

import htmlInputs from '../../../../src/html-inputs'
import emptyOutputDir from '../../../../src/empty-output-dir'
import { join } from 'path'

const fixture = name =>
  join('tests/html-inputs/fixtures/with-styles', name)

export default {
  input: [
    fixture('popup.html'),
    fixture('background.js'),
    fixture('content.js'),
  ],
  output: {
    dir: fixture('dest'),
    format: 'esm',
  },
  plugins: [htmlInputs(), emptyOutputDir()],
}
