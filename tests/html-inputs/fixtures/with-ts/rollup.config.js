/* eslint-env node */

import htmlInputs from '../../../../src/html-inputs'
// import emptyDir from 'rollup-plugin-empty-dir'
import typescript from 'rollup-plugin-typescript'
import { join, relative } from 'path'

const fixture = (name) =>
  relative(process.cwd(), join(__dirname, name))

module.exports = {
  input: [fixture('popup.html'), fixture('options.html')],
  output: {
    dir: fixture('dest'),
    format: 'esm',
  },
  plugins: [htmlInputs({ srcDir: fixture('') }), typescript()],
}
