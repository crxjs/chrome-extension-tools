/* eslint-env node */

import htmlInputs from '../../../../src/html-inputs'
// import emptyDir from 'rollup-plugin-empty-dir'
import typescript from 'rollup-plugin-typescript'
import { join } from 'path'

const fixture = (name) => join(__dirname, name)

export default {
  input: [fixture('popup.html'), fixture('options.html')],
  output: {
    dir: fixture('dest'),
    format: 'esm',
  },
  plugins: [htmlInputs(), typescript()],
}
