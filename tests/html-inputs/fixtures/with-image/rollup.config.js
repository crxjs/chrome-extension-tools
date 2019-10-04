/* eslint-env node */

import htmlInputs from '../../../../src/html-inputs/index'
import emptyDir from 'rollup-plugin-empty-dir'

import { join, relative } from 'path'

const fixture = (name) =>
  relative(process.cwd(), join(__dirname, name))

module.exports = {
  input: [
    fixture('background.js'),
    fixture('popup.html'),
    fixture('content.js'),
  ],
  output: {
    dir: fixture('dest'),
    format: 'esm',
  },
  plugins: [htmlInputs({ srcDir: fixture('') }), emptyDir()],
}
