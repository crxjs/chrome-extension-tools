/* eslint-disable @typescript-eslint/explicit-function-return-type */
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { chromeExtension } from '../../../src/index'
import { getExtPath } from '../../utils'

export default {
  input: {
    'manifest': getExtPath('input-array/manifest.json'),
    'index': getExtPath('input-array/index.html'),
  },
  output: {
    dir: getExtPath('input-array-dist'),
    format: 'esm',
  },
  plugins: [chromeExtension({ verbose: false })],
}
