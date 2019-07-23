/* eslint-env node */

import htmlInputs from '../../../../src/html-inputs'
import emptyDir from 'rollup-plugin-empty-dir'
import { join } from 'path'

const fixture = (name) =>
  join('tests/html-inputs/fixtures/watch', name)

export default {
  input: [
    fixture('popup.html'),
    fixture('options.html'),
    fixture('background.js'),
    fixture('content.js'),
  ],
  output: {
    dir: fixture('dest'),
    format: 'esm',
  },
  plugins: [htmlInputs(), emptyDir()],
}
