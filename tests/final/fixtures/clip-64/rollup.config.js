/* eslint-env node */

import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

import chromeExtension from '../../../../src/index'
import pkg from './package.json'

export default {
  input: 'tests/final/fixtures/clip-64/manifest.json',
  output: {
    dir: 'tests/final/fixtures/dest',
    format: 'esm',
  },
  plugins: [
    ...chromeExtension({ pkg }),
    resolve(),
    commonjs()
  ],
}
