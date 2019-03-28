/* eslint-env node */

import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

import chromeExtension from '../../../src/index'
import pkg from './package.json'

export default {
  input: 'tests/clip-64/fixtures/src/manifest.json',
  output: {
    dir: 'tests/clip-64/fixtures/dest',
    format: 'esm',
  },
  plugins: [
    chromeExtension({ pkg }),
    resolve(),
    commonjs(),
  ].flat(),
}
