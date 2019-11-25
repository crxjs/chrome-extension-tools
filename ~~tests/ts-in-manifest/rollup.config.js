/* eslint-env node */
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import typescript from 'rollup-plugin-typescript'

import { chromeExtension } from '../../src/index'
import pkg from './package.json.js'
import { join } from 'path'

const fixture = (name) => join(__dirname, 'fixtures', name)

export default {
  input: fixture('src/manifest.json'),
  output: {
    dir: fixture('dest'),
    format: 'esm',
  },
  plugins: [
    chromeExtension({ pkg, verbose: false }),
    typescript(),
    resolve(),
    commonjs(),
  ],
  external: ['@bumble/messages', '@bumble/chrome-rxjs'],
}
