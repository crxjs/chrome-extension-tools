/* eslint-env node */

import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

import chromeExtension from '../../../../src/index'
import pkg from './package.json'

export default {
  input: 'tests/clip-selector/fixtures/src/manifest.json',
  output: {
    dir: 'tests/clip-selector/fixtures/dest',
    format: 'async-iife',
    sourcemap: true,
  },
  plugins: [
    chromeExtension({ pkg }),
    resolve(),
    commonjs(),
  ].flat(),
}
