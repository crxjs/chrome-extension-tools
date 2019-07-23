/* eslint-env node */

import htmlInputs from '../../../../src/html-inputs/index'
import emptyDir from 'rollup-plugin-empty-dir'

import { join } from 'path'

const fixture = (name) =>
  join('tests/html-inputs/fixtures/with-image', name)

export default {
  input: [
    fixture('background.js'),
    fixture('popup.html'),
    fixture('content.js'),
  ],
  output: {
    dir: fixture('dest'),
    format: 'esm',
  },
  plugins: [htmlInputs(), emptyDir()],
}
