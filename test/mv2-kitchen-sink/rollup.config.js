/* eslint-disable @typescript-eslint/explicit-function-return-type */
import commonjs from '@rollup/plugin-commonjs'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { chromeExtension } from '../../../src/index'

const input = path.join(__dirname, `manifest.json`)
const dir = path.join(__dirname, `dist`)
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
