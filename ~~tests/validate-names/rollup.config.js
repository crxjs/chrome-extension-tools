/* eslint-env node */

import { chromeExtension } from '../../src/index'
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import typescript from 'rollup-plugin-typescript'
import { bundleImports } from 'rollup-plugin-bundle-imports'
import { join, relative } from 'path'

const pkg = require('./package.json')

const fixture = (name) =>
  relative(process.cwd(), join(__dirname, name))

const plugins = [
  chromeExtension({ pkg, verbose: false }),
  typescript(),
  bundleImports(),
  resolve({
    mainFields: ['es2015', 'module', 'main'],
  }),
  commonjs(),
]

export default {
  input: fixture('src/manifest.json'),
  output: {
    dir: fixture('dist'),
    format: 'esm',
  },
  plugins,
}
