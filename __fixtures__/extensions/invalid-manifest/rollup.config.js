/* eslint-disable @typescript-eslint/explicit-function-return-type */
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { chromeExtension } from '../../../src/index'
import { getExtPath } from '../../utils'

export default {
  input: getExtPath('invalid-manifest/manifest.json'),
  output: {
    dir: getExtPath('invalid-manifest-dist'),
    format: 'esm',
  },
  plugins: [
    chromeExtension({ verbose: false }),
    typescript(),
    resolve(),
    commonjs(),
  ],
}
