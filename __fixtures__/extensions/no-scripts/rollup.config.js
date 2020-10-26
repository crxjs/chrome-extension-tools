/* eslint-disable @typescript-eslint/explicit-function-return-type */
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import { chromeExtension } from '../../../src/index'
import { getExtPath } from '../../utils'

export default {
  input: getExtPath('no-scripts/manifest.json'),
  output: {
    dir: getExtPath('no-scripts-dist'),
    format: 'esm',
  },
  plugins: [
    chromeExtension({ verbose: false }),
    resolve(),
    commonjs(),
  ],
}
