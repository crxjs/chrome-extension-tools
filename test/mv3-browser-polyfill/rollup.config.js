/* eslint-disable @typescript-eslint/explicit-function-return-type */
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { chromeExtension } from '../../../src'
import { getCrxName, getExtPath } from '../../utils'

const crxName = getCrxName(__filename)

export default {
  input: getExtPath(crxName, 'manifest.json'),
  output: {
    dir: getExtPath(crxName),
    format: 'esm',
  },
  plugins: [
    chromeExtension({ verbose: false, browserPolyfill: true }),
    typescript(),
    resolve(),
    commonjs(),
  ],
}
