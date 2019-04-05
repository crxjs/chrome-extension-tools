/* eslint-env node */
import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'

import chromeExtension from '../../src/index'
import pkg from './package.json'
import { join } from 'path'

const fixture = name => join('tests/clip-64/fixtures', name)

export default {
  input: fixture('src/manifest.json'),
  output: {
    dir: fixture('dest'),
    format: 'esm',
  },
  plugins: [chromeExtension({ pkg }), resolve(), commonjs()],
}
