/* eslint-disable @typescript-eslint/explicit-function-return-type */
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { chromeExtension } from '../../../src'
import { getExtPath } from '../../utils'

export default {
  input: getExtPath('browser-polyfill/manifest.json'),
  output: {
    dir: getExtPath('browser-polyfill-dist'),
    format: 'esm',
  },
  plugins: [
    chromeExtension({ verbose: false, browserPolyfill: true }),
    typescript(),
    resolve(),
    commonjs(),
  ],
}
