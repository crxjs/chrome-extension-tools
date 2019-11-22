/* eslint-env node */
import { join } from 'path'
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import { chromeExtension } from '../../src/index'

import pkg from './package.json'

const fixture = (name) => join(__dirname, 'fixtures', name)

export default {
  input: fixture('src/manifest.yaml'),
  output: {
    dir: fixture('dest'),
    format: 'esm',
  },
  plugins: [
    chromeExtension({ pkg, verbose: false }),
    resolve(),
    commonjs(),
  ],
}
