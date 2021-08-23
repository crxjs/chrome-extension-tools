/* eslint-disable @typescript-eslint/explicit-function-return-type */
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { basename } from 'path'
import { chromeExtension } from '../../../src/index'
import { getExtPath } from '../../utils'

const crxName = basename(__dirname)
const input = getExtPath(crxName, `manifest.json`)
const dir = getExtPath(crxName, `dist`)
export default {
  input: input,
  output: {
    dir: dir,
    format: 'esm',
    sourcemap: false,
  },
  plugins: [
    chromeExtension({ verbose: false }),
    typescript(),
    resolve(),
    commonjs(),
  ],
}
